# Odoo integration

**Pinned version:** Odoo Community **18.0** (`odoo:18.0` image, D-003). Mirror role only (D-004): Django is the source of truth.
**Status:** wrapper + compose + config written in Phase 0. Field names below are the *intended* mapping from Odoo 18 and
**must be confirmed with `fields_get` on the running instance** (rule 6) — the "Verified" column is filled in at the Phase 0 gate / Phase 4.
(Docker's engine did not start on the first dev laptop — D-030 — so nothing here is verified against a live instance yet.)

## Auth
XML-RPC. `common.authenticate(db, user, password, {})` → `uid`; then `object.execute_kw(db, uid, password, model, method, args, kwargs)`.
Default creds after `odoo-init`: db `odoo_sub`, user `admin`, password `admin` (change for any shared deployment; API keys work as the password).
`OdooClient` (`backend/integrations/odoo/client.py`): lazy uid, 10 s timeout, 2 retries with 0.5/1 s backoff on network errors only,
`OdooUnavailable` (network) vs `OdooValidationError` (Fault / bad creds → no retry).

## Bootstrap
```
docker compose run --rm odoo odoo -d odoo_sub -i base,contacts,account,sale_management --without-demo=all --stop-after-init
docker compose up -d odoo
docker compose exec web python scripts/odoo_bootstrap.py     # India/INR, l10n_in chart, sales journal check
docker compose exec web python scripts/odoo_smoke.py         # auth + search_read + create/delete partner
```
`odoo.conf`: `proxy_mode=True`, `dbfilter=^odoo_sub$`, `admin_passwd` is the DB-manager master password (not the user's).

## Mapping
| Local | Odoo model | Key fields (intended) | Verified |
|---|---|---|---|
| CustomerProfile | `res.partner` | `name`, `email`, `phone`, `street`, `company_type`; search by `email` before create → store `odoo_partner_id` | ☐ |
| Product | `product.product` | `name`, `list_price`←sales_price, `standard_price`←cost_price, `type`, `taxes_id`; variants stay local (text + price on the line) | ☐ |
| Tax | `account.tax` | `name`, `amount`, `amount_type='percent'`, `type_tax_use='sale'`; match by name+rate (l10n_in GST) else create | ☐ |
| Invoice | `account.move` | `move_type='out_invoice'`, `partner_id`, `invoice_date`, `invoice_date_due`, `ref`, `invoice_line_ids=[(0,0,{name,quantity,price_unit,tax_ids})]`; discount lines are negative `price_unit` | ☐ |
| Confirm | `account.move.action_post` | local Confirm → post; store `odoo_move_id`, Odoo `amount_total` | ☐ |
| Cancel *(stretch)* | `button_draft` → `button_cancel` | only if posted | ☐ |
| Payment *(stretch)* | `account.payment.register` wizard | `context={'active_model':'account.move','active_ids':[id]}` → create wizard with `amount`, `payment_date`, `journal_id` → `action_create_payments` | ☐ |

## Call sequences
- **Invoice draft (after billing commit):** ensure partner → ensure product + taxes → `account.move.create` → save `odoo_move_id`, status `synced`.
- **Confirm:** if no `odoo_move_id` do the draft first → `action_post` → read `amount_total`; if `|odoo − local| > 0.01` log a warning (D-012; local is authoritative).
- **ODOO_ENABLED=false:** every sync function returns immediately and sets `odoo_sync_status='skipped'`.

## Sync statuses and retry
`skipped` (disabled) · `pending` (Odoo unreachable or not yet synced) · `synced` · `error` (Odoo rejected; text in `odoo_error`).
`manage.py sync_odoo` retries every `pending`/`error` row, oldest first, partners → products/taxes → invoices → payments.
Sync always runs in `transaction.on_commit` and swallows exceptions into the status fields; a request never fails because of Odoo.

## Caveats
- Posting needs a chart of accounts and a sales journal (D-018). Fresh DBs default to a US company: set country India + currency INR **before** loading `l10n_in`.
- INR must be activated (`res.currency` `active=True`) before a company can use it.
- Odoo may recompute taxes/rounding differently (fiscal positions, tax-included prices) — compare totals, don't assume.
- Odoo's own invoice numbering (`INV/2026/00001`) differs from ours; we store it on the Odoo side only and show ours.
- A model/field rename between Odoo versions breaks mappers silently: re-run `fields_get` when the image tag changes.

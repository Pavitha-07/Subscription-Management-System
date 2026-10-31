# State machines

Every change goes through one service (`subscriptions.services.transition`, `billing.services.*`); views never set `status` directly.
Each successful subscription transition writes a `StatusLog` row. Illegal transition → HTTP 409 `{"detail": "...", "code": "illegal_transition"}`.

## Subscription
| From → To | Who | Guards | Side effects |
|---|---|---|---|
| draft → quotation | staff, admin | ≥ 1 line; every line qty ≥ plan.min_quantity; plan available on start_date | set `quotation_valid_until = today + template.validity_days` (default 30); `QUOTATION_READY` notification |
| quotation → confirmed | staff, admin | quotation not expired | set `next_invoice_date = start_date` |
| quotation → draft | staff, admin | — | clears validity |
| confirmed → active | system (`activate_due`) / staff, admin button | `start_date <= today` | `SUBSCRIPTION_ACTIVATED` notification |
| active → paused | staff, admin | `plan.allow_pause` | billing skips it |
| paused → active | staff, admin | — | `next_invoice_date = max(existing, today)` (D-014, no back-billing) |
| active → closed | staff, admin | early close needs `plan.allow_early_close`; engine auto-close needs `plan.auto_close` and nothing left to bill | stops billing |
| closed/active → renewed (stays active) | staff, admin | `plan.allow_renew` | `expiry_date += (original expiry − start)` |
| any non-closed → closed | admin | — (override) | logged |

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> quotation
  quotation --> draft
  quotation --> confirmed
  confirmed --> active
  active --> paused: plan.allow_pause
  paused --> active
  active --> closed: auto_close / early close
  paused --> closed
  closed --> [*]
```

## Invoice
| From → To | Who | Guards | Side effects |
|---|---|---|---|
| (engine) → draft | system | UNIQUE(subscription, period_start) | Odoo draft after commit |
| draft → confirmed | staff, admin | has ≥ 1 product line | assign `number`; post to Odoo (`action_post`); `INVOICE_READY` notification |
| confirmed → paid | system | `amount_due == 0` after a payment | same transaction as the payment |
| draft → cancelled | staff, admin | — | slot (subscription, period_start) stays used (D-019) |
| confirmed → cancelled | admin | `amount_paid == 0` | Odoo `button_draft` → `button_cancel` (stretch) |
| paid → * | — | forbidden | — |

```mermaid
stateDiagram-v2
  [*] --> draft: billing engine
  draft --> confirmed
  draft --> cancelled
  confirmed --> paid: payments >= total
  confirmed --> cancelled: no payments
  paid --> [*]
  cancelled --> [*]
```
Overdue is **not** a status: `confirmed` ∧ `amount_due > 0` ∧ `due_date < today` (D-013).

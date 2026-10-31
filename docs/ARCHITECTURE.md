# Architecture

```
 Browser (React SPA)
    │  same origin: session cookie + X-CSRFToken
    ▼
 ┌────────────────────────── web container (gunicorn) ──────────────────────────┐
 │  Django + DRF   /api/*      WhiteNoise: /assets/*   catch-all → index.html     │
 │  apps: accounts catalog subscriptions billing discounts payments               │
 │        notifications dashboard                                                 │
 │  services: transition() · billing.engine · notify() · odoo_sync                │
 └──────┬───────────────────────────────┬──────────────────────┬─────────────────┘
        │ ORM                           │ integrations/odoo     │ integrations/whatsapp
        ▼                               │ client.py (XML-RPC)   │ console | twilio | meta
   Postgres db_app                      ▼                       ▼
   (source of truth)                 Odoo 18 ──► Postgres db_odoo     Twilio / Meta API
                                     (ledger)
```
Dev: Vite :5173 proxies `/api` → Django :8000. Prod: one container, one URL (Cloudflare Tunnel/ngrok → :8000).

## Module responsibilities
| Module | Owns |
|---|---|
| `accounts` | User/role, CustomerProfile, auth endpoints, password rules, permission classes, `for_user()` scoping |
| `catalog` | Product, Variant, Tax, PaymentTerm, Plan; Odoo mirror of product/tax |
| `subscriptions` | QuotationTemplate, Subscription(+lines), `transition()` state machine, StatusLog, numbering |
| `billing` | Invoice(+lines), BillingRun, `engine.py` (pure `build_invoice` + atomic wrapper), confirm/cancel/send |
| `discounts` | Discount rules, redemptions, selection logic used by the engine |
| `payments` | Payment, denormalized `amount_paid/amount_due`, overdue rule |
| `notifications` | `notify()`, NotificationLog/Event, channels, reminders |
| `dashboard` | Read-only aggregate endpoints (KPIs, by-plan, by-month, overdue list) |
| `integrations/odoo` | `client.py` (only Odoo caller), `mappers.py` (local → Odoo vals), `sync.py` (create/post/retry) |

## Billing request flow
`POST /api/billing/run/` or `manage.py run_billing` → `BillingRun` row → `activate_due` → for each due subscription
`bill_subscription` (own transaction, row lock, UNIQUE guard) → invoice saved as **Draft** → `on_commit`: Odoo draft
(`pending` on failure) → run counters/log saved. One failing subscription never stops the run.

## Payment request flow
`POST /api/invoices/{id}/payments/` → one transaction: lock invoice → validate (Confirmed, 0 < amount ≤ `amount_due`) →
insert Payment → update `amount_paid/amount_due` → flip to `paid` if `amount_due == 0` → `on_commit`: `PAYMENT_RECEIVED`
notification, optional Odoo payment mirror (`skipped`/`error` never undoes the payment).

## Failure modes
| Failure | Behaviour |
|---|---|
| Odoo down/unconfigured | Local write succeeds; `odoo_sync_status` = `pending` (down) or `skipped` (disabled); `sync_odoo` retries |
| Odoo rejects (validation) | `error` + `odoo_error` text; local record stays valid; retry after fixing mapping |
| Email/WhatsApp provider fails | `NotificationLog.status=failed`, retried ≤ 3× with backoff; request never fails |
| Two billing runs overlap | Row lock `skip_locked` + UNIQUE(subscription, period_start) → no duplicates |
| Postgres down | `/api/healthz` returns 503; everything else fails fast |
| Laptop sleeps during demo | Disable sleep, keep tunnel up, keep a screen-recorded demo |

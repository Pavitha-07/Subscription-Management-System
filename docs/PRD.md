# PRD — Brightloop subscription management

Users: **Admin** (configures catalog, discounts, staff), **Staff** (quotes, subscriptions, billing, payments), **Customer** (sees own subscriptions/invoices).
Goal: sell recurring plans, bill them automatically and exactly once, collect payments, show finance a fast dashboard, mirror the ledger to Odoo.

## Scope tiers
| Tier | Items |
|---|---|
| **MVP** (never cut) | Auth + 3 roles + row-level access · product/variant/plan catalog · quotation → subscription lifecycle · billing engine (idempotent, tax, catch-up) · invoices confirm/cancel/send/print · discounts with limits · payments → Paid · dashboard KPIs · perf < 2 s |
| **Should** | Odoo mirror of partners/products/taxes/invoices · email + WhatsApp notifications with reminders · customer portal · quotation templates · pause/renew/early close |
| **Nice** | Odoo payment/cancel mirror · WhatsApp delivery webhooks · charts · CSV export · Odoo PDF · customer self-service pause/close/renew |

## Traceability
| Scene | Requirement | Endpoint(s) | Screen(s) | Phase | Test |
|---|---|---|---|---|---|
| S1 | Unique email (case-insens.), password ≥ 9 w/ upper+lower+special, reset by email, roles, only admin creates staff, customers see own data | `/auth/*`, `/staff/` | Login, Signup, Reset, Staff | 1, 8 | password table · dup email · reset token · staff 403 · cross-customer 404 |
| S2 | Product + variants (Brand Odoo +560) + plan with period, min qty, dates, flags | `/products/`, `/taxes/`, `/payment-terms/`, `/plans/` | Catalog CRUD | 2 | variant +560 · date validation · permissions · Odoo mock |
| S3 | Templates, subscription number/plan/dates/terms/lines/taxes, Draft→Quotation→Confirmed→Active→Closed | `/quotation-templates/`, `/subscriptions/`, `…/transition/` | Subscription list/form/detail | 3 | transitions · min qty · numbering · template prefill |
| S4 | Auto invoices with lines/taxes/totals; confirm/cancel/send/print; Draft→Confirmed→Paid; no double/skip | `/billing/run/`, `/invoices/*` | Run billing, Invoices, Print | 4 | 8 mandatory billing tests · worked example 8283.60 |
| S5 | Admin-only fixed/percent rules, min purchase/qty, dates, usage limit, per product or subscription, auto on next invoice | `/discounts/`, `…/discount/` | Discounts, subscription detail | 5 | limit 2 of 3 · scopes · race-safe counter · staff 403 |
| S6 | Payment method/amount/date/note; paid vs outstanding; overdue visible | `/invoices/{id}/payments/`, `/payments/` | Invoice modal, Payments | 6 | partial→full · overpay rejected · overdue rule |
| S7 | Dashboard: active subs, revenue, payments, overdue; filters; < 2 s with thousands of subs | `/dashboard/summary/` | Dashboard | 8 | hand-computed fixture · `perf_check` < 1.0 s |
| — | Invoice-ready / payment / reminder notifications (email + WhatsApp) | `/notifications/*` | Notifications admin, settings | 4, 7 | 8 tests in `NOTIFICATIONS.md` §9 |
| — | Odoo ledger mirror | (internal) `sync_odoo` | sync badges | 2, 4 | mocked success/failure → `pending` · live post |

## Non-functional
- Every page < 2 s with ~5k subscriptions, ~15k invoices: aggregates, indexes, pagination, no N+1; `perf_check` fails on > 1.0 s.
- App runs with Odoo and WhatsApp disabled. Money never as float. One-command demo (`make up migrate seed`) in < 10 min.

## Out of scope
Multi-currency, proration, dunning beyond reminders, payment gateways (payments are recorded manually), tax regimes beyond admin-managed rates, SSO.

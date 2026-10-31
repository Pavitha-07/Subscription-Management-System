# KICKOFF.md — Subscription Management System (Brightloop) · React + Django API + Odoo

> Put this file in the repo root. Then tell Claude Code:
> **"Read KICKOFF.md fully. Execute Phase 0 (create every md file in section 3, scaffold backend + frontend, get Odoo running), then continue phase by phase. Follow section 0 rules."**
> For each later phase: **"Execute Phase N from KICKOFF.md."**
>
> Budget: **6 hours total.** Phases are time-boxed. If one overruns, cut using section 9 instead of letting later phases starve.

---

## 0. Working rules for Claude Code (read first, obey always)

1. Work phase by phase. Do not start phase N+1 until phase N's acceptance checks pass. Run them and show the output.
2. **API first.** At the start of each phase, write the endpoints for that phase into `docs/API.md` (method, path, role, request, response). Then implement backend and frontend against that contract. This lets two people work in parallel (A = backend, B = frontend).
3. After each phase: tick `TASKS.md`, commit `phase N: <summary>`, print a 5-line status (done / broken / next).
4. Don't ask questions unless truly blocked. Pick the option in section 2, or decide and append to `docs/DECISIONS.md`.
5. Money is `Decimal` quantized to 2 places in the backend; the API sends money as **strings**, the frontend formats but never does money math except display sums of values the API gave it. Never `float`.
6. **Never guess Odoo model or field names.** Introspect with `fields_get`/`search_read` on the running instance and read the docs for the pinned version. All Odoo calls live in `integrations/odoo/client.py`.
7. The app must run with `ODOO_ENABLED=false` (`odoo_sync_status='skipped'`). Odoo is never a hard dependency of a request.
8. Authorization lives in the **queryset layer** (`get_queryset` uses `Model.objects.for_user(request.user)`), and role permissions live in DRF permission classes. Hiding buttons in React is cosmetic only. A customer must get 404 for another customer's object ids.
9. Every list endpoint is paginated (25/page), filterable, with `select_related`/`prefetch_related`; no N+1.
10. **Speed tools:** use DRF `ModelViewSet`s, and a config-driven frontend kit (`DataTable`, `ResourceForm`, `StatusBadge`, `ConfirmButton`, `RoleGuard`, `MoneyText`) so each new CRUD screen is a config object, not a new component. Do not hand-build 15 bespoke pages.
11. Honest scoping: record anything cut in `TASKS.md ## Cut`. A working end-to-end flow beats complete-but-broken modules.
12. Tests: backend `pytest-django` for the mandatory tests listed per phase. No frontend unit tests; instead keep a manual QA checklist in `docs/TEST_PLAN.md` and run it in Phase 9.

---

## 1. What is being judged

| # | PS scene | Must be demonstrable |
|---|---|---|
| S1 | Sign-up | Unique email, password > 8 chars with upper + lower + special, reset link by email, roles Admin/Staff/Customer, only Admin creates staff, customers see only own data |
| S2 | New plan | Product (name, type, sales price, cost price, notes) + variants (brand Odoo = +560); Plan (price, period daily/weekly/monthly/yearly, min qty, availability dates, per-plan flags: auto-close, early close, pause, renew) |
| S3 | Quote → subscription | Quotation templates (plan + lines, validity days); subscription (number, customer, plan, start, expiry, payment terms, lines qty/unit price/taxes/amount); Draft → Quotation → Confirmed → Active → Closed |
| S4 | Billing day | Invoices auto-generated with customer, lines, taxes, totals; confirm/cancel/send/print; Draft → Confirmed → Paid; **nothing billed twice or skipped** |
| S5 | Discounts | Admin-only rules: fixed/percent, min purchase or qty, dates, usage limit; per product or whole subscription; auto-appears on next invoice; stops at expiry/limit |
| S6 | Payments | Record method, amount, date, note against an invoice; paid vs outstanding; overdue visible |
| S7 | Finance view | Dashboard: active subs, revenue, payments, overdue; filters, summary; **every page < 2 s with thousands of subscriptions** |

Likely test focus: billing idempotency, row-level access, discount auto-apply + limits, the 2-second rule, a clean demo of each scene.

---

## 2. Locked decisions and assumptions (seed `docs/DECISIONS.md` with these)

| ID | Decision |
|---|---|
| D-001 | Plan.price = recurring price per unit per period of the plan's primary product. A new subscription from a plan auto-adds a first line for that product at `plan.price + variant.extra_price`. Add-on lines use `product.sales_price + variant.extra_price`. |
| D-002 | Backend: Python 3.12, Django 5, Django REST Framework, django-filter, PostgreSQL 15, pytest-django. **Frontend: React 18 + TypeScript + Vite, React Router, TanStack Query, Tailwind, react-hook-form.** Recharts only if time allows. |
| D-003 | Odoo Community **18.0** in Docker, external API (XML-RPC) through one wrapper. If the hackathon names another version, change the image tag and re-verify the wrapper. |
| D-004 | Django DB is the source of truth for subscriptions, plans, discounts, payments, dashboard. Odoo is the accounting ledger and receives mirrored partners, products, taxes, invoices (and payments if time allows). |
| D-005 | Auth: **Django session cookie + CSRF**, same origin. Production: Django serves the built React app (WhiteNoise + catch-all `index.html`) so there is **one container and one tunnel URL**. Dev: Vite proxies `/api` to Django. User model has `role` (`admin/staff/customer`). |
| D-006 | Password rule: length ≥ 9 with uppercase, lowercase, special char (validator on signup, reset, staff creation). Email unique case-insensitively. Public signup creates only `customer`. |
| D-007 | Reset email links to `SITE_URL/reset-password/<uid>/<token>` (React route) which calls the API; email backend is console by default, SMTP via env. |
| D-008 | Billing via `run_billing` management command and a "Run billing" button (admin/staff). No Celery. |
| D-009 | Billing creates **Draft** invoices. Confirm posts to Odoo. Paid when payments ≥ total. |
| D-010 | Discount stacking: ≤ 1 discount per line (largest saving wins) plus ≤ 1 subscription-level discount per invoice; usage count +1 per invoice application; shown as its own negative line. |
| D-011 | Product-scoped rules auto-apply to matching lines meeting conditions. Subscription-scoped rules apply only when attached to the subscription (staff or admin attach; only admin creates rules). |
| D-012 | Tax: admin-managed `Tax` rows attached to products; local calc authoritative; lines go to Odoo with `tax_ids`; Odoo total stored; mismatch > 0.01 logged. |
| D-013 | Overdue = Confirmed, `amount_due > 0`, `due_date < today`. Due date = invoice date + payment term days. |
| D-014 | Pause = no billing; resume has no back-billing (`next_invoice_date = max(existing, today)`). Renew extends expiry by (original expiry − start). |
| D-015 | Catch-up: generate each missed period (cap 12 per sub per run), never beyond `expiry_date`. |
| D-016 | "Print" = React print view with print CSS (`/invoices/:id/print`, browser Save as PDF). "Send" = Django email. Odoo PDF is stretch. |
| D-017 | MRR = Σ active subscription line totals normalized to monthly (daily×30, weekly×52/12, monthly×1, yearly÷12); ARR = MRR×12. |
| D-018 | Single currency INR. Odoo needs a chart of accounts to post invoices: install `l10n_in` (or generic CoA) and verify. |
| D-019 | Overpayment rejected. Cancelled invoices keep their (subscription, period_start) slot; only an admin "re-open period" action may re-bill it (stretch). |
| D-020 | Notifications: one `notify()` service with channels email + WhatsApp, logged in `NotificationLog`, spec in `docs/NOTIFICATIONS.md`. Sending never blocks or fails the originating request. |
| D-021 | WhatsApp provider is pluggable (`console` default, `twilio` sandbox for the demo, `meta` optional). The app must run fully with `console`. |
| D-022 | WhatsApp is sent only to customers with an explicit opt-in and a valid E.164 number (default +91 for 10-digit input). Password-reset links are email-only. |
| D-023 | De-duplication via UNIQUE `dedupe_key` (event + object + channel + variant) so reruns of billing/reminders never double-notify. Manual "Send" uses `force=True`. |
| D-024 | Reminders: due-soon at 3 days before due, overdue at day 1 and day 7, expiring at 7 days before expiry; run via `run_notifications` (called by `run_billing`, a button, or cron). |
| D-025 | Sandbox/test WhatsApp accounts reach only pre-registered numbers and free-form text works only inside the 24 h window; production needs a verified business account and approved templates. Say so in the pitch. |

---

## 3. Markdown files to create in Phase 0 (real content, no placeholders)

| File | Contents |
|---|---|
| `CLAUDE.md` | Project memory (≤ 120 lines): purpose, stack, folder map, exact commands (run backend/frontend, test, migrate, seed, billing, perf), conventions (Decimal-as-string, queryset scoping, no N+1, config-driven UI), section 0 rules condensed, how to log a decision. |
| `README.md` | What it is, quick start, demo logins (admin/staff/customer), URLs, Odoo URL + creds, how to run billing/tests, known limitations. |
| `TASKS.md` | Checklist per phase (each acceptance check a checkbox), plus `## Cut` and `## Bugs`. |
| `docs/PRD.md` | Scope tiers (MVP/Should/Nice) and S1–S7 traceability: scene → requirement → endpoint → screen → phase → test. |
| `docs/ARCHITECTURE.md` | ASCII diagram (browser → Django/DRF → Postgres; Django → odoo_client → Odoo → Odoo Postgres), module responsibilities, billing and payment request flows, failure modes. |
| `docs/DATA_MODEL.md` | Tables, fields, constraints, indexes (start from section 5), Mermaid ER diagram. |
| `docs/STATE_MACHINES.md` | Subscription and Invoice: from → to, who, guards, side effects; Mermaid `stateDiagram-v2`. |
| `docs/BILLING_ENGINE.md` | Section 6 algorithm, pseudo-code, transaction boundaries, idempotency keys, catch-up, worked example. |
| `docs/ODOO_INTEGRATION.md` | Pinned version, auth, mapping table (verified with `fields_get`), call sequences, retry, sync statuses, caveats. |
| `docs/RBAC.md` | Role × capability matrix, queryset scoping rules, protected endpoints and screens. |
| `docs/API.md` | Every endpoint (grown each phase). |
| `docs/FRONTEND.md` | Route map (path, role, page), shared component kit and its props, API client + CSRF handling, query-key conventions. |
| `docs/TEST_PLAN.md` | Backend tests by phase, perf method, manual QA checklist. |
| `docs/DEMO_SCRIPT.md` | Click-by-click demo of S1–S7 with exact data and expected results. |
| `docs/NOTIFICATIONS.md` | Provided with this plan: notification architecture, provider decision, event catalog, API, tests, demo checklist. Keep it in sync as you build. |
| `docs/DECISIONS.md` | Log seeded with D-001…D-025. |
| `.env.example` | All env vars. |

---

## 4. Repo layout and environment

```
.
├── CLAUDE.md README.md TASKS.md KICKOFF.md .env.example Makefile
├── docker-compose.yml  Dockerfile (multi-stage: node build → python runtime)
├── docs/…
├── odoo/config/odoo.conf   odoo/addons/
├── backend/
│   ├── manage.py  config/ (settings, urls)
│   ├── apps/ accounts catalog subscriptions billing discounts payments notifications dashboard
│   ├── integrations/odoo/ client.py mappers.py sync.py
│   ├── integrations/whatsapp/ base.py console.py twilio.py meta.py
│   ├── scripts/ seed_demo.py perf_check.py
│   └── tests/
└── frontend/
    ├── vite.config.ts (proxy /api)  tailwind config
    └── src/
        ├── api/ (client.ts with CSRF, hooks per resource)
        ├── components/ (DataTable, ResourceForm, StatusBadge, MoneyText, ConfirmButton, RoleGuard, Layout)
        ├── pages/ (auth, dashboard, catalog, subscriptions, invoices, payments, discounts, staff, portal)
        └── routes.tsx
```

**Compose services:** `web` (Django + built SPA, port 8000), `db_app` (postgres:15), `odoo` (odoo:18.0, port 8069, mounts `./odoo/config`, `./odoo/addons`), `db_odoo` (postgres:15). Named volumes; `restart: unless-stopped`. Separate `frontend` dev server (`npm run dev`, port 5173) only for local development.

**Env vars:** `DJANGO_SECRET_KEY, DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, DATABASE_URL, SITE_URL, ODOO_ENABLED, ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD|ODOO_API_KEY, EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL, WHATSAPP_PROVIDER (console|twilio|meta), TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, META_WA_PHONE_NUMBER_ID, META_WA_ACCESS_TOKEN, META_WA_API_VERSION, NOTIFY_DUE_SOON_DAYS=3, NOTIFY_OVERDUE_DAYS=1,7, NOTIFY_EXPIRING_DAYS=7`.

**Makefile:** `up, down, logs, migrate, seed, seed-big, test, billing, notify, perf, odoo-init, frontend-dev, build`.

---

## 5. Data model (refine in `docs/DATA_MODEL.md`)

**accounts.User**: email (unique, case-insensitive via `Lower` constraint), name, role, is_active, created_at. **CustomerProfile**: user 1–1, company_name, phone, address, `odoo_partner_id`, `odoo_sync_status`, `whatsapp_number` (E.164), `whatsapp_opt_in`, `whatsapp_opted_in_at`, `email_notifications`.

**catalog.Product**: name, type (`service|software|addon|physical`), sales_price, cost_price, notes, is_active, `odoo_product_id`, `odoo_sync_status`; M2M `taxes`. **Variant**: product, attribute, value, extra_price; unique (product, attribute, value). **Tax**: name, rate %, is_active, `odoo_tax_id`. **PaymentTerm**: name, days, is_default. **Plan**: name, product (primary), price, billing_period, min_quantity, available_from/to, flags `auto_close, allow_early_close, allow_pause, allow_renew`, is_active.

**subscriptions.QuotationTemplate**: name, plan, validity_days, is_active; **…Line**: template, product, variant null, quantity. **Subscription**: number (unique `SUB-000001`, counter table), customer, plan, template null, status (`draft|quotation|confirmed|active|paused|closed`), start_date, expiry_date, payment_term, next_invoice_date, quotation_valid_until, discount null, notes, created_by, created_at; indexes (status), (customer), (status, next_invoice_date). **SubscriptionLine**: subscription, product, variant null, description, quantity, unit_price, amount, M2M taxes. **StatusLog**: subscription, from, to, by_user, at.

**billing.Invoice**: number (unique, assigned at confirm), subscription, customer, status (`draft|confirmed|paid|cancelled`), invoice_date, due_date, period_start, period_end, subtotal, discount_total, tax_total, total, amount_paid, amount_due, `odoo_move_id`, `odoo_sync_status` (`skipped|pending|synced|error`), `odoo_error`, sent_at, created_at. **UNIQUE (subscription, period_start)**. Indexes (status, due_date), (customer), (invoice_date). **InvoiceLine**: invoice, kind (`product|discount`), product null, description, quantity, unit_price, tax_rate_snapshot, line_subtotal, line_tax, line_total. **BillingRun**: started_at, finished_at, triggered_by, as_of_date, created_count, skipped_count, error_count, log.

**discounts.Discount**: name, code, type (`fixed|percent`), value, scope (`product|subscription`), M2M products, min_purchase_amount, min_quantity, start_date, end_date, usage_limit null, used_count, is_active, created_by. **DiscountRedemption**: discount, invoice, amount; UNIQUE (discount, invoice).

**payments.Payment**: invoice, amount, method (`cash|bank_transfer|upi|card|cheque|other`), payment_date, note, recorded_by, `odoo_payment_id`, `odoo_sync_status`, created_at; indexes (invoice), (payment_date).

**notifications.NotificationEvent**: code, label, enabled_email, enabled_whatsapp, template_body, meta_template_name. **NotificationLog**: event, channel, provider, recipient_user, recipient_address, object_type, object_id, body, status (`queued|sent|delivered|read|failed|skipped`), skip_reason, provider_message_id, error, attempts, next_attempt_at, **UNIQUE dedupe_key**, created_at, sent_at. Full detail in `docs/NOTIFICATIONS.md`.

---

## 6. Billing engine (the most likely thing to be tested)

```
run_billing(as_of=today, triggered_by):
  run = BillingRun.create(...)
  activate_due(as_of)   # confirmed subs whose start_date <= as_of -> active
  ids = Subscription.filter(status=active, next_invoice_date <= as_of).order_by(next_invoice_date).ids
  for id in ids:
     try: bill_subscription(id, as_of, run)
     except Exception: run.error_count++ ; log ; continue     # one bad sub never blocks others

bill_subscription(id, as_of):
  repeat up to 12 times:
    with transaction.atomic():
      sub = Subscription.select_for_update(skip_locked=True).get(id)
      if sub.status != active or sub.next_invoice_date > as_of: return
      if sub.expiry_date and sub.next_invoice_date > sub.expiry_date: close_if_auto(sub); return
      start = sub.next_invoice_date; end = add_period(start, plan.billing_period) - 1 day
      if Invoice.exists(subscription=sub, period_start=start): advance cursor; continue
      invoice = build_invoice(sub, start, end); invoice.save()      # UNIQUE is the last safety net
      sub.next_invoice_date = end + 1 day; sub.save()
    after commit: odoo_sync.create_draft_invoice(invoice)           # failure -> 'pending'; never rolls back local
```

**`build_invoice` order:** (1) snapshot lines; (2) line-level product discounts, largest saving, negative line; percent on line subtotal, fixed capped at line subtotal; (3) subscription-level discount on subtotal after step 2; (4) tax on post-discount amounts (discount lines carry the tax rate of the line they reduce); (5) totals, `amount_due = total`; (6) redemption via `UPDATE … SET used_count = used_count + 1 WHERE id=%s AND (usage_limit IS NULL OR used_count < usage_limit)`; 0 rows → discount skipped for this invoice; then insert `DiscountRedemption`.

**Side effects:** `confirmed → active` on/after start_date (button + `activate_due`); auto-close when `plan.auto_close` and expiry passed and nothing left to bill; pause/early-close/renew gated by the plan flags.

**Worked example (use as a test):** plan 1000/month, qty 5, variant +560 → unit 1560, subtotal 7800; 10 % product discount −780 → 7020; 18 % tax = 1263.60; **total 8283.60**.

---

## 7. Odoo integration

**Auth:** XML-RPC `common.authenticate` → `uid`; `object.execute_kw`. `OdooClient`: connection reuse, 10 s timeout, 2 retries with backoff, exceptions `OdooUnavailable`, `OdooValidationError`.

| Local | Odoo | Notes |
|---|---|---|
| CustomerProfile | `res.partner` | search by email before create; store id |
| Product | `product.product` | variant text + price go in the invoice line, not as Odoo variants |
| Tax | `account.tax` | match by name/rate (l10n_in GST) or create |
| Invoice | `account.move` (`out_invoice`) | `invoice_line_ids` as `(0,0,{name, quantity, price_unit, tax_ids})`; discounts as negative lines |
| Confirm | `action_post` | on local Confirm |
| Cancel | `button_draft` → `button_cancel` | only if posted; stretch |
| Payment | `account.payment.register` wizard (context `active_model='account.move'`, `active_ids=[id]`) → `action_create_payments` | fiddliest call; stretch, failure → `error`, local payment stays valid |

Sync statuses: `skipped | pending | synced | error`. `sync_odoo` command retries `pending/error`.

**Phase 0 gate:** from the `web` container authenticate, `search_read` one partner, create + delete a test partner.
**Odoo bootstrap (verify flags):** `docker compose run --rm odoo odoo -d odoo_sub -i base,contacts,account,sale_management,l10n_in --without-demo=all --stop-after-init`, then set company country/currency to India/INR and confirm a sales journal exists.

---

## 8. Phases (6 hours)

Each phase: **API contract → backend → frontend → tests → acceptance.** Suggested split: person A backend, person B frontend, third person on Odoo/seed/docs.

### Phase 0 — Bootstrap (0:00 – 0:30)
- Create all md files (section 3) with real content.
- Django + DRF project and apps; Vite React TS app with Tailwind, Router, TanStack Query; `api/client.ts` with CSRF + `credentials: 'include'`; Vite proxy.
- Multi-stage Dockerfile, compose, Makefile, `.env.example`, `odoo.conf` (`proxy_mode=True`, `admin_passwd`).
- Start stack, init Odoo DB, run the Odoo smoke test. `/api/healthz` reports app DB + Odoo status; React landing page calls it.
**Acceptance:** `make up` works; healthz OK for both; the React page renders status; first commit.
**Fallback:** Odoo not up after 25 min → `ODOO_ENABLED=false`, log in `TASKS.md ## Cut`, continue; retry in Phase 4.

### Phase 1 — Auth, roles, shell (0:30 – 1:15) [S1]
- API: `csrf`, `signup`, `login`, `logout`, `me`, `password-reset/request`, `password-reset/confirm`, `staff` (admin-only create/list). Validators per D-006. Permission classes `IsAdmin`, `IsStaffOrAdmin`, `IsCustomer`; `for_user()` base manager.
- React: Login, Signup, Forgot/Reset (token route), `AuthProvider` (calls `me`), `RoleGuard`, `Layout` with role-aware nav, Staff management page (admin), the shared component kit skeleton.
- Seed `admin@demo`, `staff@demo`, `customer@demo`.
- Signup and profile include an optional `whatsapp_number` (E.164 validated) and an explicit opt-in checkbox; the full notification settings UI lands in Phase 7.
**Tests:** password-rule table (valid + 6 invalid incl. exactly 8 chars), duplicate email different case, reset token works, staff creation forbidden to staff/customer, role access matrix.
**Acceptance:** each role logs in and sees different navigation; reset email appears in the console.

### Phase 2 — Catalog and plans (1:15 – 1:55) [S2]
- API: ModelViewSets for Product (nested variants), Tax, PaymentTerm, Plan; writes admin-only, reads staff+admin. Validation: availability dates, `min_quantity ≥ 1`, variant uniqueness. `effective_unit_price`.
- React: config-driven CRUD pages for Products (with variant sub-form), Taxes, Payment terms, Plans.
- Odoo mirror for Tax and Product, status badge, failures never block saves.
**Tests:** variant +560, plan date validation, permissions, Odoo mocked: success and failure → `pending`.
**Acceptance:** admin creates the product with the Brand variant and a monthly plan.

### Phase 3 — Templates and subscriptions (1:55 – 2:45) [S3]
- API: QuotationTemplate (+lines); Subscription (+lines) with `POST /subscriptions/{id}/transition/` driven by one `transition()` service (permissions, guards, `StatusLog`); `from-template` prefill; auto-number; min-quantity and plan-availability checks.
- React: subscription list (filters: status, customer, plan, number search), create/edit form with editable lines and live line totals (display only), detail page with status timeline and action buttons that only show legal transitions (server still enforces), template CRUD (config-driven).
**Tests:** legal/illegal transitions, min-quantity, concurrent numbering, template prefill.
**Acceptance:** staff builds a subscription from a template and walks Draft → Quotation → Confirmed → Active.

### Phase 4 — Billing engine and invoices (2:45 – 3:50) [S4] — the core, protect this time slot
- Implement section 6 in `apps/billing/engine.py` (pure build function + transaction wrapper), `run_billing` command, `POST /billing/run/`, BillingRun list.
- Invoice API: list/detail, `confirm` (assigns number, posts to Odoo), `cancel`, `send` (email), plus `print` data. State machine per `STATE_MACHINES.md`.
- Odoo: create draft after commit, `action_post` on confirm; `sync_odoo` retry command.
- **Notification skeleton** (per `docs/NOTIFICATIONS.md`): create the `notifications` app with `NotificationLog`, `notify()`, the email and console channels, dedupe, and `transaction.on_commit` dispatch. Invoice Confirm triggers `INVOICE_READY`; the invoice `send` endpoint uses it. WhatsApp providers come in Phase 7.
- React: invoices list (filters: status, customer, overdue), detail with lines/totals/sync badge, action buttons, print view with print CSS, "Run billing" page showing the run result.
**Mandatory tests:** (1) run twice → no new invoices; (2) concurrent runs → no duplicates; (3) catch-up creates each missed period; (4) nothing beyond expiry, auto-close only with the flag; (5) paused/draft/closed skipped; (6) worked example = 8283.60; (7) one failing sub doesn't stop the run; (8) Odoo down → local invoice with `pending`.
**Acceptance:** 20 due subs → 20 correct drafts; rerun → 0; one confirmed invoice visible in Odoo.

### Phase 5 — Discounts (3:50 – 4:10) [S5]
- API: Discount CRUD (admin only), attach/detach on subscription (staff+admin), redemptions list. Validation: percent 0–100, fixed > 0, `start ≤ end`.
- React: Discounts page (admin), attach control on subscription detail, discount lines visible on invoice and print view.
**Tests:** percent/fixed, min qty/min purchase unmet, before start/after end, limit 2 with 3 eligible invoices → exactly 2, scope product vs subscription, race-safe counter, staff cannot create (403).
**Acceptance:** 10 % rule with limit 2 shows on the next two invoices, not the third.

### Phase 6 — Payments (4:10 – 4:30) [S6]
- API: `POST /invoices/{id}/payments/` (amount > 0, ≤ `amount_due`, invoice Confirmed); update `amount_paid/amount_due` and flip to `paid` in the same transaction; payments list with filters. Odoo payment mirror only if time allows (else `skipped`).
- React: record-payment modal on invoice detail, payments page, invoice filter chips Paid / Outstanding / Overdue with days-overdue highlight.
**Tests:** partial then full → Paid exactly at the sum, overpayment rejected, payment on draft/cancelled rejected, overdue rule (D-013), denormalized totals match recomputation.
**Acceptance:** partial payments show the balance; final payment flips to Paid.

### Phase 7 — Notifications: WhatsApp + reminders (4:30 – 5:05)
Follow `docs/NOTIFICATIONS.md`. Build in this order and stop when time is up:
1. Provider adapters: `console` (done first, always works), then `twilio` (sandbox). `meta` only if ahead.
2. Event catalog seeded in `NotificationEvent`; wire `WELCOME`, `QUOTATION_READY`, `SUBSCRIPTION_ACTIVATED`, `INVOICE_READY`, `PAYMENT_RECEIVED`.
3. `run_notifications` command (due-soon, overdue day 1/7, expiring) and an admin "Run reminders" button; call it at the end of `run_billing`.
4. Retry command `send_notifications` (max 3 attempts with backoff).
5. API: notification log list, retry, `me/notification-settings`, event toggles, admin test-send, invoice `send` with channels.
6. React: signup consent checkbox (already in Phase 1), portal notification settings, admin Notifications page (log, retry, toggles, test send, provider status banner), "Send via email/WhatsApp" buttons and a small timeline on invoice and subscription detail.
**Mandatory tests:** the eight listed in `docs/NOTIFICATIONS.md` §9.
**Acceptance:** with `WHATSAPP_PROVIDER=twilio` and a joined demo phone, confirming an invoice and recording a payment each deliver a WhatsApp message; rerunning billing and reminders sends no duplicates; with `console` the same flow shows `sent` rows in the log.

### Phase 8 — Portal, dashboard, performance (5:05 – 5:35) [S1/S7]
- **Portal** (customer role): "My subscriptions", "My invoices", detail and print; read-only (self-service pause/close/renew is stretch).
- **Dashboard** (staff+admin): `GET /dashboard/summary/?from&to&customer&plan&status` returning KPIs (active subs, MRR, ARR, revenue collected, outstanding, overdue count/amount), by-plan and by-month summaries, and a paginated overdue list. All from aggregate queries. React: KPI cards, filter bar, summary tables, overdue table (Recharts bar only if time allows).
- `seed_demo.py --big`: ~5k subscriptions, ~15k invoices, ~10k payments via `bulk_create`, realistic status/overdue mix. `perf_check.py`: hits every list endpoint and the dashboard as admin, prints time + query count, **fails if any call > 1.0 s** (backend budget; leaves room for the browser under 2 s). Add indexes and fix N+1s until green.
**Tests:** customer A gets 404 for customer B's subscription/invoice/payment; dashboard numbers equal hand-computed values on a small fixture.
**Acceptance:** `perf_check` green on the big seed; portal isolation tests pass; dashboard loads in the browser in < 2 s.

### Phase 9 — Hardening, demo, deploy (5:35 – 6:00)
- Fill README + `DEMO_SCRIPT.md`; finalize `TASKS.md` honestly (done / cut / bugs).
- Error toasts, form error display, empty and loading states, 404/403 pages.
- `make build` → single container serving the SPA; `DEBUG=false`, secure cookies, `CSRF_TRUSTED_ORIGINS` and `SITE_URL` set for the tunnel URL.
- Rehearse the demo on a fresh DB (reset → seed → S1…S7 + a WhatsApp notification; have each demo phone re-join the Twilio sandbox first). Run the manual QA checklist.
- Expose with Cloudflare Tunnel/ngrok; test from a phone on mobile data; put demo logins in README; tag `v1.0` and freeze `main`.
**Acceptance:** fresh clone + `make up migrate seed` gives a working demo in < 10 min; demo script runs clean.

---

## 9. Cut-line (cut from the top of this list first)

1. WhatsApp delivery-status webhook and inbound STOP handling, editable templates, `meta` provider, `BILLING_RUN_SUMMARY` (keep `console` + `twilio`); then Odoo PDF, charts, CSV export, sync admin page.
2. Odoo payment mirroring and Odoo cancel mirroring.
3. Customer self-service pause/close/renew in the portal.
4. Staff attach-discount UI (keep admin-only attach).
5. Quotation template polish (keep create + prefill).
6. Odoo invoice posting (keep create-draft only), then Odoo mirroring entirely (`ODOO_ENABLED=false`, demo mirrored partners/products).

**Never cut:** auth + roles, billing idempotency, invoice generation with tax, payments → Paid, discount auto-apply with limits, dashboard KPIs, row-level access, the performance check.

## 10. Risks

| Risk | Fallback |
|---|---|
| Odoo won't init / posting fails (no chart of accounts) | `ODOO_ENABLED=false`; show mirrored partners/products; log in `TASKS.md` |
| Odoo API differs by version | Single `client.py`; pinned `odoo:18.0`; `fields_get` before coding |
| Payment wizard fails over XML-RPC | Mark `error`, keep local truth, cut per section 9 |
| React UI eats the schedule | Config-driven kit (rule 10); stop polishing; use plain tables |
| Dashboard slow | Aggregates, indexes, denormalized `amount_due`, pagination, `perf_check` gate |
| Laptop sleeps during judging | Disable sleep, plugged in, tunnel tested, screen-recorded demo as backup |
| WhatsApp sandbox session lapsed or number not joined | Re-join right before judging; admin test-send to verify; fall back to `console` and show the log screen |
| Notification storm or duplicates on reruns | UNIQUE `dedupe_key`, tests 2 and 5 in `NOTIFICATIONS.md` §9 |

## 11. Definition of done

- S1–S7 all demonstrable via `DEMO_SCRIPT.md` on seeded data.
- Mandatory backend tests pass; `perf_check` green on the big seed.
- Re-running billing never changes the invoice count.
- A customer cannot reach another customer's data by any URL or API call.
- README lets a stranger run it in < 10 minutes; demo logins listed.
- Invoice-ready, payment-received and overdue notifications fire (WhatsApp or console-logged) with no duplicates on rerun.
- `TASKS.md` lists what was cut and known bugs, honestly.

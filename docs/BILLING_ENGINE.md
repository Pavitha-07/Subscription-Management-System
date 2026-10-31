# Billing engine

Code: `backend/apps/billing/engine.py` (pure `build_invoice` + transaction wrapper). Entry points: `manage.py run_billing [--as-of YYYY-MM-DD]`,
`POST /api/billing/run/`. Never bills twice, never skips a period.

## Algorithm
```
run_billing(as_of=today, triggered_by):
  run = BillingRun.create(as_of_date=as_of, ...)
  activate_due(as_of)                       # confirmed & start_date <= as_of -> active
  ids = Subscription.filter(status=active, next_invoice_date <= as_of).order_by(next_invoice_date).values_list(id)
  for id in ids:
     try: bill_subscription(id, as_of, run)
     except Exception: run.error_count += 1; run.log += trace; continue     # isolation per subscription
  run.finished_at = now; run.save()
  run_notifications()                       # reminders, deduped

bill_subscription(id, as_of, run):
  repeat up to 12 times:                    # D-015 catch-up cap per run
    with transaction.atomic():
      sub = Subscription.select_for_update(skip_locked=True).filter(id=id).first()
      if sub is None: return                # another worker holds it
      if sub.status != active or sub.next_invoice_date > as_of: return
      if sub.expiry_date and sub.next_invoice_date > sub.expiry_date:
          close_if_auto(sub); return        # nothing left to bill
      start = sub.next_invoice_date
      end   = add_period(start, plan.billing_period) - 1 day
      if Invoice.exists(subscription=sub, period_start=start):
          sub.next_invoice_date = end + 1 day; sub.save(); run.skipped_count += 1; continue
      invoice = build_invoice(sub, start, end)      # inserts invoice + lines + redemptions
      sub.next_invoice_date = end + 1 day; sub.save(); run.created_count += 1
    transaction.on_commit(odoo_sync.create_draft_invoice(invoice))   # failure -> 'pending'
```
`add_period`: daily +1 d, weekly +7 d, monthly `relativedelta(months=1)` (anchored to the original start day to avoid drift: 31 Jan → 28/29 Feb → 31 Mar),
yearly +1 y. The last period is never truncated; billing stops when `next_invoice_date > expiry_date`.

## Idempotency keys (belt and braces)
1. `UNIQUE(subscription, period_start)` on Invoice — last safety net, even across crashes/concurrent runs.
2. `next_invoice_date` cursor advanced in the **same transaction** as the invoice insert.
3. `select_for_update(skip_locked=True)` — concurrent runs skip locked rows instead of waiting/duplicating.
4. Pre-check `Invoice.exists` repairs a cursor that is behind (skip, advance, count as skipped).
5. Notification `dedupe_key` — reruns never re-notify.

## build_invoice order
1. Snapshot each subscription line → `InvoiceLine(kind=product)` (qty, unit_price, tax rate snapshot).
2. Line-level product discounts: eligible active rules (scope=product, dates, min qty, min purchase, `used_count < limit`);
   pick largest saving; percent on line subtotal, fixed capped at line subtotal; emit a negative `discount` line (D-010).
3. Subscription-level discount (attached rule) on the subtotal after step 2.
4. Tax on post-discount amounts; a discount line carries the tax rate of the line it reduces.
5. Totals; `amount_paid=0`, `amount_due=total`; due_date = invoice_date + payment_term.days.
6. Redemption: `UPDATE discounts_discount SET used_count = used_count + 1 WHERE id=%s AND (usage_limit IS NULL OR used_count < usage_limit)`.
   0 rows updated → drop that discount from this invoice and recompute; else insert `DiscountRedemption`.

All money math uses `Decimal`, quantized with `ROUND_HALF_UP` at line level; totals are sums of rounded line values.

## Worked example (use as test 6)
Plan 1000/month, qty 5, variant +560 → unit 1560.00, line subtotal 7800.00.
10 % product discount → −780.00 → 7020.00. 18 % tax on 7020.00 = 1263.60. **Total 8283.60.**

## Catch-up example
Monthly sub, start 2026-01-01, `next_invoice_date` 2026-01-01, run on 2026-04-15 → invoices for Jan, Feb, Mar, Apr (4 periods),
cursor ends at 2026-05-01. Second run the same day → 0 created. Expiry 2026-03-31 → only Jan–Mar; then `auto_close` closes it if the flag is set.

## Odoo
After commit only; never inside the billing transaction. Confirm (separate action) posts it. Details: `ODOO_INTEGRATION.md`.

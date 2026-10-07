# Liyu POS Pre-Production Checklist

Use a dedicated staging Supabase project, two test businesses and disposable test users. Keep screenshots, request IDs, migration versions and ledger queries as release evidence. Redact phone numbers, tokens, chat IDs and customer data.

## 1. Local static checks

Run these from repository root and record exact output/exit status:

```powershell
npx tsc --noEmit
npm test
npm run lint
npm run build
```

For lint review of a patch, also run ESLint against every changed TypeScript/TSX file and report unrelated existing lint findings separately. A successful TypeScript or build run does not prove DB/RLS correctness.

## 2. Migration and environment verification

- [ ] Compare target migration history against all checked-in migrations; apply only missing ones in lexical order.
- [ ] Apply and verify `20261007065456_explicit_preparation_stations.sql` before using the new category/product fields.
- [ ] Verify required functions, triggers, grants, constraints, indexes and `supabase_realtime` publication membership.
- [ ] Confirm RLS is enabled for public operational tables and inspect policies using SQL/editor; test policies with authenticated test roles, not service-role credentials.
- [ ] Confirm server-only environment variables exist in staging deployment and are absent from `NEXT_PUBLIC_*`, frontend bundle, logs and API responses.
- [ ] Test Telegram delivery with a staging bot/recipient; failure must not undo a successful shift close.

## 3. Account and business fixtures

- [ ] Business A: one branch; owner, manager, cashier, waiter, kitchen, barman, inventory clerk, and two combined-role users.
- [ ] Business B: distinct owner/branch/staff/products/tables/folios to probe tenant isolation.
- [ ] Create active food category (Kitchen), drink category (Bar), explicit product override and a no-ticket item.
- [ ] Create tracked products, opening stock, two FIFO receipt costs, tables, an active room folio, and a supplier if procurement is being tested.

## 4. Price, sales and payment correctness

- [ ] Price proof accepts the exact product/business/branch/price and rejects a modified price or foreign tenant.
- [ ] Offline cached signed catalog price succeeds only with its valid proof; stale price behavior is understood by the owner.
- [ ] Client-modified sale subtotal/total/tax/discount are rejected or replaced with server-derived amounts. **Do not release before this passes.**
- [ ] Tender total equals bill total or the explicitly supported outstanding/credit amount; status reflects paid, partial or unpaid correctly.
- [ ] Cash exact payment, overpayment/change, split tender, Telebirr, CBE Birr, bank/card, failed request and retry.
- [ ] Credit cannot be enabled for customer balances until debtor identity, amount owed, original sale, actor/time, collections and remaining balance are persisted and tested.
- [ ] Duplicate submit/double-click/reconnect produces one sale, one payment set and one stock movement.
- [ ] Sale void, cancellation before KOT, correction after KOT, refund and wastage are separate states with actor, timestamp, reason/value where required.

## 5. Inventory and FIFO

- [ ] Receive 100 units at 60 ETB; sell 90; remaining quantity/cost layer equals 10 at 60 ETB.
- [ ] Receive 100 at 70 ETB; sell 15; next sale consumes 10 at 60 and 5 at 70; `sale_items.cost_total` and profit match.
- [ ] Replay receipt and sale sync; quantity, movement row, cost layer and allocation do not duplicate.
- [ ] Count a product; verify expected system count, physical count, variance, actor/reason, and approved adjustment movement.
- [ ] Issue custody voucher: branch inventory is unchanged and amount is reserved once; reject issue above unassigned stock.
- [ ] Accept/dispute voucher as the selected recipient only; verify accepted custody quantity and its shift identity.
- [ ] Sell prepared goods: branch stock decreases once; KOT custody allocation only attributes sale quantity and does not deduct branch stock again.
- [ ] Submit used/returned/wasted/count reconciliation. Verify definitions do not double-count sale quantity or wastage; returned amount is transferred to branch inventory exactly once if the workflow promises that transfer.
- [ ] Confirm recipe/ingredient inventory is not implied by direct product stock; test only menu-product stock unless a recipe system is added.

## 6. KOT and kitchen/bar routing

- [ ] Apply explicit station migration; review its one-time legacy category backfill.
- [ ] Category Kitchen item -> Kitchen only; category Bar -> Bar only; product override wins; None creates no ticket.
- [ ] Repeat with Amharic-only names, renamed/ambiguous product labels; station result remains unchanged.
- [ ] Save initial table order and edit quantity: only the positive newly added quantity is sent; unchanged lines are not reprinted.
- [ ] Ready ticket cannot be transitioned backward by waiter/cashier; station worker identity/custody shift is persisted.
- [ ] Concurrent same-state transitions yield one valid transition.
- [ ] Kitchen user cannot load Bar tickets; barman cannot load Kitchen tickets; owner/manager view follows current policy.
- [ ] Realtime event appears on a second device; disconnect realtime and verify polling recovers within 10 seconds.
- [ ] Print station poll/ack uses a verified Supabase user token and only the user's allowed business/branch/station tickets.

## 7. Shift and cash reconciliation

- [ ] Open shift with float; query persisted `opening_cash`.
- [ ] Close with a forged/different client opening value; expected cash must still use persisted float.
- [ ] Cash sales increase drawer; non-cash payments do not; cash expenses and cash refunds reduce it; non-cash expenses do not.
- [ ] Actual cash omitted, zero, valid positive, negative, string, NaN-like payload and duplicate close.
- [ ] Two simultaneous close requests: exactly one state transition; identical retry is safe; changed actual count is rejected.
- [ ] Offline close queued and replayed after reconnect; include a sale created offline before and after the close timestamp. Require explicit cutoff behavior and no missing sale.
- [ ] Manager/owner review authorization and branch custody close; cashier cannot close another user's shift.
- [ ] Compare shift PDF and database rows with manually calculated fixture values, including FIFO `cost_total`.
- [ ] Telegram disabled, send success, provider failure, retry, concurrent retry and multiple business recipients; no cross-business recipient receives a PDF.

## 8. Role and tenant checks (UI + API + database)

For every item below, test visible UI, direct API request, and authenticated database/RLS request. Record expected HTTP response and whether the DB returned any row.

- [ ] Owner can configure and review; cannot access Business B.
- [ ] Manager performs allowed operations but cannot mutate owner-only settings.
- [ ] Waiter saves table order but payment/shift close fails server-side.
- [ ] Cashier checks out and closes own shift but cannot edit catalog/owner settings.
- [ ] Kitchen and barman each see/update their station only.
- [ ] Inventory clerk receives/counts/issues custody; sales/billing and retail price writes are denied.
- [ ] Combined roles preserve additive permissions; test strict cashier-only room charge rejection.
- [ ] Business A cannot fetch or mutate B products/categories, inventory, tables/orders/KOT, sales/payments, expenses, staff/shifts/reports, custody or folios by known ID. Repeat B -> A.
- [ ] Branch A cannot read/write Branch B data within the same business where branch scoping applies.

Do not mark tenant or RLS PASS based on service-role route tests alone.

## 9. Offline and resilience checks

Use a real browser profile/device with the installed PWA. Do not clear storage during the test.

1. Start online, sign in, load catalog/tables, open a shift, and verify required stock/cache exists locally.
2. Disconnect. Save a table order and complete a sale if the existing workflow allows it. Verify local receipt/history and local inventory response.
3. Navigate between already-loaded POS views; refresh and note whether route caching supports it.
4. Reconnect and wait for sync. Verify one server sale/payment/movement/order and a stable synced state.
5. Interrupt the network at each sync phase, retry and inspect both local outbox and server records.
6. Reopen the app after browser restart; confirm pending/failed items remain recoverable.
7. Test stale signed catalog, duplicate checkout, double tap and two-device table revision conflict.

Offline support is not proven until these checks pass on the target mobile browser/PWA. Browser storage eviction and device loss remain risks even after a successful test.

## 10. Role usability and performance evidence

For each role and English/Amharic locale, record first screen, primary task/button, confusing labels, recovery from a mistake, offline message, and whether a low-literacy user can complete the workflow without help.

Measure with browser performance tooling on staging/device; do not infer from source alone:

- POS initial load and catalog payload size
- Product search response and add-to-cart interaction
- Table list load/save and second-device propagation
- Payment completion and receipt availability
- Inventory load/refresh
- Report load for a known range
- Offline startup from an already-loaded session
- Sync batch duration, retry count and per-transaction failure

Check network panel for duplicate queries, realtime subscription count, oversized payloads, unbounded report ranges and N+1 requests. Save metrics with device/network and fixture size.

## 11. Required release sign-off

- [ ] All local checks pass; any pre-existing lint issue is listed separately.
- [ ] Migration history and `20261007065456_explicit_preparation_stations.sql` verified on staging.
- [ ] Role, tenant, branch and direct-API tests pass against staging RLS.
- [ ] Financial and inventory duplicate/retry tests pass after deliberate interruption.
- [ ] Offline mobile workflow and receipt/history behavior pass on target device.
- [ ] Owner has verified business-specific station backfill, opening stock, payment methods, and report recipients.
- [ ] Blockers in [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) are resolved or business owner accepts a documented controlled-pilot boundary.

## Recommended implementation order

1. Server-derived sale totals, tender balance/status, and complete idempotent transaction commit/recovery.
2. Credit/debtor minimum lifecycle or disable credit for live pilot.
3. Align custody used/sold/returned/waste definitions and ensure returned stock is posted exactly once.
4. Apply migrations and run two-tenant/role/RLS staging matrix.
5. Run offline interruption, shift-close cutoff and physical-device QA.
6. Measure performance; fix only demonstrated bottlenecks.
7. Consider recipes/ingredient costing and advanced integrations only after daily sales, inventory and reconciliation are stable.

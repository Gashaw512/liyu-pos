# Liyu POS Production Readiness Review

**Review date:** 7 October 2026  
**Scope:** Repository source and checked-in migrations. No staging credentials or deployed-database inspection were available.

This is a code review, not a production certification. “Code-reviewed” means the repository contains the described path; it does not prove its runtime behavior, deployed RLS state, migration history, printer setup, or offline behavior on a real device.

## Evidence labels

- **Code-reviewed:** visible in the current source and checked-in migration files.
- **Staging required:** depends on a Supabase deployment, role fixtures, realtime publication, browser/device, or external Telegram/printer service.
- **Partial:** some path exists, but a required invariant or business scenario is not covered.
- **Missing:** no current end-to-end implementation was found in this review.

## Capability and guardrail matrix

| Business capability | Current implementation | Source of truth | Server validation | DB/RLS protection | Offline support | Idempotency | Current risk | Required action |
|---|---|---|---|---|---|---|---|---|
| Authentication | Supabase Auth session, server `getUser`, profile lookup | Auth user + `profiles` | Most sensitive APIs resolve the session server-side | RLS helpers use authenticated profile/business context; deployed state unverified | Existing session can support already-loaded local POS | Auth retries are provider-managed | Invitation/signup and recovery depend on deployed Auth settings and redirect URLs | Test invite validation/signup/recovery on staging |
| Business isolation | APIs resolve business from authenticated profile; service-role routes add explicit filters | `profiles.business_id` | Present on reviewed sync, table-order, report, handover, KDS, room routes | Multiple RLS policies and `auth_business_id()` helpers | Local records carry business ID; browser values are not an authorization source | IDs plus tenant filters | Any service-role query missing one predicate bypasses RLS | Two-business API/RLS penetration test |
| Branch isolation | Branch from authenticated profile on operational routes | `profiles.branch_id` and branch-owned rows | Present on reviewed operations | Branch predicates/policies exist in migrations | Local branch context used for local stock and queued records | Scoped request IDs / unique keys vary by feature | Single active branch per profile limits multi-branch staff workflows | Verify cross-branch direct-ID requests in staging |
| Owner | Dashboard, management, configuration, reports, POS | Primary/assigned roles + profile tenant | Route-specific allow lists | RLS / service-role route checks | POS local workflows | Inherits operation-specific safeguards | Source review cannot establish deployed grants | Exercise allowed and denied endpoints |
| Manager | Operational dashboard, staff/operations, reports and inventory | Assigned role set | Route-specific checks | RLS policies | POS local workflows | Inherits operation-specific safeguards | Settings are intended to be owner-only; test all API mutations | Staging role matrix |
| Cashier | Checkout, payments, shifts, close report | Authenticated operator, persisted shift and sales | Sync and close routes validate session and tenant; room charge requires cashier-only | Financial direct writes are restricted by checked-in policies | Local sale and outbox; room charge requires online folio validation | Sale ID and movement checks; report delivery claim | Sale totals are currently taken from client payload in sync; fix before live money handling | Recalculate/validate sale totals and tender balance server-side |
| Waiter | Save/update shared table orders | Server `open_table_orders` snapshot and revisions | Table save requires waiter/manager/owner; price proofs checked first | Direct writes are revoked by `20261006100129...`; deployment unverified | Local pending table-order events and conflict merge | Revision check and server commit RPC | KOT is generated after save; there is no separate send step in waiter UX | Test two-device concurrent edits and replays |
| Kitchen | KDS tickets for kitchen station | `kitchen_order_tickets` | Branch + role filter; transition RPC checks expected state | KOT RLS and station-specific policies | Not established as offline workflow | State transition is compare-and-set via RPC | Real-time delivery relies on publication/configuration | Verify realtime plus polling on staging |
| Barman | KDS tickets for bar station; custody acceptance/reconciliation | KOT + custody tables | Role and branch checks; ready requires station role | KOT/custody RLS; service-only RPCs | Handover inbox is online | Handover request IDs and RPC state guards | A bartender's stock custody does not decrement branch inventory; KOT allocation is a sub-ledger | Reconcile custody vs branch inventory in pilot |
| Inventory clerk | Inventory/procurement workflows; cannot edit product/category base pricing after role-boundary migration | Branch inventory and movement ledger | Sync role gates inventory operations | Product/category writes restricted to owner/manager by `20261006084459...` | Receive/count events queue locally where supported | Movement reference keys and request IDs | Verify every adjustment endpoint and action reason field in staging | Test denied sales/price paths and allowed stock paths |
| Combined roles | Existing `profile_roles`, effective role union; new staff detail multi-role editor/API | `profiles.role` + `profile_roles` | Role API checks actor, target tenant, primary role and assignment limits | Existing role policies plus server API; deployment required | Role changes require online server | Idempotent role inserts/deletes | Exact-role endpoints deliberately reject combinations (e.g. room charge); other paths use additive `some(role)` | Test each supported combination and document exact-role exceptions |
| Products | Product CRUD, Amharic names, price and inventory flags | `products` | Management route/UI and RLS | Owner/manager mutation policy; RLS deployment required | Catalog is cached for POS | Product ID | Server sync currently verifies price proof but does not rebuild total from approved lines | Correct server-derived sale calculation |
| Categories | Category CRUD; now includes Kitchen/Bar/None default station | `categories` | Owner/manager through current management path | Owner/manager RLS policy | Cached catalog | Category ID | New station column requires latest migration | Apply migration and test category save/routing |
| Prices | Catalog price; signed HMAC proof binds tenant, branch, product, and cents | `products.retail_price`; signed cached snapshot | Table-order and sale sync verify proof; manager/owner override path exists | Product writes management-only after migration | Signed cached price supports offline catalog snapshot | Proof verification and sale ID | Old cached signed price remains usable offline by design; taxes/discount totals need full server validation | Test tampering, stale catalog, override and offline replay |
| Inventory balance | Branch quantity in `inventory`; movement ledger and FIFO layers | `inventory.quantity` is current materialized balance; movements/layers explain it | Sync validates business/branch/product and processes movement records | RLS and movement triggers/functions in migrations | IndexedDB copy is provisional/offline cache | Movement `reference_id` / sale id; unique FIFO references | Missing local inventory record means local stock cannot be deducted; offline negative stock allowed | Verify opening balance/negative stock policy per business |
| Stock receiving | Local receive queue -> sync -> `inventory_movements` purchase movement | Persisted movement and resulting inventory/FIFO layer | Sync role/tenant/product checks | Trigger/FIFO functions apply movement in DB | Queue supported by sync engine | Reference ID checked before movement insert | Requires deployed FIFO migration and a stable reference ID | Test retry and exact single stock increment |
| Stock adjustments | Inventory count/adjust transaction path exists | Inventory row plus movement/reconciliation records | Sync route checks inventory role and tenant | Inventory RLS/movement policy | Queued when transaction type is supported | Transaction/movement identifiers | Not every adjustment path was verified to require a human reason; count input may originate offline | Audit each adjustment UI/API and require actor/reason |
| Stock counts | Count reconciliation transactions and custody count RPC | Submitted count snapshot + persisted branch quantity | API verifies user, branch, bounded payload; RPC validates custody submissions | Service-role-only mutation RPCs | Local count events can queue; custody reconciliation is online | Count/reconciliation request UUID | Full interrupt/retry/device tests not run | Validate retries and count variance against a staging ledger |
| Stock custody | Clerk issues a pending voucher; selected worker accepts into custody shift inventory | `stock_handovers`, `custody_shifts`, `custody_shift_inventory` | Issue/accept routes check tenant, branch, roles, target, quantity | RPC/service role and RLS migration | Not an offline-safe transfer workflow | Request UUID / resolved-state guards | Issuance reserves availability; it does not reduce branch inventory; custody is accountability sub-ledger | Verify custody return/waste/count to branch ledger without double deduction |
| Table orders | Shared order route, price proof checks, revision-aware merge | `open_table_orders` | Session roles, branch/table ownership, signed prices; server writes | Direct authenticated writes revoked by migration | Offline event queue exists | Revision CAS, table unique constraint | Trigger-driven KOT runs only when DB migration is applied | Multi-device conflict test |
| KOT | DB trigger emits revision tickets for quantity additions | `open_table_orders` snapshot -> `kitchen_order_tickets` | Table-order route validates price before service-role write | Trigger inaccessible to direct client; KOT RLS | No offline KOT guarantee | Unique order/revision/station | Explicit station configuration is in new migration, not yet applied; existing DB currently uses name heuristics | Apply latest migration; test English/Amharic/renamed items |
| Kitchen KDS | Station-filtered API, state transition and active custody attribution | KOT rows / lines | Role, branch, current state, station worker checks | RLS plus transition RPC | No offline transition guarantee | Expected-state transition | Realtime subscription and 10-second polling are code paths but staging publication not verified | Verify queue update on multiple devices |
| Bar KDS | Same queue, bar-only station role | KOT rows / lines | Same as Kitchen | Same as Kitchen | No offline transition guarantee | Expected-state transition | Same migration/configuration dependency | Verify per-branch isolation and barman attribution |
| Sales | IndexedDB local sale/history + outbox; server commit RPC | Local receipt until sync; server-derived persisted sale header/lines after sync | Authenticated sync validates tenant, branch, operator, price proof, tax/discount and tender coverage | Service-role-only transaction function plus FIFO DB trigger; migration deployment unverified | Local sale/outbox and signed offline price snapshots | Stable sale UUID, DB advisory transaction lock, line/payment comparison | Core transaction now groups header, lines, payments and FIFO/inventory effects; downstream KOT/room operations are separate retryable steps | Deploy migration and inject failures/concurrent retries in staging |
| Payments | Tender rows for cash, Telebirr, CBE Birr, banks, credit, and room charge | `payments` plus sale balance fields | Tender sum must equal server-derived bill; room charge remains exact cashier-only | Service-role-only sale and settlement functions; RLS deployment unverified | Local payment rows queue with sale | Transaction lock and atomic insert; settlement idempotency key | External wallet payment is recorded, not verified by a provider; test post-commit room/KOT retries | Verify tenders and failure recovery on staging |
| Credit | Debtor name/phone captured for credit sales; amount paid/outstanding/status on sale; settlement API and ledger | `sales` balance fields + `credit_settlements` + payment rows | Server requires debtor and calculates balance; settlement rejects overpayment | New migration, server role guard and tenant filter; deployment unverified | Credit sale can sync later; collections are online only | Sale-linked settlement UUID and row lock | No cashier UI for finding/settling outstanding debts; do not use live credit until that workflow is usable and verified | Add/review simple credit collection UI or disable credit at pilot |
| Expenses | Shift/business/branch expenses with payment method | `expenses` | Server actions and RLS; exact role path varies | RLS | Local/report fallback exists; full offline mutation path not certified | Expense ID | Cash impact must be included in drawer close; fixed in reviewed close calculation | Test cash vs noncash expenses and role denial |
| Shifts | Persisted shift rows; open flow persists opening float entered by cashier | `shifts.opening_cash` | Open/close routes validate roles, user, branch; close reads saved float | Unique open shift index and RLS | Shift opening may queue; final close UI requires connectivity and sync | Shift UUID; status-guarded close; close-report delivery token | Server/outbox race behavior still requires device testing | Verify no close with pending sales and no duplicate close after replay |
| Cash reconciliation | Close uses persisted opening float, completed cash payments minus refunded cash and cash expenses; stores actual/difference | Persisted shift, payment rows, expense rows, user-entered actual count | Validates actual count and matching persisted shift/timestamps | Service-role close route filters business/branch/cashier and updates only open state | UI blocks offline close and checks the matching sales queue before queuing close | Closed state and matching close values prevent changed duplicate close | Connectivity can disappear after the UI check; test in-flight network loss and confirm the queue remains visibly pending | Reconcile with staged network loss and offline sale |
| Reports | Report pages combine remote and local views; shift PDF uses persisted sales/payment/inventory data | Underlying sales, payments, expenses, FIFO costs, inventory | Report endpoints scope tenant/branch | Depends on RLS and service-route filters | Some local report fallback | Shift delivery per shift/recipient; report loads have no snapshot token | Daily remote/local merge and date/time boundaries need reconciliation | Compare reports with source ledger fixtures |
| Offline queue | IndexedDB stores catalog, sales, table events, shift events and inventory events | Device-local IndexedDB before sync | Server revalidates on receipt | DB policies after sync | Implemented in source, device behavior not verified here | Queue IDs and transaction IDs | Not proven resilient to storage eviction, device loss, or every crash window | Real-device browser QA |
| Synchronization | `/api/sync` authenticates user, resolves business/branch, processes transaction types and reports failures | Server DB after successful processing; local outbox until ack | Role/tenant/product/price/amount validations | Server uses service role with explicit predicates | Automatic online/retry/poll paths | Sale ID lock and atomic sale RPC; other transaction paths have separate guards | Only core sale/payment/FIFO writes are in one DB transaction; downstream KOT/room and unrelated sync transaction types need failure injection | Inject failures after commit and across every other write in staging |
| Hotel/room charge | Toggle, cashier-only online folio check, idempotent sale-to-folio RPC | Active `hotel_room_folios` + immutable charge ledger | Business toggle, exactly cashier role, active branch folio | RPC and tenant branch constraints | Requires online validation; sync can post after sale | Unique sale charge | Requires migrations and staging; combined cashier role denied intentionally | Test duplicate sync, inactive folio, toggle-off, other tenant room |
| Audit/history | `audit_logs`, inventory movements, sales and custody snapshots | Domain ledgers | Role-based reads vary | RLS policies exist | Local receipt history | Domain record IDs | Not every sensitive correction/refund is represented by a complete immutable audit workflow | Audit void/refund/adjustment coverage |
| Shift report delivery | PDF builder, encrypted per-business Telegram recipient config, retries | Closed shift plus delivery/recipient rows | Auth, role, tenant; server-only bot credentials | Service-role writes and RLS | Queued separately from close | Shift ID, delivery claim, per-recipient sent state | Telegram external delivery not tested against live recipient or network failure here | Staging test token, two tenants, retries |

## Implementation changes in this review

- Shift close now uses the persisted opening float, validates actual cash as a non-negative number, filters persisted payments, subtracts cash refunds and cash expenses from expected drawer cash, and only transitions an open shift once. Retries with identical closed values may continue report delivery; a changed close is rejected.
- Shift report COGS now sums immutable FIFO `sale_items.cost_total` rather than multiplying the weighted display cost by quantity.
- Sale sync now recalculates line subtotal, business tax, authorized discount and tip from validated item snapshots, and rejects tender totals that do not match. Price proof behavior remains compatible with cached signed prices.
- Sale header, sale items, payment rows, and the FIFO-triggered inventory effects now commit through one service-role-only, transaction-locked database function. This removes the second TypeScript branch-inventory deduction that previously followed the FIFO sale-item trigger.
- Credit sales capture debtor name/phone and persist paid, outstanding and payment status. A scoped settlement API and idempotent database ledger function support partial/full collection and settlement history; a cashier-facing balance workflow still needs completion.
- POS close now requires connectivity, syncs pending sale work first, and leaves the shift open if sales for that shift remain queued.
- KOT routing now supports category default `preparation_station` (`kitchen`, `bar`, `none`) with nullable product override (`NULL` inherits category). Legacy category/product values are backfilled once with the old mapping; the trigger thereafter reads explicit configuration, not names.
- Category and product create/edit forms expose the station choice.
- Added unit coverage for expected drawer cash calculation.

These changes are source-reviewed and locally testable. The station migration must be applied before the UI field or new trigger can work in a deployed database.

## Remaining implementation files

These are the concrete source paths for the blockers; they are identified for the next focused change and were not broadly rewritten during this audit:

- Cashier-facing credit collection UI and sale balance search: `src/app/[locale]/(app)/sales`, `/api/credits/settle`, and `credit_settlements`. Keep settlement writes server-side and expose history with actor/time/sale reference.
- Custody formula alignment: `src/app/api/inventory/handover/reconcile/route.ts`, `supabase/migrations/20261006130715_custody_stock_reconciliation.sql`, and the custody section of `src/app/api/shift-reports/close/route.ts`. Agree whether `used_quantity` includes sales; then include returned stock consistently and avoid double-counted wastage.
- Offline close cutoff: `src/lib/offline/syncEngine.ts`, `src/app/api/shift-reports/close/route.ts`, and sale sync validation. Define when late offline sales are accepted relative to a closed shift.
- Deployed access control and station routing: migrations and the actual target project's RLS/function/publication state; no source-only file edit can complete this verification.

## Exact migrations to verify/apply

First compare the target project's migration history with the repository; do not blindly apply a migration already present. For a database starting from this repository's baseline, apply **all migrations in lexical order**. At minimum, verify these operational migrations are present:

- `20260924103032_add_fifo_inventory_costing.sql` and `20260924111142_fifo_inventory_cost_layer_read_access.sql` — FIFO cost and access.
- `20260925144031_shift_report_notifications.sql` and `20260925151717_business_telegram_recipients.sql` — shift delivery and tenant recipients.
- `20261001073803_pos_enforce_single_open_shift_per_cashier.sql` and `20261001075531_pos_sync_open_table_orders.sql` — shift uniqueness and shared orders.
- `20261005093000_mvp_role_access_boundaries.sql`, `20261006055152_repair_invited_staff_signup_flow.sql`, `20261006082734_allow_pos_staff_inventory_read.sql`, `20261006084459_restrict_pos_financial_ledger_writes.sql` — role/RLS rules.
- `20261006092213_hospitality_kot_and_room_folios.sql`, `20261006100129_add_hotel_integration_flag.sql` — KOT and hotel integration.
- `20261006110514_stock_handover_custody_and_price_permissions.sql`, `20261006113008_stock_custody_shifts.sql`, `20261006130715_custody_stock_reconciliation.sql`, `20261006135427_kot_sale_custody_allocations.sql` — custody and KOT attribution.
- `20261007065456_explicit_preparation_stations.sql` — new explicit Kitchen/Bar/None routing configuration (**not yet applied to staging**).
- `20261007071854_atomic_sale_checkout_and_credit_ledger.sql` — server-derived payment status, atomic sale/items/payments/FIFO commit, and idempotent credit settlements (**not yet applied to staging**).

The migrations in `001`–`019` are the foundational schema/RLS set and are also required for a clean database. Remote migration status was not queried.

## Commands run for this review

Run from repository root:

```powershell
npx tsc --noEmit
npm test
npm run lint
npm run build
```

Results for this review:

- `npx tsc --noEmit`: **PASS** after the sale/credit/close changes.
- `npm test`: **17 passed, 2 failed**. `business-context-repair.test.mjs` cannot resolve the `@/lib` alias in Node's test runtime; `password-recovery.test.mjs` cannot resolve an extensionless TypeScript import. New authoritative-total and local-credit-state tests passed.
- `npm run lint`: **FAIL**. The repository-wide scan includes `.kilo/worktrees` and reports 218 errors/272 warnings. Targeted lint on new helper/API/type/query files passed. Targeted lint on the four existing catalog form pages reports three pre-existing `react-hooks/set-state-in-effect` errors and two existing warnings; the corresponding effect/callback logic was not changed in this patch.
- `npm run build`: **PASS** after running outside the sandbox because the sandbox denied Next.js worker spawning with `EPERM`. Next.js production compilation, TypeScript and static generation completed after the implementation changes.
- `git diff --check`: **PASS**.

Staging checks below are mandatory for database-dependent PASS claims.

## Staging verification procedure

1. Use a dedicated Supabase staging project and a separate staging business. Back up staging first; never reset or truncate production data.
2. Compare `supabase migration list` with checked-in migrations, apply missing migrations through the reviewed release process, and record migration versions.
3. Verify `products.preparation_station`, `categories.preparation_station`, the dispatch trigger, KOT tables/lines, custody and allocation tables, room-charge function, FIFO functions, indexes, grants, and RLS policies exist.
4. Confirm `kitchen_order_tickets` is in `supabase_realtime`; test real-time delivery, then confirm the 10-second fallback still recovers a missed event.
5. Use Business A and B, separate branches and role accounts. Attempt direct API requests with known foreign IDs for each tenant-scoped resource.
6. Verify the service-role key, price-proof secret inputs, and `MESSAGING_ENCRYPTION_KEY` are server-only deployment variables. Confirm no secret appears in browser bundles, logs, or API responses.
7. Configure category station Kitchen, Bar, and None. Use English, Amharic-only, renamed, ambiguous, and product-override items. Save orders and assert only additions create tickets at the configured station.
8. Verify inventory receiving once, stock custody issue without branch balance deduction, acceptance, sale branch deduction once, KOT custody allocation without a second branch deduction, wastage separately, and count variance.
9. Close shifts with a wrong client opening value, a cash expense, a cash refund, a non-cash expense, exact/invalid actual cash, duplicate retry, changed duplicate close, and a failed Telegram delivery. Compare persisted shift values and PDF with ledger fixtures.
10. Test cashier cash/Telebirr/CBE/card/bank tenders, partial and duplicate submissions. Tamper subtotal/tax/discount/total; server must persist the independently calculated amount or reject an unauthorized discount. Confirm paid/outstanding/status and inventory movement remain consistent.
11. Test credit with debtor name/phone, full and partial settlement, over-settlement rejection, invalid sale, reused idempotency key, actor/time/sale history. The balance API is implemented; do not enable live credit until the cashier collection UI is available and these SQL paths pass staging.
12. Interrupt the atomic sale transaction at sale header, item/FIFO trigger, and payment stages; require complete rollback. Then interrupt after core commit at KOT allocation and room charge; retry and require no duplicate sale/stock/payment/allocation/folio charge.
13. Run the role matrix in `ROLE_MATRIX.md` and the scenario checklist in `PRE_PRODUCTION_CHECKLIST.md`; keep request/response evidence with sensitive values redacted.

## BLOCKER — must fix before real business

- No staging run has verified the new amount derivation, credit state/settlement, atomic RPC, FIFO triggers, or RLS. Keep real money/credit use blocked until migration deployment and tests pass.
- The cashier-facing workflow to locate and collect outstanding credit balances is not integrated, even though the server ledger/settlement API exists. Disable credit for the pilot until staff can use and verify this workflow.
- The new migration and required RLS/security migrations are not verified on the target Supabase deployment. No tenant/branch isolation claim can be made until two-tenant API and RLS tests pass there.
- Core sale/payment/stock changes are atomic; KOT allocation and hotel folio posting happen after that transaction. They are idempotent by design but require staging interruption/retry verification.
- Offline close is now blocked in the UI, sync is attempted first, and the local shift stays open while matching pending sales remain. Validate browser-network-loss timing and server close races in staging.

## PILOT — acceptable only with controlled checks

- Offline POS works from cached data in source, but device eviction, crash, refresh, network interruption, and actual hardware behavior require real-device QA.
- Product-level stock does not consume recipe ingredients; food costing is product-level, not recipe-level.
- Existing KOT category data is mapped from the former English heuristic once; a manager must verify the resulting station assignments after migration.
- Telegram is external and can be delayed/disabled independently from closing the shift.
- Multiple branches per profile and advanced inter-branch transfers are not demonstrated as a complete workflow.

## FUTURE — do not build yet

- Recipe/ingredient depletion, procurement forecasting, advanced debtor CRM, loyalty, forecasting, accounting integrations, and automated Ministry of Revenues API integration.
- Printer-agent fleet management beyond the current authenticated poll/ack interface.
- Advanced station maps, multi-prep routing, and complex kitchen course sequencing.

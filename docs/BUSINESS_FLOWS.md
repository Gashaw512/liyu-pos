# Liyu POS Business Flows

This describes the implementation found in the repository as of 7 October 2026. It is not a claim that migrations have been deployed or that the workflow has passed staging QA. See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for evidence labels and deployment gates.

## 1. Onboarding and configuration

1. The owner creates a business through the onboarding flow and is associated with a business and branch in `profiles`.
2. Existing setup code creates business categories/products and branch data. Staff join through invitations and are attached to the business/branch.
3. `profiles.role` is the primary role. Additional roles are stored in `profile_roles`; server authorization combines them in the role-aware paths.
4. Product/category mutation is intended for owner/manager. The checked-in role-boundary migration also removes catalog write access from `inventory_clerk`.
5. Business settings include the hotel integration switch. It defaults false. Wallet merchant credentials/configuration should not be represented as proof of an online payment gateway; current methods are recorded tenders unless a separate provider integration exists.

**State:** code-reviewed; actual Auth policies, redirects, RLS and settings persistence require staging verification.

## 2. Menu station configuration

1. A manager configures the category default as **Kitchen**, **Bar**, or **No preparation ticket**.
2. A product can inherit its category default or override it as Kitchen, Bar, or None.
3. When a waiter saves an order, the server checks product availability and signed price proof before writing the shared order.
4. The database trigger compares current item quantity against the previous saved snapshot and inserts tickets only for positive quantity deltas.
5. The selected station, not the English/Amharic name, determines the Kitchen or Bar ticket. None products do not create a KOT.

The migration backfills category stations once with the prior English-name/category heuristic so existing menus keep their old routing. Review the resulting category assignments before first production use. The explicit routing is available only after `20261007065456_explicit_preparation_stations.sql` is applied.

## 3. Table order to KOT lifecycle

| Initial state | Action | Authorization | Persisted transition | Result / limitation |
|---|---|---|---|---|
| No open order | Waiter saves items | waiter, manager, owner | Insert open order at revision 1 | Database trigger can create station KOTs |
| Open revision N | Waiter edits/saves | waiter, manager, owner | Server merges changes against base revision; RPC commits next revision | Concurrent updates that cannot merge return conflict; UI should reload/merge |
| New quantities in saved revision | KOT trigger executes | Trigger only after server order save | Insert KOT by station and order revision | Unique order/revision/station prevents duplicate tickets |
| KOT pending | Station worker starts | kitchen role for Kitchen; barman role for Bar; manager/owner can oversee | `pending` -> `preparing` | Expected-state transition blocks invalid jump |
| KOT preparing | Station worker marks ready | station-specific worker; manager/owner may inspect but not substitute for worker attribution | RPC `preparing` -> `ready`; worker and custody shift recorded | KOT is the prep state; line allocation is a related custody sub-ledger |
| Open order with ready lines | Cashier completes sale | cashier or management according to current POS/API path | Completed sale; ready KOT line quantities allocated to sale | Branch inventory/FIFO is deducted once by sale processing; KOT allocation itself is not a second deduction |
| Prepared item removed/cancelled | Waiter/cashier tries to reduce it | Ordinary user denied; manager/owner correction path | Current order merge/correction and wastage allocation paths apply | Test over-prepared, void, refund and correction cases before live use |

Table-order persistence is shared and server-mediated. Offline table events can be queued locally, but no KOT is guaranteed until the server accepts the order.

## 4. Sale lifecycle

1. POS builds a local cart, receipt, and tender allocation. A credit tender requires debtor name and phone; the local receipt marks the amount paid/unpaid/partial separately.
2. `finalizeSale()` stores the pending sale, receipt history, local stock cache change, and table state in an IndexedDB read/write transaction.
3. `/api/sync` resolves business/branch/operator from the authenticated profile, then validates product identity and signed cached price proof. It normalizes prices to cents and ignores client subtotal/tax/total values.
4. The server derives subtotal from validated lines, tax from a verified catalog tax snapshot (for offline continuity) or current `businesses.tax_rate`, and the signed product tax-inclusive setting. Discounts are accepted only for owner/manager-authorized requests. It checks that tender allocations equal the derived total.
5. `commit_pos_sale` commits sale header, sale lines, FIFO cost allocation/branch inventory trigger effects, tender rows, and paid/outstanding status in one transaction. A transaction-scoped sale-ID lock serializes retries. A failure rolls the entire core sale transaction back.
6. For table sales, ready-KOT allocation follows the core transaction and is retry-safe. For room settlement, the online folio function follows the sale transaction and is idempotent. If either downstream step fails, the sale remains committed and the outbox retry continues the missing step without another sale or stock deduction.

**Remaining limits:** the application migration is not yet deployed or database-tested. Credit now records debtor name/phone, server-derived paid/outstanding fields, and a retry-safe settlement RPC/API with settlement history; the UI for finding and settling outstanding balances is not yet integrated into a cashier workflow. A local success receipt means saved on the device until sync confirms the server record.

## 5. Shift lifecycle

| Initial state | Action | Authorization | Persisted transition | Retry behavior |
|---|---|---|---|---|
| No shift | Open shift with counted float | owner, manager, cashier | Create/reuse active shift with `opening_cash` and `opened_at` | Unique one-open-shift index plus ID/reuse lookup |
| Open | Sell | POS user allowed by route; server requires valid branch/operator context | Sale/payment rows link to shift | Stable sale ID and inventory movement checks |
| Open | Close | owner, manager, cashier close-report endpoint; normal UI uses its current close flow | Persisted shift becomes closed with expected/actual/difference | Close update requires open state; identical closed retry may continue report work; changed values reject |
| Closed | Send report | Configured owner/admin Telegram recipients | Delivery row and per-recipient rows progress pending/sending/sent/failed/disabled | Shift key and conditional claim prevent concurrent duplicate sends |

The opening float is entered at opening and stored. Close ignores a client-supplied opening amount. Expected drawer cash is computed from persisted opening cash, completed cash payments, refunded cash tenders, and cash expenses. Actual counted cash is the only cash value supplied at close. POS shift close requires connectivity, runs sync first, and keeps the shift open if that shift still has pending sales. The route resolves the shift to the authenticated cashier; owner/manager roles do not thereby gain permission to close another cashier's monetary shift. Verify the policy with interrupted-sync staging cases.

## 6. Inventory and custody lifecycle

```text
Product catalog
  -> branch opening quantity / stock receipt
  -> branch inventory quantity + inventory movement + FIFO cost layer
  -> optional stock handover voucher (reserves available quantity; does not deduct branch quantity)
  -> recipient accepts voucher into custody shift ledger
  -> POS sale deducts branch inventory once and may allocate ready KOT quantity to custody ledger
  -> separate wastage / return / physical count
  -> custody reconciliation computes expected vs actual variance
```

The branch inventory balance and staff custody are intentionally separate ledgers. Handover issuance/acceptance must not be treated as a branch stock deduction. KOT sale allocation is accountability attribution, not inventory movement. Wastage is recorded separately from sale where the current KOT/custody paths support it. A single custody reconciliation request persists accepted float, used, returned, wasted, physical count and difference; its request UUID protects retry.

Current limits:

- Do not subtract both custody issuance and sale from branch stock.
- The checked-in custody SQL functions are not “pure TypeScript”; they are required database RPCs.
- Verify returned stock is actually posted back into branch inventory by the chosen workflow; do not assume a custody reconciliation count alone transfers it.
- Branch inventory permits negative stock in the current POS flow. A missing local inventory row means local stock is not deducted; server sync creates a zero row for recognized products before sale deduction.

## 7. Room charge flow

1. The business hotel switch must be true.
2. The active role must be exactly `cashier`; a cashier combined with another role is rejected by design on this sensitive endpoint.
3. Cashier validates an active room folio online within their business and branch.
4. Sale sync checks that room charge is the sole tender and equals the bill amount.
5. `post_room_charge_for_sale` validates the completed sale and active folio, inserts an immutable charge, updates the balance and uses sale identity for retry protection.

This requires the room-folio migration and deployed database function. Offline room validation is unsupported.

## 8. Reports and closeout

- Daily reports read remote persisted data when available and may merge local report data for offline presentation.
- Shift report values are scoped to the persisted shift and built from server sales, payments, expenses, inventory and FIFO cost totals.
- Telegram sending is separate from successful shift closure; delivery may be disabled or retried.
- Custody summaries combine accepted stock, KOT sale allocations, wastage and submitted physical counts. A branch-level manager/owner close can close active custody windows; recipient counts may be submitted afterward.
- Report values must be compared with source records. Do not use a PDF alone as a financial ledger.

## 9. Recovery semantics

| Event | Expected recovery |
|---|---|
| Local POS sale before network returns | Local receipt/history remains; pending sale stays in IndexedDB |
| Sync succeeds | Server acknowledges sale; local outbox removes/marks it synced; local receipt history remains |
| Sync rejects one transaction | Failed transaction remains retryable; server snapshot should not overwrite local unsynced work |
| Network retry after sale commit | Same sale ID, payment/movement/allocation guards prevent duplicates; must verify by staging failure injection |
| Telegram send fails | Shift stays closed; delivery row is failed/queued independently |
| Table revision conflict | Server returns conflict; client needs latest shared order before retry |
| KOT realtime event missed | Client refreshes queue on 10-second poll fallback |

## 10. Not implemented as complete business workflows

- Recipe/ingredient consumption for dishes and drinks.
- Cashier-facing credit balance search/settlement workflow; the scoped API, atomic settlement ledger, and history rows exist, but are not yet presented as a complete POS UI.
- Complete immutable manager-authorized void/refund/correction workflow across sale, payment, inventory, custody and audit history.
- Production-ready fiscal/VAT/TOT declaration and Ministry of Revenues integration.
- Proven all-device offline support under browser eviction/device loss.

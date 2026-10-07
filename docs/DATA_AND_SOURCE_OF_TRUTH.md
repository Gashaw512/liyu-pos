# Liyu POS Data and Source of Truth

This document distinguishes authoritative persisted values from client caches and submitted values. The server-side behavior below is based on checked-in code/migrations, not deployed database verification.

## Business numbers

| Value | Intended authoritative source | Current source used by code | Validation / important limitation |
|---|---|---|---|
| Product retail price | `products.retail_price` at catalog issue time plus valid server signature | Current catalog price or a signed cached snapshot; manager/owner may authorize override | HMAC price proof binds business, branch, product and price cents. Offline cached price can be stale until the client refreshes. |
| Product cost | FIFO cost layer consumed by sale | `inventory_cost_layers` -> immutable `inventory_cost_allocations` -> `sale_items.cost_total`; product `cost_price` is configuration/default | Shift report was changed to sum `cost_total`. Local offline receipt still uses an approximate 70% cost placeholder until sync, so it is not an authoritative profit figure. |
| Inventory quantity | `inventory.quantity` per business/branch/product, changed by movements | Inventory row plus `inventory_movements`; IndexedDB holds a local working snapshot | Receipt/sale triggers/functions update balance. Confirm migration deployment and one movement per request. Local missing rows can prevent immediate deduction; server can seed zero rows and allow negative stock. |
| Opening cash | Persisted `shifts.opening_cash` | Cashier enters opening float when opening; close reads persisted shift | Client close payload opening amount is ignored. Opening amount itself is user-entered at open and saved. |
| Cash sales | Completed `payments` with `method='cash'` for completed sale IDs in shift | Persisted payment rows | Shift close also subtracts cash-refunded payment rows, when present. A complete refund workflow was not found. |
| Non-cash sales | Completed `payments` grouped by method | Persisted payment rows | Payment rows represent recorded tenders, not proof of settlement from an external wallet API. |
| Expenses | `expenses` rows scoped to business, branch, shift, recorder | Persisted amount/payment method | Cash expenses reduce expected drawer cash; non-cash expenses do not. Shift close includes actor's shift expenses. |
| Expected drawer cash | Opening float + completed cash tenders − refunded cash − cash expenses | Server calculation in shift report close route | Current calculation is covered by a pure unit test; real DB/refund/expense combinations still need staging QA. |
| Actual cash | Physical drawer count entered by cashier | Client-supplied `actualCash`, validated as nonnegative number and persisted in shift | This is an observation, not system-derived. Duplicate close with changed actual count is rejected. |
| Payment status | Individual payment row `status`; outstanding is bill total minus effective settled tender total | `payments.status` (`completed`, `pending`, etc.) | There is no separate authoritative payment-status field on `sales` in the base schema. Client local `payment_status` is not the DB source of truth. |
| Credit balance | Debtor ledger should be original amount minus later collections | Current system stores credit as pending payment associated with sale | No complete debtor identity, due timeline, collection entry or outstanding balance lifecycle was found. Credit is a pre-production gap. |
| Sale status | `sales.status` plus linked item/payment rows | Sale is created with client-supplied status fallback and total fields; sync validates role/product price but currently does not recompute financial total | Server-derived totals and status transition rules are required before production; reject impossible status and mismatched tender totals. |
| KOT status | `kitchen_order_tickets.preparation_status` and line state | KOT ticket/line rows | API transition checks expected state. Ticket station derives from explicit product/category fields only after new migration is deployed. |
| Custody quantity | Accepted vouchers in `custody_shift_inventory` linked to a custody shift | `stock_handovers` + verified/accepted inventory rows | Pending vouchers reserve availability; they do not decrease branch stock. Custody is a sub-ledger. |
| Wastage | Immutable KOT wastage allocation or inventory movement with `movement_type='waste'` | `kot_wastage_allocations`, submitted reconciliation wastage and/or `inventory_movements` | Multiple paths exist; prevent counting the same wastage in both KOT allocation and submitted reconciliation. Actor/reason completeness requires staging review. |
| Stock variance | Physical count minus expected station quantity | `custody_shift_reconciliations` snapshots; report builder combines accepted, sold allocations, wastage and count | The close-report formula does not yet clearly reconcile `quantity_used`, `quantity_returned`, KOT-allocated sale, and wastage semantics. Validate the business meaning and avoid double-subtracting sales. |

## Calculation definitions to enforce

### Drawer

```text
Expected drawer cash
= saved opening cash
+ completed cash tenders
- cash refunds
- cash expenses
```

Non-cash tenders and non-cash expenses do not affect physical drawer cash. Actual counted cash is supplied by the cashier; variance is actual minus expected.

### Inventory and cost

```text
Branch on hand = prior branch quantity + receipts + returns + adjustments - sales - wastage
Sale COGS = sum of FIFO layer allocations consumed by each sale line
```

`inventory_movements` records the event. `inventory.quantity` is the current balance/cache used for quick reads. FIFO allocation records preserve which receipt cost funded each sale. Do not also subtract handover or KOT attribution from branch on hand.

### Staff custody

```text
Station expected count must account for:
accepted stock
- POS quantities attributed to prepared KOT lines
- separately recorded wastage
- quantities physically returned to branch inventory
```

The repository currently has both KOT allocations and a recipient-entered `used_quantity` in custody reconciliation. The business must specify whether `used_quantity` means an extra non-sale consumption amount or duplicates sold quantity. Until that is resolved, staff variance totals are not a certified accounting result.

## Record relationships

| Record | Parent / identity | Role in system |
|---|---|---|
| `products` | business, optional branch, category | Item identity, retail price, configured cost and stock flags |
| `categories` | business | Menu grouping and preparation station default |
| `inventory` | branch + product | Current on-hand materialized branch quantity |
| `inventory_movements` | business + branch + product + reference | Auditable stock event; movement IDs/reference IDs support replay checks |
| `inventory_cost_layers` | branch/product/source movement | Remaining FIFO receipt quantity and unit cost |
| `inventory_cost_allocations` | sale item + cost layer | Historical consumption cost |
| `sales` | business + branch + cashier + shift | Sale header and status |
| `sale_items` | sale + product snapshot | Sold product/quantity/price and FIFO `cost_total` |
| `payments` | sale + business | Tender method, amount, status, reference |
| `open_table_orders` | business + branch + table | Shared editable pre-sale order snapshot and revision |
| `kitchen_order_tickets` | open order + revision + station | Production ticket and state |
| `stock_handovers` | business + branch + product + sender + recipient + shift | Voucher state; pending, accepted or disputed |
| `custody_shift_inventory` | custody shift + product | Accepted quantity for physical accountability |
| `custody_shift_reconciliations` | custody shift + request | Submitted values, expected snapshot, count and variance |
| `shifts` | business + branch + cashier | Monetary cash drawer period and reconciliation |
| `hotel_room_folios` / charge ledger | business + branch + folio + sale | Guest balance and immutable room charge |
| `shift_report_deliveries` | business + shift/report + recipient | Delivery retry and duplicate-protection state |

## Untrusted input boundaries

The browser is not authoritative for business ID, branch authorization, role, catalog price when proof is absent, FIFO cost, actual server inventory, or opening cash at close. Server routes should derive those values from the authenticated profile and persisted rows. The cashier's physical count and opening float are observations entered by the user; validate range, identity and state, then persist.

**Known unsolved boundary:** `/api/sync` currently builds the sale header total/tax/discount from payload values after validating line product/price proofs. The values are not yet recomputed as one canonical server calculation. Treat all server sales totals as not production-certified until that is fixed and tested.

# Liyu POS Data and Source of Truth

This document distinguishes authoritative persisted values from client caches and submitted values. The server-side behavior below is based on checked-in code/migrations, not deployed database verification.

## Business numbers

| Value | Intended authoritative source | Current source used by code | Validation / important limitation |
|---|---|---|---|
| Product retail price | `products.retail_price` or signed catalog snapshot for this business/branch/product | Valid signed cached snapshot may preserve its issued price; manager/owner may authorize override | Sync verifies proof and normalizes to cents. Stale offline prices remain the price snapshot held by that device. |
| Product cost | FIFO cost layer consumed by sale | `inventory_cost_layers` -> immutable `inventory_cost_allocations` -> `sale_items.cost_total`; product `cost_price` is fallback only | FIFO allocation runs in the sale transaction. Local offline receipt still uses an approximate 70% cost placeholder until sync, so it is not an authoritative profit figure. |
| Inventory quantity | `inventory.quantity` per business/branch/product, changed by movements | Inventory row plus `inventory_movements`; IndexedDB holds a local working snapshot | Receipt/sale triggers/functions update balance. This is total unsold branch stock, including stock physically accepted into staff custody; it is not a stockroom-only balance. Confirm migration deployment and one movement per request. Local missing rows can prevent immediate deduction; server can seed zero rows and allow negative stock. |
| Opening cash | Persisted `shifts.opening_cash` | Cashier enters opening float when opening; close reads persisted shift | Client close payload opening amount is ignored. Opening amount itself is user-entered at open and saved. |
| Cash sales | Completed `payments` with `method='cash'` for completed sale IDs in shift | Persisted payment rows | Shift close also subtracts cash-refunded payment rows, when present. A complete refund workflow was not found. |
| Non-cash sales | Completed `payments` grouped by method | Persisted payment rows | Payment rows represent recorded tenders, not proof of settlement from an external wallet API. |
| Expenses | `expenses` rows scoped to business, branch, shift, recorder | Persisted amount/payment method | Cash expenses reduce expected drawer cash; non-cash expenses do not. Shift close includes actor's shift expenses. |
| Expected drawer cash | Opening float + completed cash tenders − refunded cash − cash expenses | Server calculation in shift report close route | Current calculation is covered by a pure unit test; real DB/refund/expense combinations still need staging QA. |
| Actual cash | Physical drawer count entered by cashier | Client-supplied `actualCash`, validated as nonnegative number and persisted in shift | This is an observation, not system-derived. Duplicate close with changed actual count is rejected. |
| Payment status | Server-computed `sales.payment_status`, `amount_paid`, and `outstanding_amount` | The sale RPC totals completed tender rows; pending credit remains outstanding | New migration adds the fields and atomic update; test deployed behavior before relying on it. |
| Credit balance | Debtor name/phone, sale balance, settlement history | `sales.outstanding_amount` and `credit_settlements` rows tied to sale/actor/time | Settlement RPC locks sale, prevents overpayment, records a completed tender and idempotency key. Cashier-facing balance lookup/settlement UI is incomplete; API requires connectivity. |
| Sale status | `sales.status` plus linked item/payment rows | Server sets completed state; line/tender inputs commit through `commit_pos_sale` | Client total fields are ignored. Server derives amount from validated lines, verified price proof, tax snapshot/current business tax, and authorized discount. Sale, items, payments and FIFO/inventory trigger effects are one database transaction after migration deployment. KOT/room posting follows separately and retries idempotently. |
| KOT status | `kitchen_order_tickets.preparation_status` and line state | KOT ticket/line rows | API transition checks expected state. Ticket station derives from explicit product/category fields only after new migration is deployed. |
| Custody quantity | Accepted vouchers in `custody_shift_inventory` linked to a custody shift | `stock_handovers` + verified/accepted inventory rows | Pending vouchers reserve availability; they do not decrease branch stock. Custody is a sub-ledger. |
| Wastage | Immutable KOT wastage allocation or inventory movement with `movement_type='waste'` | `kot_wastage_allocations`, submitted reconciliation wastage and/or `inventory_movements` | Multiple paths exist; prevent counting the same wastage in both KOT allocation and submitted reconciliation. Actor/reason completeness requires staging review. |
| Stock variance | Physical count minus expected station quantity | Reconciliation API adds server-read KOT sale allocations to recipient-entered non-sale use, returns, and wastage before invoking the transactional RPC; shift report derives expected quantity from these records | Reconciliation snapshots store sold quantity together with `quantity_used`, while the API response keeps sold separate. The allocation read and RPC are separate requests, so a sale-allocation race still requires staging verification. |

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
Branch total on hand = prior branch quantity + receipts + posted return movements + adjustments - sales - wastage
Stockroom available = branch total on hand - pending handovers - accepted active custody balance
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

Recipient-entered `used_quantity` means additional non-sale use. The server separately reads KOT allocations and subtracts sales once. Returned quantities currently affect the custody count but a submitted custody count does not itself post a return movement into branch inventory. Staff variance totals still require staging verification, especially a concurrent sale during count submission.

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

**Sale total boundary:** `/api/sync` derives persisted subtotal, tax, discount, tip, and total from validated item lines and trusted settings. New catalog proofs bind the issued tax rate and tax-inclusive flag so an offline sale can retain the tax snapshot shown at checkout. If a proof is absent or invalid, the route falls back to the current database tax configuration and rejects tender allocations that do not equal its calculated total. The route-level and database RPC behavior still require staging verification.

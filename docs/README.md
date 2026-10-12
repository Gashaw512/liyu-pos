# Liyu POS Hospitality Architecture and Manual QA Plan

This guide describes the hospitality and POS behavior currently present in the repository. It separates implemented controls from deployment-dependent checks and known limits, so a demo or security review does not mistake intended behavior for verified production behavior.

For the current production audit and source-of-truth detail, see:

- [Production readiness and blocker assessment](./PRODUCTION_READINESS.md)
- [Operational business flows](./BUSINESS_FLOWS.md)
- [Role and permission matrix](./ROLE_MATRIX.md)
- [Data and authoritative values](./DATA_AND_SOURCE_OF_TRUTH.md)
- [Pre-production test and release checklist](./PRE_PRODUCTION_CHECKLIST.md)

## Implemented architecture and security boundaries

### Tenant and role context

Authenticated server routes resolve the user, business, branch, and assigned roles from the Supabase session/profile. They do not accept a browser-supplied business ID as authorization. APIs and database policies scope operational records by business and, where relevant, branch. UI navigation is only a convenience; route handlers and database policies are the security boundary. The repository contains migrations for these policies, but code review cannot verify that they have been applied to a particular Supabase project.

The active role model includes `owner`, `manager`, `cashier`, `waiter`, `inventory_clerk`, `kitchen`, and `barman`. A user's primary role is combined with additional `profile_roles` assignments. Owners and managers can manage staff roles from the staff profile page: owners can assign operational roles or manager; managers can assign operational roles. The owner role itself is not assignable from staff management, and a user's primary role cannot be removed there. The API checks the manager's role, same-business scope, target account, and role restrictions before writing assignments. Invitation still starts with one role; additional roles can be assigned after the account is created. Some sensitive flows intentionally require exactly one role, such as room charging, so a cashier with extra roles cannot use that cashier-only path.

### Catalog price proofs and offline sales

The authenticated product-template endpoint loads the business and active branch from the user profile and attaches an HMAC-SHA-256 `price_proof` to each product. The signing secret is derived server-side from `SUPABASE_SERVICE_ROLE_KEY`; it is never returned to the browser. A proof binds the product ID, price in cents, business, branch, and proof version. Cached catalog products carry this proof into offline carts and queued sale items.

At table-order save, the server loads active products from the tenant's price master and validates the submitted proof before using the item snapshot. A valid signed snapshot preserves the price issued to that device, including a catalog price cached before going offline; owner/manager paths can authorize overrides and sign them. The offline sale sync processor rechecks new sale lines against the business catalog and accepts a valid signed cached price or an owner/manager-authorized price. Completed sale lines remain unchanged on idempotent retries.

This protects integrity of the issued price snapshot; it does not force already-cached devices to adopt a newer price while offline. Price proofs require the server secret to be configured and do not replace the need to refresh the catalog when connectivity is available.

### Table orders and KOT dispatch

The `/api/table-orders` route scopes reads to the authenticated business and branch. Its save operation allows users with the `waiter`, `manager`, or `owner` role; completion/cancellation is separately restricted to owner, manager, or cashier. The server validates prices before writing the table snapshot. The `20261006100129_add_hotel_integration_flag.sql` migration removes authenticated-client insert/update/delete grants and leaves table-order mutations to the service role used by the server route. Apply that migration before relying on the direct-write database block in a deployed environment.

The `20261006092213_hospitality_kot_and_room_folios.sql` migration adds branch/business-scoped KOT records and an insert/update trigger. The trigger aggregates quantities by product and creates tickets only for quantity increases compared with the previous saved order. A unique key on order revision and station prevents duplicate station tickets for the same revision. It classifies products as bar items when the category `group_type`, category name, or product name contains English bar/drink terms such as `Bar`, `Beverage`, `Beer`, `Coffee`, `Tea`, or `Water`; everything else goes to kitchen. Therefore, set the category `group_type` to `Bar` for reliable routing of Amharic-only product names. Without that setting, Amharic-only beverage names may be sent to kitchen. This remains a heuristic, not a per-product station selector.

The Kitchen page reads tickets through `/api/kitchen/tickets`, scopes them to the user's business and branch, and filters by station role. A station worker moves a ticket through `pending → preparing → ready`. On the ready transition, the server resolves that authenticated worker's active custody shift and records the worker and shift on each normalized KOT line. The transition is serialized by `transition_kot_ticket` so retries and competing updates do not attribute the same transition twice. The page listens to Supabase Realtime changes and refreshes every 10 seconds as a fallback. `/api/print/kot-queue` provides pending station tickets and accepts acknowledgements. It accepts the normal authenticated session or a Supabase bearer access token verified server-side; access is checked against the user's role and branch. Ensure Realtime publication and the KOT migrations are present in the target database.

The TypeScript table-order route creates `kitchen_order_ticket_lines` after the KOT trigger creates a ticket. Station routing is configured explicitly by category with a nullable product override; the one-time migration backfill preserves the previous English heuristic for existing menus. Existing tickets are backfilled without worker attribution and are deliberately excluded from custody sale allocation. Apply and review the station migration before using this configuration.

### Hotel integration and room charges

`businesses.is_hotel_integrated` defaults to `false`, so existing standalone outlets do not enable room settlement. The owner-facing business settings route reads and updates this flag. The payment selector only exposes room charge when the business flag is enabled and the active role set is exactly `cashier`. The POST endpoint independently enforces that same cashier-only condition and returns 403 when the business toggle is off.

Room lookup requires an online request and checks an active folio within the user's business and branch. After a sale sync, the server checks the business toggle and calls `post_room_charge_for_sale`. The database function verifies the completed sale, exactly one room-charge payment equal to the sale total, and an active folio. It inserts one immutable folio charge per sale and increments the folio balance in the same database transaction; the unique sale reference makes retries idempotent. Room charges cannot be combined with other positive tenders. These paths depend on the hospitality migration being applied.

### Shift close reports and delivery

`/api/shift-reports/close` authenticates owner, manager, or cashier access and scopes report sales, payments, expenses, and inventory to the authenticated business/branch and cashier's persisted shift. Sales, payment breakdowns, product totals, cost, profit, and low-stock rows are built from server-side records. The low-stock PDF data uses `product_name`, `current_stock`, and `minimum_threshold` and includes tracked active products at or below their configured alert level.

Delivery records are unique per business and shift. The route short-circuits sent/disabled reports and recent in-progress attempts, and claims pending/failed or stale sending rows with a conditional update before delivery. Per-recipient status rows prevent successful recipients from being needlessly resent when another recipient fails. Delivery may be disabled or queued independently of the shift close.

The close route reads opening cash from the persisted shift. The POS requires connectivity, attempts outbound sync before closing, and keeps the shift open if sales for that shift remain queued. A queued close/report remains retryable after a transient failure; staging must verify the cutoff and duplicate-close behavior.

### Inventory clerk boundary (current implementation)

`inventory_clerk` is the storekeeper/procurement role. Navigation and the current RLS migration grant inventory, purchase, supplier, stock movement, and stock reconciliation access; the sync route accepts inventory transactions for this role and rejects sale transaction sync when no sales-capable role is assigned.

Catalog writes are restricted to owners and managers by the later `20261006084459_restrict_pos_financial_ledger_writes.sql` RLS policies; the earlier migration is superseded. PostgreSQL grants are shared by all authenticated sessions, so the restriction is enforced by role-aware row policies rather than revoking the shared `authenticated` database role's table grants. Apply the migration before relying on the protection in production.

### Stock handover and custody verification

The inventory screen can issue stock to an active barman, kitchen worker, waiter, or cashier without requiring a monetary POS shift. The recipient confirms the quantity or records a dispute; only the selected recipient can resolve the pending handover. Issuance is tenant/branch scoped and uses a database row lock plus an idempotency key to reserve available stock. On acceptance, the TypeScript handover service opens or reuses the recipient's active `custody_shifts` record, conditionally accepts the voucher, and records its quantity in `custody_shift_inventory`. A unique handover key makes retries safe and allows the service to repair an interrupted ledger write. These custody windows are independent from cash shifts.

Acceptance opens or reuses the recipient's independent custody shift and records accepted quantities. Issuing/accepting stock does not decrement `inventory.quantity`; it reserves stock for custody while branch inventory remains the master quantity. A completed POS sale continues to decrement branch inventory and FIFO cost layers once. Separately, `allocate_ready_kot_lines_for_sale` allocates sale-line quantities against ready KOT lines and records the responsible custody shift in `kot_sale_allocations`. This is a custody sub-ledger, not a second branch inventory deduction. It locks the sale and candidate KOT lines so retries do not allocate a prepared quantity twice.

If an owner or manager corrects or cancels a table order after its KOT lines are ready, `commit_table_order_update` updates the order and records removed prepared quantities in `kot_wastage_allocations` in the same transaction. Waiters and cashiers cannot reduce or cancel outstanding ready quantities through the route. There is no separate manager passcode feature; the correction override is the authenticated owner/manager role.

The close report computes custody `expected_stock = accepted_float - allocated_sales - recorded_wastage`. It gets sold quantities from KOT sale allocations, not by assuming the cashier prepared them. Physical count and variance appear only when a count is available. Owner/manager close also closes active custody windows for the branch.

**Allocation limits:** only completed table sales with ready, worker-attributed KOT lines can be matched to a custody shift. Walk-in sales, lines without a ready KOT, and legacy tickets without attribution remain in branch/FIFO accounting and do not appear as allocated custody sales. Station routing remains a name-based heuristic. Prepared stock removed by an authorized table correction is recorded as wastage, but there is not yet a dedicated barman/chef spill-entry screen. This change has not been exercised against a staging Supabase database.

**Why a migration is required:** business authorization and request orchestration stay in TypeScript. The additive migration provides durable line/allocation tables and Postgres transaction functions for the state transitions, quantity matching, row locking, and atomic order-plus-wastage update. Keeping those writes in separate TypeScript requests would permit concurrent checkouts or retries to allocate the same KOT quantity twice. No remote Supabase project was changed; apply this one migration to staging, verify it, then deploy the application code. The new behavior cannot run until that migration is applied.

## Verification recorded for the KOT custody allocation implementation

- TypeScript check: **PASS** — `npx tsc --noEmit`.
- `git diff --check`: **PASS**. ESLint and production build were not run.
- The KOT allocation migration is present in the repository but has **not** been applied or verified against a remote/staging database. Database behavior is not yet end-to-end verified.

---

## Manual QA and demo plan

Use a dedicated staging/test business and test users. These checks describe the current POS, table-order, shift, inventory, reporting, and offline flows; they do not require new features. Do not treat a hidden navigation link as proof of authorization.

## 1. Test accounts

Create four separate users attached to the same business and branch:

- **Owner** — create the business through the existing onboarding flow, or use its existing owner account.
- **Manager** — use the existing staff invitation/management flow and assign Manager.
- **Cashier** — assign Cashier.
- **Waiter** — assign Waiter.

The source supports more than one assignment per user through `profile_roles` and the existing `RoleService`. The currently practical combinations to verify are **Waiter + Cashier** (most useful), **Waiter + Manager**, and **Waiter + Owner**. Set these through the existing authorized role-assignment mechanism; do not assume the staff invitation form itself supports multiple selections. The primary `profiles.role` and assigned roles are combined by the current role-aware source paths.

## 2. Minimum demo data

- One restaurant business and one active/main branch. Each test user needs the correct business and branch context.
- At least two active restaurant tables in that branch. Use the existing table setup; an Owner or Manager can create the existing default tables if none are configured.
- One active menu category and two active products with names and prices.
- At least one menu product with inventory tracking and a positive opening stock quantity. Use the existing inventory screen to establish the stock record for that product. Keep enough stock for the planned test sales.
- The four users above. Use a second business/branch and a second owner account only for tenant-isolation tests.

## 3. Owner test

1. Sign in as Owner and confirm the existing business dashboard loads.
2. Open Sales/POS. Enter an opening cash float and choose **Open Shift**.
3. Select a table, add a menu item, and save the order. Confirm the table is shown as active/occupied by its open order.
4. Complete a small POS sale using an existing payment method. Confirm the sale appears in the POS and its receipt/history.
5. Open Inventory and confirm the tracked product quantity reflects the sale.
6. Open Reports and Shifts. Confirm the sale is included in the business summaries and shift information.
7. Open Management and Settings. Confirm the existing Owner business controls remain available.

Expected: Owner can reach existing business, sales, inventory, report, staff/management, shift, and settings workflows. Do not expect the Owner experience or its existing dashboard to be replaced by a staff dashboard.

## 4. Manager test

1. Sign in as Manager. Confirm navigation shows existing operations: Dashboard, Sales, Inventory, Reports, Management, and Shifts.
2. Open POS, enter opening cash, and open a shift.
3. Save a table order, then complete a separate sale through the existing POS.
4. Receive stock or record a stock count using the existing Inventory workflow.
5. Review Reports and Shifts. Confirm operational sales/stock information is available.
6. Open Management. Confirm staff/operational tools remain available while Owner-only business settings are hidden.
7. Attempt to save a business settings change through the existing settings UI/API. It should be denied for Manager.

Expected: operational tasks work; Manager cannot change Owner-only business settings.

## 5. Waiter test

1. Sign in as Waiter. Use **Tables & Orders** (or the existing Sales/POS link in the localized UI).
2. Select a table and add one or more menu items. Change quantities or remove an item if needed.
3. Use the existing **Save table order** action. This saves an open table order; the current workflow does not introduce a separate kitchen-send step.
4. Confirm the table is marked active and the saved items remain when switching away and returning to the table.
5. Add another item and save again. Confirm the existing open order updates.

Waiter-only should not have navigation for inventory, staff/management, reports, settings, or shifts, and should not be able to complete payment or close a shift. Verify those restrictions with direct route/API attempts as well; hiding a link is not authorization. A waiter may edit/save an open order before production marks its KOT lines ready. Once ready, the waiter cannot reduce or cancel those prepared quantities; an owner or manager must perform the correction, which records custody wastage. Completing/cancelling an ordinary shared table order remains restricted to Owner, Manager, or Cashier by the current API.

## 6. Cashier test

1. Sign in as Cashier and open Sales/POS.
2. Enter opening cash and select **Open Shift**. Confirm the active shift is for this cashier.
3. If using the Waiter test order, select that table and check the open bill. Otherwise add menu items to a new bill.
4. Confirm the displayed total matches the item quantities and prices.
5. Record a payment using one or more existing methods: Cash, Telebirr, CBE Birr, Awash Bank, Bank transfer, or Credit. No payment gateway is involved. Credit is recorded with pending payment status by the current local sale logic.
6. Confirm the POS reports the sale saved and the bill/cart clears after completion. Confirm the receipt/history contains the sale and payment method(s).
7. Use the POS **Close shift** action. Enter actual cash counted in the drawer (or leave blank if it was not counted) and confirm.
8. Review the closed shift/report. Expected cash is opening cash plus completed cash payments; the difference is actual counted cash minus expected cash. Non-cash methods do not add to expected drawer cash.

Expected: the cashier can work with their own shift and the existing payment/close-shift flow. Do not use `/shifts/close` as an alternate close implementation; the demo close is POS → Close shift dialog.

## 7. Inventory test

1. Before a sale, note the on-hand quantity of the tracked test product in Inventory.
2. Sell a known quantity through POS, then verify on-hand stock decreases by that quantity locally.
3. When online, allow sync to finish and refresh Inventory. Verify the server-backed quantity agrees.

4. Select an active barman, kitchen worker, waiter, or cashier and issue a test quantity from Inventory without opening a POS cash shift. Confirm acceptance creates one custody shift/ledger entry; retry and check that neither duplicates. Confirm a dispute retains its reason.
5. As a waiter, save a table order. As the station worker, move its KOT through Preparing to Ready. Complete the table sale as a cashier, then retry sync; confirm branch inventory/FIFO is deducted once and custody allocation is recorded once.
6. As a waiter or cashier, try to remove/reduce a ready item; the API should reject it. As an owner/manager, correct the order and confirm removed prepared stock is recorded as wastage. Close the branch report and verify allocated sales, wastage, expected stock, actual count, and variance. Walk-in, unready, and legacy ticket sales should not be attributed to a custodian.

The current local sale code deducts stock for a matching local inventory record, permits negative quantities, and warns when stock is insufficient. A missing local inventory record means local stock is not deducted; do not interpret that as a successful inventory integration. The current check validates direct product inventory mapping; it does not test recipes or ingredient consumption.

## 8. Dashboard and reports

After several completed sales, sign in as Owner and Manager and check the existing dashboard/reports for:

- Sales totals and transaction counts for the selected date range.
- Payment-method totals consistent with the payments recorded on receipts.
- Inventory/low-stock values consistent with the test stock changes.
- Shift sales, expected cash, actual cash, and difference consistent with the close-shift test.

The full business dashboard is the Owner/Manager view. Cashier and Waiter retain the existing compact operational dashboard; do not expect new staff-specific financial metrics.

## 9. Role and tenant security

Run these checks with test accounts and test data only:

- **Waiter-only:** payment completion and shift open/close attempts are rejected; management, settings, inventory management, and report navigation are absent. Try direct URLs/API actions to verify the server/database boundary, not only the navigation.
- **Cashier:** own sales/payment/shift flow works; Owner-only business settings and staff administration are denied.
- **Manager:** operational sales, inventory, shifts, reports, and allowed management work; Owner-only business settings are denied.
- **Owner:** existing Owner controls remain available.
- **Combined roles:** repeat relevant checks with Waiter + Cashier, Waiter + Manager, and Waiter + Owner. The authorized role should retain its permitted actions; Waiter should not override it.
- **Tenant isolation:** create distinct products/tables and at least one order/sale for Businesses A and B. Sign in to A and confirm B's products, tables, orders, sales, inventory, staff, shifts, and reports are not returned. Try known B identifiers through existing pages/API requests and expect denial or no result. Repeat from B against A.

The repository contains a prepared RLS migration, but a source review cannot prove deployed database policies. Do not mark database/tenant isolation PASS until the intended migration is manually applied to a non-production QA database and these checks pass there. This plan does not apply it.

## 10. Offline test

Use the same installed PWA/browser profile and device throughout:

1. While online, sign in, open POS, wait for the catalog/tables to load, and open a shift if testing a paid sale. Confirm a tracked product is available locally.
2. Disconnect Wi-Fi/mobile data. Confirm the app stays open and the non-blocking offline status appears.
3. As Waiter, select a cached table, add items, and save the order. Confirm the saved order/table status remains after navigating away and back.
4. If testing a sale, use the active locally available shift, complete a sale, and confirm the local success receipt/history appears. Confirm the local stock count changes.
5. Reconnect. Wait for the online status and automatic sync (online event or periodic retry), then refresh the relevant view.
6. Confirm the order/sale appears once in the shared online view and the local queue clears or shows synced status. Trigger/allow another retry and confirm no duplicate order, sale, payment, or inventory movement appears.
7. Separately refresh the POS route while offline and record whether this device has a cached route response. A first visit while offline is not equivalent to this preloaded-route test.

Failure: a blocking Offline page prevents an already loaded workflow; an order/sale disappears locally; sync never resumes after reconnect; payment or stock is lost; or a retry creates duplicate records. If only offline refresh fails while the already-loaded POS continues working, record that as a route-cache limitation and do not claim offline refresh support.

## 11. Acceptance checklist

- [ ] **PASS** — Owner dashboard and Owner business controls still work.
- [ ] **PASS** — Manager can perform existing operational work but cannot change Owner-only business settings.
- [ ] **PASS** — Waiter can save/update table orders and cannot complete payment or close a shift.
- [ ] **PASS** — Cashier can record existing payment methods and close their shift through the POS dialog.
- [ ] **PASS** — Totals, inventory deduction, expected cash, actual cash, and discrepancy match the test data.
- [ ] **PASS** — Combined roles preserve their authorized capabilities without Waiter overriding them.
- [ ] **PASS** — Tenant A cannot access Tenant B's records, and vice versa, including by direct API requests.
- [ ] **PASS** — Offline queue preserves work and reconnect sync produces exactly one server record per action, including after retry.
- [ ] **FAIL** — A role can perform a restricted action by direct route/API, data crosses tenants, a record is lost/duplicated, or required POS work fails after a normal offline setup.
- [ ] **NOT BLOCKING** — Telegram shift-report delivery is disabled or queued while the shift itself closes successfully.
- [ ] **NOT BLOCKING** — Offline refresh of a route not previously cached fails, provided the already-loaded POS and its local workflows remain usable; record the limitation.
- [ ] **NOT BLOCKING** — Unrelated lint/test-tooling failures that do not prevent these manual MVP workflows.

## Demo sequence

1. Owner opens the dashboard and reviews Sales, Inventory, Reports, Staff/Management, Shifts, and business controls.
2. Manager opens/uses a shift, checks operational inventory, and reviews reports; show Owner-only settings are unavailable.
3. Waiter selects a table, adds menu items, saves the order, and confirms the table remains active.
4. Cashier opens their shift, opens the table bill, records payment, completes the sale, counts actual cash, and closes through the POS dialog.
5. Owner/Manager review sales, payment totals, stock change, and shift reconciliation.
6. Repeat a small order or sale offline after loading POS online, reconnect, and verify successful single-record sync.

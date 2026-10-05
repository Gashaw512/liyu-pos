# Liyu POS Restaurant/Bar Manual QA and Demo Plan

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

Waiter-only should not have navigation for inventory, staff/management, reports, settings, or shifts, and should not be able to complete payment or close a shift. Verify those restrictions with direct route/API attempts as well; hiding a link is not authorization. Waiter may edit/save an open order through the permitted workflow, but completing or cancelling the shared table order is restricted to Owner, Manager, or Cashier by the current API.

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

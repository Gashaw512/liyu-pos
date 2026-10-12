# Liyu POS Release Readiness Audit

**Audit date:** 9 October 2026  
**Scope:** Read-only review of repository source, checked-in migrations, existing tests, and the five business strategy documents. This is not a penetration test, staging certification, legal opinion, or customer validation. No application/database/business-plan files were changed.

## Executive assessment

Liyu is a substantial hospitality POS/PWA candidate: source includes product and category configuration, role-aware operations, sales, table orders, configured Kitchen/Bar tickets, inventory movements/FIFO, shifts, expenses, custody, reports, and an IndexedDB offline queue. It is not yet evidence-backed for an unsupervised commercial launch. The primary release gap is missing deployed-environment evidence for financial atomicity, RLS/tenant boundaries, retry behavior, offline recovery, and database migrations. A second immediate issue is public product copy that promises “100%” offline operation and exact profit/real-time results beyond verified evidence. SaaS plans are marketing copy without server-enforced subscription billing.

### Evidence labels

- **Observed in source:** A code path, schema declaration, migration, or test exists in the checked-out repository.
- **Automated-test verified:** An existing test was executed successfully in this audit.
- **Environment unverified:** Requires deployed Supabase, actual browser/device, operational account, provider, or external evidence.
- **Business hypothesis:** A proposed customer, price, channel, or financial assumption without observed sales evidence.

## Product and implementation map

| Capability | Source evidence | Current assessment | Critical external dependency / evidence gap |
|---|---|---|---|
| Web/PWA and localization | `package.json`; `src/app`, `src/messages`, `next.config.ts` | Implemented web application with English/Amharic message support; not a native app | Production hosting, device/browser matrix, translation completeness |
| Authentication/recovery | `src/lib/supabase/*`; `src/app/[locale]/(auth)/login/page.tsx`; `src/app/api/auth/*`; `tests/password-recovery.test.mjs` | Supabase-backed login/session and recovery flows present; recovery helper tests pass | Supabase Auth configuration, email/SMS delivery, expiry/logout/session tests |
| Roles/business/branch | `src/lib/auth/*`; `src/app/api/*`; `supabase/migrations/*role*`, RLS migrations | Role-aware source filters and RLS policies exist; assigned roles can be combined | Policies are not proven deployed; no two-business/two-branch direct-ID staging test |
| Products/categories/prices | management pages; `src/app/api/products/templates/route.ts`; `src/lib/security/price-proof.ts` | Server-issued signed price snapshots and catalog paths present | Secret configuration/rotation and deployed behavior not verified |
| POS sales/payment recording | `src/app/[locale]/(app)/sales/page.tsx`; `src/lib/offline/saleService.ts`; `src/lib/sales/authoritative-sale.ts`; `src/app/api/sync/route.ts` | Local tender recording, server amount derivation, sale-ID commit path in source; automated unit coverage for amount/tender rules | Real transaction/FIFO/retry/concurrency behavior depends on deployed SQL and database |
| Inventory/receiving/adjustment | inventory page, sync API, inventory/FIFO migrations | Branch inventory, movement and FIFO concepts implemented; no recipe ingredient consumption found | Correctness under concurrency/retry and customer stock processes unverified |
| Custody/handover | `src/app/api/inventory/handover/*`; custody service and migrations | Issue/accept/reconcile sub-ledger present; issue is intended as custody accountability rather than sale deduction | Integrated receive→issue→sale→return/wastage quantitative check not staged; reconciliation limits remain |
| Table orders/KOT/Kitchen/Bar | `src/app/api/table-orders/route.ts`; `src/app/api/kitchen/tickets/route.ts`; KOT migrations; kitchen page | Order save, station routing and ticket transitions are represented in source; notifications have focused unit tests | Trigger/RPC/Realtime publication and multi-device behavior require migrated staging |
| Shift close/reports/expenses | shift APIs, reports pages and PDF/delivery helpers | Server report and cash-reconciliation helpers exist; automated PDF/calculation tests pass | Database numbers, operating-day boundaries, taxes and external Telegram delivery unverified |
| Credit | credit fields, `src/app/api/credits/settle/route.ts`, `credit_settlements`, sale/credit migration | Debtor and settlement primitives exist; automated calculations/settlement migration source present | User-facing end-to-end collection/adjustment/refund workflow is incomplete or not verified; do not enable for pilot without restriction |
| Hotel folio | `/api/billing/charge-to-room`; `20261008121138_atomic_room_charge_sale.sql`; test `room-charge-atomicity.test.mjs` | Source migration wraps sale and folio posting in service-role-only transaction; static test verifies call path shape | Migration application, function ACL/RLS behavior, rollback and same-sale retry require staging |
| SaaS subscriptions | `src/app/page.tsx`, localized `Pricing.tsx`; plan enum/source strings | Public Free/ETB999 pricing is visible; no server billing or entitlement enforcement found | No recurring billing, subscription lifecycle, or plan-limits proof |
| Backup, export, deletion | searched application and migrations; no complete customer runbook located | No verified operator backup/restore drill, customer export, or closure/deletion procedure documented | Hosting/database backup configuration and recovery ownership unknown |
| Payment provider / fiscal integration | tender labels and settings | Manual tender recording only; no provider confirmation or fiscal certification found | Telebirr/CBE/bank settlement and Ethiopian tax/fiscal obligations require external integration/adviser verification |

## Findings

### F-01 — Public claims exceed the verified offline and reporting evidence

- **Severity:** High (customer trust / operational reliance)
- **Evidence:** `src/app/[locale]/(puplic)/_components/Features.tsx` labels the product “100% Offline First”; `OfflineSection.tsx` says “100% Operational Even Without Internet”; `Footer.tsx` says “Works 100% offline”; `Pricing.tsx` promises “complete offline architectures” and “instant background engine updates.” Marketing sections also describe “exact net profit” and real-time profit (`Features.tsx`, `HowItWorks.tsx`). The business docs themselves say complete offline/device/database verification is outstanding.
- **Actual vs expected:** Source contains selected offline persistence and sync workflows, but not evidence that every route, browser restart, auth expiry, all payments, inventory, and report screens work offline. Profit output is only as reliable as source cost/tax data and deployed records. Copy should describe tested scope, not universal behavior.
- **Verification:** Read the listed components and compare against `src/lib/offline/db.ts`, `src/lib/offline/saleService.ts`, service-worker config and the offline test suite. To close, execute the release offline matrix on actual production build/browser devices and revise all claims to that evidence.
- **Business impact:** A venue may rely on unproven continuity or financial outputs during live service; a failure can cause lost sales and loss of trust.
- **Recommended fix:** Before marketing to paying businesses, replace universal offline/exact-profit statements with qualified, demonstrated claims and label screenshots/demo data.
- **Closure evidence:** Approved copy review, production-build Android and desktop offline tests, restart/reconnect tests, and reconciliation against server records.

### F-02 — Financial transaction correctness is not verified against a deployed database

- **Severity:** Critical (financial/data integrity evidence gap)
- **Evidence:** `src/app/api/sync/route.ts` derives sale totals from validated price snapshots and calls `commit_pos_sale`; `supabase/migrations/20261007071854_atomic_sale_checkout_and_credit_ledger.sql` defines an idempotent transaction for sale header, lines, payments and inventory/FIFO trigger effects. `tests/shift-report-pdf.test.mjs` checks amount derivation and tender rules; `tests/business-context-repair.test.mjs` checks some retry/context helpers. The migration is checked in; repository inspection cannot establish deployment or runtime behavior.
- **Actual vs expected:** Code intends one transaction, one inventory/FIFO effect and same-ID idempotency. No database-level successful sale, rollback, last-unit concurrency, ambiguous-response retry or duplicate-payment evidence was obtained in this audit.
- **Verification:** In isolated staging, compare sale, sale_items, payments, inventory_movements, FIFO allocations/layers, inventory balance, custody allocation and sync acknowledgement before/after normal sale, injected failure and same-ID retry. Include two concurrent devices selling final stock.
- **Business impact:** A mismatch can mean money collected without stock/report effect, duplicate deductions, or a sale shown as paid without an authoritative record.
- **Recommended fix:** Keep the current transaction design; establish a staging release gate and do not accept live customer sales until it passes.
- **Closure evidence:** Migration status, transaction rollback proof, exact before/after row counts and balances, retry and concurrent-sale test artifacts.

### F-03 — Cross-tenant and branch security is source-configured but deployment-unverified

- **Severity:** Critical (authorization/data confidentiality evidence gap)
- **Evidence:** APIs such as `src/app/api/table-orders/route.ts`, `src/app/api/credits/settle/route.ts`, and `src/app/api/kitchen/tickets/route.ts` apply authenticated business/branch/role filters. Numerous migrations enable RLS and define scoped policies. A static source review cannot prove live RLS, grants, functions, or policy interaction.
- **Actual vs expected:** Source intends isolation; deployed database denial of forged Business B/Branch B IDs has not been observed.
- **Verification:** Apply/reconcile migrations in dedicated staging. Use separate tenants and roles; attempt direct API and database reads/writes with known foreign IDs for sales, inventory, tables, KOT, reports, staff, custody, payments and folios.
- **Business impact:** Cross-business disclosure or mutation is unacceptable and could expose customer/staff/financial records.
- **Recommended fix:** No permission change based on this audit. Close with adversarial staging evidence; fix only reproduced defects.
- **Closure evidence:** Policy/grant/function privilege report plus positive and negative cross-tenant/branch tests for every data family.

### F-04 — Public subscription plans are not backed by billing or entitlement enforcement

- **Severity:** High (commercial promise / access-control mismatch)
- **Evidence:** `src/app/page.tsx` and `src/app/[locale]/(puplic)/_components/Pricing.tsx` show Free/Starter and ETB 999 Business/14-day trial copy. No subscription checkout, payment verification, subscription state machine or server entitlement enforcement was found in `src/app/api` or migrations; a future schema sketch in `supabase/migrations/README.md` is not implementation.
- **Actual vs expected:** A public price card exists; a customer cannot be assumed to purchase/renew/cancel a subscription or have server-enforced limits through this codebase.
- **Verification:** Search API routes and authorization for plan status/limits; before general sale, test subscription activation, expiry, failed renewal, cancellation, renewal and direct API bypass if billing is added.
- **Business impact:** Customer confusion, unsupported “trial” expectations, and inability to reliably enforce free/paid plans.
- **Recommended fix:** Sell a clearly documented manual supervised pilot with invoice/receipt/terms handled outside product, or label pricing as proposed and collect demo requests until entitlements exist.
- **Closure evidence:** End-to-end verified billing and server checks, or revised public offer plus written manual billing process.

### F-05 — Credit is not ready as a normal cashier workflow

- **Severity:** High (financial collection / customer balance risk)
- **Evidence:** `src/app/api/credits/settle/route.ts`, the atomic sale/credit migration, and `tests/shift-report-pdf.test.mjs` include debtor fields, ledger settlements, exact balance logic and idempotency key validation. The current Sales interface does not establish a complete cashier-friendly debtor lookup, collection, statement, correction/refund and audit workflow from the inspected source/docs.
- **Actual vs expected:** Core records and API exist; daily operation and recovery have not been proven end-to-end.
- **Verification:** Test credit sale with debtor identity, partial/full settlement, retry, overpayment rejection, correction/refund, role denials and report balance from the deployed database.
- **Business impact:** Uncollected or misattributed balances; owner cannot reliably answer who owes what or recover from a correction.
- **Recommended fix:** Disable/omit credit for initial pilot use until end-to-end settlement and audit are verified; allow only cash/manual recorded tenders.
- **Closure evidence:** Complete role-based user flow and direct database reconciliation tests including duplicate collection.

### F-06 — Recovery, data export and account closure procedures are not evidenced

- **Severity:** High (data-loss and customer-exit risk)
- **Evidence:** IndexedDB is implemented (`src/lib/offline/db.ts`) and app data is persisted locally, but no complete customer-facing export/account closure path or documented database restore drill was located in the inspected source/docs. Repository config does not prove provider backups.
- **Actual vs expected:** Local outbox persistence and migration files exist; backup frequency, point-in-time recovery, restore responsibility, retention and export completeness are unknown.
- **Verification:** Identify the actual hosting/Supabase plans and backup retention; perform isolated backup restore and customer data export/deletion rehearsal without production records.
- **Business impact:** Lost transaction history or inability to return business data after exit/incident.
- **Recommended fix:** Document backup owner/retention/restore RTO and define safe export/closure before onboarding paying venues.
- **Closure evidence:** Dated successful restore drill and sample export reconciliation; written retention/deletion process.

### F-07 — Pitch base-case customer count conflicts with funnel model

- **Severity:** Medium (planning credibility)
- **Evidence:** `PITCH_BRIEF.md` assumes 98 outlets at month 12. `REVENUE_MODEL.md` base case uses 80 leads × 45% booked × 80% held × 30% paid = 8.64 gross additions/month, 2% monthly churn, starting at zero. Applying its own formula gives about 93 month-12 outlets, not 98. No actual funnel or churn data was found.
- **Actual vs expected:** The documents correctly label assumptions, but the pitch figures do not match the detailed model.
- **Verification:** Recalculate using a shared spreadsheet/script and reconcile ARPA: 93 × ETB 900 = ETB 83,700 MRR; ARR run-rate = ETB 1,004,400. The pitch's 98 × ETB 900 gives 88,200 and 1,058,400.
- **Business impact:** Investor/customer materials overstate the base case and weaken financial credibility.
- **Recommended fix:** Align the pitch to the detailed 93-outlet model or explicitly document a different acquisition assumption. Existing business documents were not edited in this audit.
- **Closure evidence:** Formula cross-check and corrected future pitch/model versions.

### F-08 — ETB 999 is a hypothesis facing lower visible local/global alternatives

- **Severity:** Medium (willingness-to-pay risk)
- **Evidence:** Public Liyu page lists ETB 999/month; proposed model ranges from ETB499 to 7,500. Public Dhadhamo page checked 9 Oct 2026 lists Pro ETB500/month and a free tier; official Loyverse pricing checked the same date lists free POS/core functions and optional add-ons.
- **Actual vs expected:** Price exists in static marketing; there is no customer willingness-to-pay or retention evidence.
- **Verification:** Run qualified buyer interviews and paid conversion tests at explicit package/price points; compare the exact support and local workflows, not feature-name checklists.
- **Business impact:** Price may be too high relative to alternatives, or too low to cover setup/support; a free competitor anchors buyer expectations.
- **Recommended fix:** Test a paid pilot with a transparent fee and onboarding separately. Do not assert that ETB999 is validated.
- **Closure evidence:** At least 3–5 independent paid pilot decisions, objections, support hours, renewal intent, and realized price.

### F-09 — Market size, acquisition, retention and competitor differentiation remain hypotheses

- **Severity:** Medium (commercial execution risk)
- **Evidence:** `BUSINESS_PLAN.md`, `GOTOMARKET_PLAN.md`, `REVENUE_MODEL.md` and `PITCH_BRIEF.md` explicitly state no verified customers, revenue, partners or outlet counts. NBE digital payments figures and DataReportal connectivity figures are ecosystem context, not addressable venue counts or buyer intent.
- **Actual vs expected:** Addis independent hospitality is a plausible starting segment, not a validated segment. 80 monthly leads/30% close and 2% churn in base model have no observed cohort evidence.
- **Verification:** Conduct consented interviews, build a deduplicated venue map and track a real funnel for 30–60 days.
- **Business impact:** Time and cash may be spent on an overly broad or low-urgency segment/channel.
- **Recommended fix:** Treat 3–5 supervised venues as a learning cohort; no large ad spend or regional expansion before retention/support evidence.
- **Closure evidence:** Interview notes, qualified lead counts, paid conversion, activation, churn and support-minute cohort.

### F-10 — Digital tender entries are not provider-confirmed payments

- **Severity:** High if marketed as verified settlement; otherwise controlled operating limitation
- **Evidence:** POS methods and sale payments are recorded by app code; no Telebirr/CBE/bank provider callback or acquirer integration was located. `SOCIALMEDIACONTENT.md` correctly says these are manual tender claims.
- **Actual vs expected:** A completed app payment row represents staff-recorded tender; it does not prove money reached the business account.
- **Verification:** Reconcile sample tender logs to external provider/bank statements under a written pilot process. Do not transact real test payments during this audit.
- **Business impact:** False confidence in payment settlement and cash reconciliation.
- **Recommended fix:** Label wallet/bank methods “recorded” and reconcile daily; never say “verified” absent provider evidence.
- **Closure evidence:** UI copy review and documented daily statement comparison; provider integration tests only if an integration is later added.

## Workflow test matrix

Use isolated staging businesses, synthetic names/amounts, test devices and no real provider transactions. **Status in this audit:** source review plus automated tests noted above; no staging database or authenticated multi-device workflow was run.

| Area | Test cases | Expected evidence / status |
|---|---|---|
| A. Authentication/access | Login/logout; expired session; password recovery/recovery code; role-based allowed/denied routes; forged business/branch IDs; direct API denial | Existing recovery tests cover normalization/code helpers. Require staging Auth users and direct API/RLS assertions for actual login/session and tenant controls. |
| B. Orders/sales | Draft create/edit/remove; persisted unpaid cancellation; sent/preparing cancellation; KOT update; price/quantity/discount/tax/total tampering; double submit; response lost after commit; refresh/retry | Unit tests cover local calculations/cancellation helpers and server amount derivation. Require DB inspection proving one sale/payment/movement, valid state transition and audit outcome. |
| C. Payments | Cash; exact/change; split tenders; partial/credit; recorded Telebirr/CBE/bank; failed/ambiguous request; refund/correction; decimal rounding; shift close | Tests cover exact tender allocations, local payment states and cash calculation helper. No provider confirmation exists. Verify payment rows, status, refunds, cash report and no false settlement claim in staging. |
| D. Inventory | Receive; issue without branch deduction; sale deduction once; KOT no extra deduction; FIFO; duplicate sync; negative stock/insufficient stock; concurrent last item; return/wastage/count/adjustment | Custody unit tests cover sale allocation and shortfall logic. Require DB movement/layer/balance assertions for receive→issue→sell, retry, concurrency and adjustment actor/reason. Recipe/ingredient use is absent. |
| E. Credit | Debtor identity; unpaid status; outstanding; partial/full settle; retry same key; duplicate key; overpayment; cancellation/refund; wrong role/business | Helper tests cover local credit state and over-allocation; SQL/API exists. Recommend disabled for first pilot until real end-to-end collection and corrections pass. |
| F. Offline/sync | Preload; disconnect without refresh; table order; cash/manual tender/credit; receipt; local persistence/restart; auth expiry; reconnect; duplicate/ambiguous retry; conflict between devices; pending vs confirmed | Offline helper and local persistence tests exist. Require production build + Android/desktop browser tests. Do not claim all pages or cold-start offline. Room charge is online-only. |
| G. SaaS billing | Free/paid entitlement; trial; upgrade/downgrade; failed/expired/cancelled/renewed; direct API access after expiry; reconciliation/refund | Not implemented as server billing/entitlement in inspected code. Do not advertise automated plans; use a clearly disclosed manual pilot arrangement or waitlist. |
| H. Data/reliability | Secret exposure scan (without printing secrets); RLS/grants; input/IDOR; rate abuse; error redaction; backup/restore; export/delete; interrupted DB transaction; dependency/deploy review | Source has server auth/validation and service-role RPC patterns; no full backup/export/deletion or rate-limit process established. Review deployment owner settings and test restore/export in isolated environment. |

## Verification performed in this audit

- `npx tsc --noEmit`: **PASS** (exit 0, no output).
- Initial sandbox `npm test`: **could not run** because the Node test runner received `spawn EPERM` while creating workers. After approved escalation, `npm test`: **PASS, 49/49 tests**. Node emitted non-fatal `MODULE_TYPELESS_PACKAGE_JSON` warnings for TypeScript modules imported by tests.
- No production build, staging migration, live Supabase query, browser offline test, real payment or multi-device test was run in this audit.
- Existing `business_strategy/` documents and application files were not modified. Only the five new audit/planning documents are intended deliverables.

## Safe next verification procedure

1. Identify and confirm a dedicated staging Supabase project without guessing from local credentials; verify it is not production.
2. Apply/reconcile the checked-in migrations only after the staging target is explicitly confirmed and backed up.
3. Load synthetic businesses A/B and separate branches/users; record exact baseline rows/balances.
4. Run sale, payment, inventory, custody, KOT, credit-disabled and room-charge negative/positive/retry scenarios; inspect database rows and function grants.
5. Run production build on Android and desktop browsers: login online, preload, go offline without refresh, create supported sale/receipt/order, restart, reconnect, sync, verify one transaction and one movement.
6. Keep any first pilot supervised, narrow, and stopped on unexplained financial or inventory mismatch.

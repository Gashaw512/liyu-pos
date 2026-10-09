# Liyu POS Supervised Addis Ababa Pilot Plan

**Purpose:** Learn whether independent hospitality businesses will use and pay for Liyu while limiting operational exposure. This is a proposed plan, not evidence that pilots or customer relationships already exist.

## Pilot entry gate

Do not use live venue records or rely on Liyu as the only record until the **supervised pilot blockers** in `RELEASE_CHECKLIST.md` pass: staging migration/RLS review, one-sale/one-payment/one-inventory-effect transaction and retry tests, offline/restart/reconnect test on actual target devices, backup/restore rehearsal, support contact and exit/export process. Until then, do synthetic-data discovery demonstrations only.

## Customer qualification

Choose 3–5 independent venues in Addis Ababa, each with:

- One owner/operator who can make decisions and attend weekly reviews.
- One outlet/branch, limited initial catalog (for example 10–30 active products), and a simple cash/manual-tender workflow.
- A compatible Android phone/tablet or desktop browser that can be included in device testing.
- An existing paper/spreadsheet/POS method that remains available as a fallback.
- Willingness to use synthetic or carefully minimized test data first, reconcile daily, and report defects without asking for unsupported features.
- No requirement for fiscal certification, automated wallet settlement, recipe costing, hotel folios, credit collection, multi-branch consolidation, guaranteed 24/7 SLA, or unsupervised offline operation.

Do not qualify a business solely because the owner says the software sounds useful. Ask for a recent example, current workaround, frequency, cost, affected role, and decision process.

## Interview questions

1. Walk me through yesterday’s first sale to shift close. Where did a number have to be copied or checked twice?
2. Tell me about the last missing, duplicated or corrected order. What happened and who resolved it?
3. How do you receive stock, issue it to staff, count it, record waste/returns, and decide what remains?
4. What does the owner compare at close: POS total, cash drawer, bank/mobile-wallet statements, expenses, and physical count?
5. Which person decides whether to buy software, and what proof or approval do they need?
6. What device, browser, printer, network and power conditions apply during a normal busy shift?
7. What would make you stop using a new POS in the first week?
8. Which current system/data must be imported? What records may not leave the business?
9. At ETB499, ETB999 and ETB2,499 per outlet/month, what specific scope/support would you expect? Which price would you actually authorize this month, and what would block payment?
10. Would you pay a disclosed pilot/setup fee today for the limited scope? If not, what evidence would change that decision?

## Scope and duration

- **Duration:** four weeks, after the technical entry gate. One outlet per business; one participating branch.
- **Approved workflow:** configured catalog and tax setup; opening stock/count; shift opening; cash and staff-recorded manual tenders; simple completed sales; table order/KOT only after two-session staging pass; end-of-shift report; owner/manager daily reconciliation.
- **Inventory:** start with a witnessed, signed opening count for a small agreed SKU set. Receive and issue/accept custody only after the exact flow passes staging. Continue venue’s paper count in parallel. Explain that issue is custody accountability and sale is the branch-stock effect; do not use unverified custody summaries as the sole audit record.
- **Offline:** until actual device tests pass, internet interruption triggers the documented manual fallback, not a promise to continue solely in Liyu. If the gate passes, test only the approved offline sale/payment methods and reconcile every queued operation after reconnect. Room charge is excluded; credit is excluded until full cashier collection passes.
- **Not in scope:** live provider verification, fiscal certification, recipe/ingredient usage, automatic subscription billing, multi-branch consolidation, production hotel folios, unattended disaster recovery, or unlimited support.

## Proposed transparent fee and terms

**Suggested experiment:** ETB999 per outlet for the four-week supervised pilot, plus an optional one-time ETB1,000 setup/training fee if the founder’s setup work warrants it. These are hypotheses, not established rates. Offer a no-cost discovery demo with sample data; do not charge for an unvalidated operational service. If the safety entry gate has not passed, do not charge for a live-use pilot.

Before accepting payment, provide a short written agreement stating:

- Pilot dates, one outlet/branch, named users, supported workflows and excluded features.
- Fee, taxes/invoice treatment after professional advice, payment method, refund/early-stop terms, renewal is not automatic.
- Customer retains its parallel paper/business records; Liyu is not a fiscal or payment-provider confirmation service.
- Support window and contact, severity categories, response target (not guaranteed resolution), planned maintenance, and escalation path.
- Data ownership, minimum data collected, access controls, retention, backup/restore responsibility, incident notification, export format, and deletion/exit process.
- Consent for diagnostic logs and any observation/photography; no customer data is used in marketing without separate written consent.
- Stop conditions and authority to pause the pilot if money, stock, access control, or data consistency is uncertain.

Have local counsel/accounting advice review customer terms, privacy, tax/invoicing and data handling before recurring commercial use.

## Safe onboarding and data migration

1. Create/confirm a dedicated staging tenant first; never import production customer data into a developer or shared demo tenant.
2. Record a business-approved product list with names, unit, price, cost if needed, tax behavior, preparation station and active state. Have owner approve it.
3. Import only the minimum agreed catalog. Do not import customer phonebooks, historic receipts, debtors, or staff personal data unless necessary and contractually approved.
4. Compare product count and price totals from source spreadsheet to Liyu after import. Save a dated reconciliation record.
5. Record opening stock by witnessed physical count, owner/storekeeper sign-off, unit and timestamp. Do not infer opening quantities from old unsourced balances.
6. Create least-privilege roles and one named account per staff member. Test allowed/denied tasks with the account owner present.
7. Train with synthetic/demo transactions first; clear/reset only staging data, never perform a database reset on the live pilot tenant.
8. Rehearse backup/export and paper fallback before first live shift.

## Staff training

Deliver short role-specific sessions (15–30 minutes, repeated on the actual device):

- **Owner/manager:** review sales/shift report, exceptions, permissions, and escalation.
- **Cashier:** open shift, add item, review total, record supported tender, confirm local/server status, receipt, close shift, and paper fallback.
- **Waiter:** select table, save order once, interpret save/KOT status, avoid deleting already-preparing items without the agreed procedure.
- **Kitchen/bar:** read only routed queue, start/ready states, refresh/reconnect behavior, audio permission limits.
- **Inventory clerk:** receive, count, issue/accept distinction, custody evidence, and no assumption that handover itself is a sale.

Use a one-page local-language quick guide, visible status labels, and a practical “what to do if uncertain” contact. Ask each role to demonstrate the flow back without coaching.

## Daily reconciliation and support

At every close during the pilot, owner and founder/support operator compare:

1. Liyu completed sale count and total to receipt/order records.
2. Tender rows by method to cash count and external wallet/bank statements (manual tender is a recorded claim, not provider verified).
3. Opening float, cash sales, cash expenses/refunds where applicable, actual count and variance.
4. Opening stock + receiving − completed sales ± supported adjustment/return/wastage against physical count for the small pilot SKU set.
5. Issued/accepted custody, sold allocation, returned/wasted amounts and physically counted custody where the flow is verified.
6. Pending, failed, or syncing operations; after reconnect confirm each has one authoritative server record and one stock effect.

Record values in an owner-approved pilot log with business identifiers minimized. Never silently correct a mismatch; preserve the original evidence and investigate before continuing the affected workflow.

### Defect escalation

- **P0 (stop now):** duplicate/missing sale, payment, inventory movement, cross-tenant access, lost pending sale/receipt, unauthorized mutation. Stop affected feature, use paper backup, preserve timestamps/operation IDs, notify owner immediately, and do not attempt unapproved direct database edits.
- **P1 (pause workflow):** repeated failure of KOT/checkout/shift close, wrong total, unreconciled stock, unavailable recovery. Switch to paper workflow and contact support during stated hours.
- **P2:** nonfinancial usability issue with safe workaround. Log screen, role, device/browser, steps, approximate time and anonymized error code.

Support must not request passwords, tokens, or payment credentials. Do not send customer records through personal chat channels.

## Backup, recovery, exit and export

- Before pilot start, document actual database backup plan, responsible operator, retention, recovery point objective (RPO), recovery time objective (RTO), and a successful restore to an isolated project. Do not imply provider backup is configured until checked.
- Maintain venue’s parallel daily paper totals and opening/closing stock counts during the pilot.
- Define a documented CSV/JSON export of customer-owned business records and reconcile row counts/amount totals before pilot onboarding. If an export path is unavailable, the pilot does not start with live financial records.
- On exit, export agreed records, confirm delivery, revoke staff access, retain/delete data according to the written terms and applicable law, and provide deletion confirmation where required.

## Success metrics and stop conditions

### Success after four weeks

- At least 4 of 5 pilot businesses (or all if fewer are enrolled) complete 10 operating days with daily close reviewed.
- No unexplained duplicate/missing sale, payment, inventory movement, or cross-tenant access.
- At least 95% of supported orders/sales complete without founder intervention (track denominator and excluded cases; target is a proposed pilot threshold).
- All offline-queued operations, if offline gate is enabled, are reconciled to one server transaction after reconnect; no unresolved queue item remains at close.
- Median onboarding effort, support minutes/outlet/week, and owner time-to-close recorded.
- At least 3 independent owners choose a paid continuation at a disclosed price, or provide a specific priced objection that can be tested.

### Immediate stop conditions

Any financial/data integrity mismatch without a clear safe reconciliation; cross-tenant access; unauthorized role action; inability to recover pending work; repeated server-side sale rejection; lost receipt; uncertain payment status; no verified restore/export route; or an incident involving exposed secrets/personal data. Pause the affected feature or whole pilot and use the venue’s existing records until reviewed.

## Conversion to recurring service

At week four, review measured value, unresolved issues, support cost, and owner feedback. Offer a 1–2 month continuation at an explicit per-outlet fee only if the customer knowingly opts in. Do not auto-renew. Keep onboarding as a separately scoped fee. Move to recurring subscriptions only after server-enforced entitlements, reliable payment collection/invoicing, cancellation, expiry and support processes are implemented and tested.

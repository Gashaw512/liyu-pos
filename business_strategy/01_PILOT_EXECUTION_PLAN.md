# 01 — Liyu POS Pilot Execution Plan

**Purpose:** Validate Liyu with 2–3 Addis Ababa venues before adding features or spending on broad marketing. This plan condenses the existing [release audit](./RELEASEREADINESSAUDIT.md), [release checklist](./RELEASE_CHECKLIST.md), [business review](./BUSINESS_REVIEW.md), [pilot launch plan](./PILOTLAUNCHPLAN.md), [prioritized action plan](./PRIORITIZEDACTIONPLAN.md), and original strategy documents. It does not replace their evidence or imply staging/customer tests have passed.

## Evidence baseline

### Existing capabilities supported by source and automated tests

- **Automated-test verified:** TypeScript check passed; existing test suite passed 49/49 in the prior audit run. Tests cover local sales/payment calculations, signed price checks, tenant/branch binding in price proofs, custody accounting helpers, table-order cancellation helpers, KOT notification deduplication, and static room-charge RPC call-path checks. These do not prove deployed database behavior.
- **Observed in source:** Authenticated role-aware POS, products/categories, manual tender recording, table orders, configurable Kitchen/Bar/no-preparation routing, KOT/KDS, inventory and FIFO logic, stock receiving/adjustments, custody handovers, shifts, expenses, reports, IndexedDB persistence/outbox, server price/amount validation, and room-charge/credit primitives.
- **Not verified in live conditions:** The checked-in migrations and RLS are not evidence of deployment. No authenticated staging business flow, real browser offline sale/restart/reconnect, cross-tenant denial, provider payment, customer outcome, or multi-device pilot result is claimed here.

### Minimum functionality to consider for the pilot

After the gates below pass, keep the pilot to **one outlet per business, one branch, a small catalog, one owner/manager, and a few named staff accounts**. Candidate flow: receive/count stock → optionally issue/accept custody → cashier opens shift → cash or staff-recorded manual tender sale → receipt → close shift → owner compares report and physical records. Add table orders/KOT only after its station and two-session tests pass. Cash and manual Telebirr/CBE/bank entries are records made by staff, not provider-confirmed payments.

## Pilot release blockers only

Do not start live financial/stock reliance until all five pass:

1. **Database and transaction integrity:** confirm the isolated staging target and migrations; prove sale, payment, branch/FIFO inventory movement and retry are atomic/idempotent, including rollback and concurrent last-unit sale.
2. **Authorization/isolation:** prove business, branch and role denials with two synthetic businesses, separate branches, and direct API/known-ID attempts.
3. **Offline recovery:** on production build and representative Android plus desktop browsers, prove offline sale/receipt/outbox persistence through refresh/restart/reconnect and exactly one server transaction/effect. If this gate fails, do not run offline checkout in pilot; use the written manual fallback.
4. **Data recovery:** define who backs up data and how; successfully restore to an isolated environment and reconcile a customer export before importing live financial data.
5. **Honest scope and operating agreement:** correct unsupported public claims before customer acquisition; provide written limits, support contact, fallback, privacy/data export, stop and exit terms. No automated subscription claim; no credit until full collection workflow is verified.

Room charge, credit collection, fiscal certification, live payment-provider verification, recipes/ingredient consumption, multi-branch consolidation, and cold-start offline operation are excluded. They are not blockers to this narrow pilot.

## Staging verification procedure

Use only synthetic data and a project explicitly confirmed as non-production. Never reset or migrate an ambiguous/production database. Capture dated evidence (test IDs, relevant row counts/amounts, screenshots/logs); redact credentials and personal data.

| Step | Procedure | Pass | Fail / response |
|---:|---|---|---|
| 1 | Confirm project identity, backup, migration history, required tables/functions, grants, RLS and Realtime settings. | Target is documented as isolated staging; required migrations/functions exist; room-charge wrapper is service-role-only; no unexpected grant/policy gap. | Stop. Do not apply migration until target is confirmed. Resolve deployment/security mismatch. |
| 2 | Create synthetic Business A + two branches and Business B + one branch; create owner, manager, cashier, waiter, inventory clerk, kitchen and barman users. | Each account resolves to intended business/branch/roles. | Stop; correct test setup, not authorization policy. |
| 3 | Attempt direct API reads/writes using another business/branch’s known IDs for product, inventory, order, KOT, sale, report, custody and staff. Attempt an unauthorized role mutation. | All unauthorized access is denied or returns no foreign record; permitted actions succeed only in assigned scope. | **Fail/blocker:** preserve requests/response codes and inspect auth/RLS before proceeding. Do not weaken policies. |
| 4 | Receive 100 test units; issue/accept 20 into custody; verify branch balance and custody; sell 2; retry the exact same sale ID. Inspect inventory, movement, FIFO, payments, sale, custody allocation and sync records. | Receive: branch 100. Issue/accept: branch still 100, custody 20. Sale: branch 98, custody 18. Retry: still 98 and 18, with exactly one sale/payment/inventory effect. | **Fail/blocker:** stop financial pilot. Record actual values and operation IDs; do not repair data manually. |
| 5 | Tamper with unit price/proof, quantity, discount, subtotal, tax, total, business/branch ID and reused sale ID through a controlled request. | Invalid proof/scope/unauthorized discount is rejected; server derives totals; reused sale ID with changed transaction is rejected; original retry is idempotent. | **Fail/blocker:** do not use POS with live money until fixed and retested. |
| 6 | Force a failure during sale commit; submit duplicate request and simulate concurrent sale of the last unit using two sessions. | Failure leaves no partial sale/payment/inventory; duplicate retry yields one transaction; stock concurrency follows the documented policy with no negative/duplicate effect. | **Fail/blocker:** stop; inspect transactional rollback and concurrency guarantees. |
| 7 | Save mixed Kitchen/Bar/None order; start/ready tickets from correct roles; repeat transition and refresh/reconnect. | Only configured items route; wrong station role denied; repeated transition creates no duplicate ticket/movement; KOT adds no inventory deduction. | Pause table/KOT pilot feature; cash walk-in sale may be considered only if its own gates pass. |
| 8 | Verify shift open/close/report against persisted opening float, cash payment rows, supported cash expenses/refunds and actual count; test duplicate close. | Expected/actual/difference match independently calculated values; duplicate close does not duplicate report/delivery. | Pause shift/report reliance; use paper close and resolve. |
| 9 | Production-build browser test: login online, preload POS, disconnect without refresh, create approved cash sale and local receipt, restart browser, reconnect and retry sync. | UI remains usable; local receipt/pending operation survives restart; after reconnect exactly one sale/payment/movement is confirmed. | Offline checkout is excluded; continue online-only only if online transaction gates pass. Preserve logs and pending data. |
| 10 | Rehearse backup restore and export using synthetic staging records. | Restored dataset and exported sales/stock totals reconcile; responsible operator and recovery times are recorded. | Do not onboard live business financial data. |

Record pass/fail per case; “not run” is neither. Unit tests alone cannot pass a staging gate.

## Limited 2–3 venue pilot

- **Venue fit:** independent owner-operated cafe, bar/tej house, or small restaurant; one outlet; owner available daily; simple catalog; willing to keep existing paper records and report issues. Avoid venues requiring fiscal integration, 24/7 SLA, multi-branch consolidation, or credit/hotel charge.
- **Duration/fee:** four weeks after staging gates. Offer a clearly disclosed, manually collected pilot fee (proposed test: ETB999 per outlet for four weeks; optional ETB1,000 setup/training only if agreed). These are price experiments, not validated prices; no automatic renewal.
- **Terms:** written scope, exclusions, support window, data ownership/handling, privacy/consent, backup/export/exit, fee/refund, paper fallback, defect escalation, stop conditions. Do not promise uptime or provider settlement.
- **Daily controls:** opening count and shift float recorded by venue; daily owner compares sale count/totals, tender records, physical cash, supported expenses, stock movements, custody and pending sync. Investigate—not silently overwrite—any difference.
- **Safe fallback:** if uncertain, stop the affected Liyu workflow, write the order/sale/payment/count on the venue’s existing numbered paper record, retain the receipt/reference, and inform the owner/support contact. Enter/reconcile later only through an authorized, auditable process; never create a duplicate just to clear an offline queue.
- **Stop immediately:** unexplained duplicate/missing money or stock, cross-business data, unauthorized action, lost receipt/pending sale, failed recovery, or uncertainty whether a sale committed. Pause the affected feature and use paper records until reviewed.

## Onboarding checklists

### Founder/operator

- [ ] All staging blockers passed with saved evidence; production account/target separately confirmed.
- [ ] Written pilot agreement and privacy/data handling terms reviewed; no unsupported copy in demo or offer.
- [ ] Backup/restore/export and paper fallback rehearsed; support contact/hours and defect severity process published.
- [ ] Venue receives a dedicated business and least-privilege named users; credentials are never shared.
- [ ] Synthetic demo complete; venue catalog/station/tax and witnessed opening count approved by owner.
- [ ] Test receipt, shift close, tender reconciliation, pending sync, and end-of-day review with staff before first live shift.

### Each pilot venue

- [ ] Owner confirms users/roles, branch, product list, units, prices, tax setup and configured preparation station.
- [ ] Owner/storekeeper witnesses opening count and signs dated baseline.
- [ ] Staff complete role-specific practice: cashier, waiter, Kitchen/Bar and stockkeeper as applicable.
- [ ] Existing paper process and incident contact are available during every pilot shift.
- [ ] Owner knows manual wallet/bank tender is not provider verified, credit/room charge are excluded, and what “pending sync” means.
- [ ] Daily reconciliation and issue log owner assigned; customer consent for any observation/media obtained separately.

## Measures and decision rules

Targets below are proposed pilot thresholds, not current results.

| Dimension | Measure / success threshold for four weeks |
|---|---|
| Transaction accuracy | Every pilot day: Liyu sale count and total match receipt/independent record; zero unexplained duplicate/missing sale, payment, or inventory effect. Any mismatch triggers pause. |
| Reliability | 100% of supported queued operations reconciled to one server record after reconnection; zero lost receipt or unrecoverable pending item. Offline score is reported only if the offline gate passed. |
| Staff usability | At least 80% of participating staff can complete their primary task after training without step-by-step founder help by week two; record task completion and errors by role. |
| Business value | Each owner identifies at least one observed improvement (e.g., less duplicate entry, clearer close or faster order routing) and compares it with a baseline; do not claim savings without measured time/records. |
| Willingness to pay | At least 2 of 3 owners explicitly accept a disclosed recurring price/continuation offer and pay or sign a clear commitment; verbal “interest” is not conversion. |
| Support effort | Record onboarding hours and support minutes per outlet/week. Proposed target: by week four, under 60 minutes/week/outlet excluding planned review; revise price/scope if materially higher. |

## Daily pilot log template

```text
Date / venue code / branch:
Device + browser / app build:
Users/roles on shift (no passwords or sensitive data):
Connectivity: online / interrupted / offline test authorized
Opening shift float / independently recorded:
Opening stock baseline or changed quantities:
Sales: count + total in Liyu / count + total in independent record:
Tender totals by method (manual digital = recorded, not provider verified):
Cash count / expected cash / variance:
Stock received / issued / sold / returned / wasted / adjusted / physical count:
Orders/KOT: created / preparing / ready / cancelled; duplicates or delays:
Pending sync at start / end; operation IDs and final server confirmation:
Defects (steps, time, role, device, sanitized error; severity P0/P1/P2):
Fallback used and paper record references:
Owner/staff usability note; support minutes:
Reconciliation reviewed by / time / unresolved items:
Continue next shift? yes/no; reason and owner approval:
```

## Weekly review template

```text
Week / participating venues:
Shifts and days completed / planned:
Accuracy: mismatch count, duplicate count, unresolved amount/stock:
Reliability: offline tests run (if approved), queue retries, confirmed/lost items:
Staff task completion by role; training/support hours:
Owner-observed value and baseline comparison:
Price offered / accepted / rejected / reason / cash collected:
Support minutes per outlet and main causes:
P0/P1/P2 defects, decisions and owners:
Scope changes requested (do not add during pilot without review):
Decision: continue / revise scope / pause; evidence and approver:
Next week actions, due date, completion evidence:
```

## Continue, revise, or pause

- **Continue:** all release gates remain passed, no stop condition occurred, reconciliation is complete, staff can perform core tasks, and venue owner opts in for the next week.
- **Revise:** accuracy/security remain intact but usability or support targets miss; narrow the workflow, retrain, or adjust the offer. Do not add features mid-pilot to disguise workflow friction.
- **Pause:** any critical mismatch, isolation/authorization concern, failed backup/recovery, lost/ambiguous transaction, or owner withdraws consent. Use existing paper operations until root cause is understood and the specific gate is repeated successfully.
- **Convert after week four:** offer a separately agreed paid continuation only after a written value review. No auto-renewal; subscription billing/entitlement is not evidenced in the product.

## Next ten actions, in order

| # | Action class | Action | Dependency | Completion evidence |
|---:|---|---|---|---|
| 1 | Configuration or deployment | Identify and document a dedicated staging Supabase project; verify it is not production and establish a safe backup. | Project owner access | Written target identity and isolated backup record. |
| 2 | Testing and verification | Reconcile applied staging migrations, tables, functions, grants, RLS and Realtime settings against checked-in files. | #1 | Dated schema/migration/ACL checklist. |
| 3 | Testing and verification | Run two-business/two-branch direct API and role-denial matrix. | #1–2 | All expected denials and allowed cases recorded, no cross-tenant result. |
| 4 | Testing and verification | Run receive 100 → issue/accept 20 → sell 2 → retry same sale; inspect DB balances, payments, FIFO and custody. | #1–2, synthetic product | Observed `100 → 100 → 98`, custody `20 → 18`, retry unchanged, one transaction/effect. |
| 5 | Testing and verification | Run tampered totals/proofs, failed transaction rollback, duplicate request, double-click and concurrent final-unit tests. | #4 | Rejection/rollback/idempotency evidence with database row counts. |
| 6 | Testing and verification | Run KOT Kitchen/Bar/None routing and state transition tests from separate role sessions; ensure no KOT stock deduction. | #1–3 | Correct station visibility/state, no duplicate ticket or stock movement. |
| 7 | Testing and verification | Run production-build Android + desktop offline sale, local receipt, restart and reconnect sync. | #4–5 and test devices | Queue survives; exactly one database sale/payment/inventory effect. If not, offline checkout stays excluded. |
| 8 | Configuration or deployment | Rehearse restore/export/exit and assign operational support owner, hours and recovery process. | #1 | Restore and export reconcile; written RPO/RTO, contacts and exit procedure. |
| 9 | Documentation or marketing correction | Correct or qualify broad offline/profit/theft claims; align sales/demo copy and disclosed pilot limits. | Actual test results #3–8 | Copy reviewed and every factual claim linked to evidence. |
| 10 | Testing and verification | Onboard first 2–3 qualified venues and run daily reconciliation under signed limited pilot terms. | #1–9 | Completed daily logs, zero unexplained transaction/stock mismatch, weekly review and paid continuation decisions. |

Actions 1–9 are release controls/testing; **no new feature development is proposed**. If a test reproduces a defect, classify its narrowly scoped correction as **Defect fix**. If it reproduces an authorization, tenant-isolation, transaction, or data-integrity weakness, classify it as **Security or data-integrity fix**. Add a regression test and rerun the failed gate before pilot. Do not add features to work around failed evidence.

## Three decisions

1. **What can be demonstrated now:** a source-backed walkthrough using clearly labeled synthetic data for POS/tender recording, product/inventory screens, custody concepts, table orders, configured Kitchen/Bar routing, shift reports, and bilingual interface elements. Existing automated tests provide helper-level evidence, not live deployment proof.
2. **What must be verified or fixed before live pilot use:** staging migrations/RLS/function permissions; end-to-end sale/payment/FIFO/inventory/custody atomicity and retries; cross-tenant/role denials; production-build offline/restart/reconnect behavior if offline checkout is offered; backup/restore/export; and customer terms/support. Fix only reproduced defects. Until then, run discovery demos only or a paper-backed, restricted supervised trial that does not rely on Liyu as the financial record.
3. **What can wait until feedback from the first 2–3 customers:** subscription automation and plan gates, credit collection, hotel folios, live payment-provider integration, recipe costing, regional expansion, broad paid marketing, new feature roadmap and UI redesign. Do not invest in these before the pilot establishes workflow fit, safety, paid intent and support cost.

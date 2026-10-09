# Liyu POS Prioritized Action Plan

**Ordered for risk reduction before growth.** Costs are relative cash estimates for planning, not vendor quotes. “Evidence” is an objective artifact required to mark complete. Actions 1–7 are release controls; 8–10 are business experiments and should not displace the blockers.

| Rank | Action | Risk reduction | Commercial impact | Urgency | Estimated cost | Dependencies | Objective completion evidence |
|---:|---|---|---|---|---|---|---|
| 1 | Confirm a dedicated non-production Supabase staging target; reconcile every checked-in migration and function/grant required by POS, custody, KOT, credit and room charge. Do not guess based on local credentials. | Very high | Enables trustworthy pilot validation | Immediate | Low–medium founder/engineering time; hosting separate | Staging ownership and access confirmed; isolated backup before changes | Dated migration status, schema/function/ACL inventory and no production writes |
| 2 | Verify sale completion boundary: price proof → server totals → sale/items/payments → FIFO/branch movement → receipt/outbox acknowledgement; force transaction failures and retry same sale ID. | Very high | Protects money and stock; required to earn trust | Immediate | Medium engineering/QA time | Action 1, synthetic products | Staging row-level evidence for success, rollback, ambiguous response retry, double-click and concurrent last-stock case; one sale/payment/movement |
| 3 | Verify RLS and business/branch authorization with two synthetic tenants, multiple branches and all key roles; include known foreign IDs and direct APIs. | Very high | Required before any customer data | Immediate | Medium engineering/QA time | Action 1, role fixtures | Positive/negative test report for sales, inventory, orders, KOT, expenses, staff, reports, custody, credit and folios; no policy weakening |
| 4 | Validate device offline lifecycle with production build on representative Android and desktop: preload, disconnect without refresh, sale/order/receipt, restart, reconnect and retry. | Very high | Core product promise; avoids lost/duplicate records | Before pilot | Medium: devices, data and QA time | Actions 1–2; test accounts | Screen recording/log plus DB reconciliation showing pending persists and reconnect results in exactly one transaction and stock effect |
| 5 | Establish a backup/restore, export and exit process; rehearse restore to isolated project and reconcile a customer data export. | Very high | Prevents catastrophic data loss and customer lock-in | Before pilot | Low–medium; actual cloud backup cost unknown | Staging and chosen hosting plan | Dated successful restore, measured RPO/RTO, verified export totals, written deletion/access-revocation steps |
| 6 | Limit pilot feature scope: disable credit, room charge, unverified provider claims, multi-branch promises and unsupervised offline until their separate tests pass. | High | Reduces failure surface and customer dispute risk | Before first live pilot | Low | Product configuration and pilot terms | Signed pilot scope; role test confirms excluded functionality unavailable or clearly not offered; fallback documented |
| 7 | Correct public copy and align all sales materials with evidence; remove/qualify “100% offline,” exact-profit, theft-detection and automated-trial claims; reconcile pitch 98 vs model 93. | High trust/compliance impact | Prevents overpromising; improves sales credibility | Before public acquisition | Low | Audit findings accepted | Reviewed public copy, all numeric claims trace to formula/source, screenshots labelled sample where applicable |
| 8 | Run 15–20 owner/operator interviews across 2 Addis neighborhoods; map actual daily workflow, pain frequency, decision process and current alternative. | Medium | Validates urgency and segment | Start now (discovery only) | Low cash, founder time | Interview guide and consent/privacy practice | Anonymized notes with segment, observed workaround, recent example, price objection; no fabricated statistics |
| 9 | Test a paid, manual, four-week pilot offer with 3–5 qualified businesses after actions 1–7; test ETB499/999 scopes and setup fee separately. | Medium | Validates willingness to pay and onboarding burden | After release gates | Low–medium founder travel/support | Interview findings, pilot terms, daily reconciliation | Collected pilot fees, offer/accept/reject reasons, onboarding/support hours, week-4 continuation decisions |
| 10 | Measure real operating economics and channels before scaling: support minutes, active days, close/reconciliation, conversion, churn, founder hours, hosting invoices and CAC. | Medium | Determines sustainable price and repeatable acquisition | During and after pilots | Low incremental | Action 9; consented usage records | Cohort sheet with formulas, actual invoices/costs, founder-time valuation and source-attributed leads; updated scenario model |

## Release blockers vs business experiments

### Release blockers

1. Staging migration/RPC/grant verification (Action 1).
2. Atomic sale/payment/inventory, rollback, idempotency and concurrency proof (Action 2).
3. Tenant, branch and role security verification (Action 3).
4. Real browser offline/restart/reconnect proof (Action 4).
5. Restore/export/exit procedure (Action 5).
6. Honest feature scope and public product claims (Actions 6–7).

Close these before a venue relies on Liyu as its only financial or stock record. Where a gate is not passed, use sample-data discovery or a restricted supervised pilot with paper records, per `PILOTLAUNCHPLAN.md`.

### Business experiments

- Interview prospective owners/staff and observe an ordinary close with permission (Action 8).
- Ask for paid pilot commitment at clear price/scope, not hypothetical willingness (Action 9).
- Measure support and acquisition economics before increasing spend or expanding cities (Action 10).

## Suggested sequencing

**Week 1:** confirm staging and data safety; migration/ACL inventory; write and execute test scripts with synthetic data.  
**Week 2:** sale atomicity/retry/concurrency and RLS/tenant tests; remediate only reproduced defects.  
**Week 3:** production-build Android/desktop offline and recovery tests; restore/export rehearsal; approve restricted pilot terms.  
**Week 4 onward:** run controlled pilots, daily reconciliations and user interviews; decide continuation based on safety, paid conversion and support burden. These are scheduling targets, not promised completion times.

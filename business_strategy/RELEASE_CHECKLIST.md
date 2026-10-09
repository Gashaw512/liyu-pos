# Liyu POS Release Checklist

**Evidence date:** 9 October 2026. “READY” is only for the stated narrow use case and only where evidence is available. A successful build or unit test does not certify the deployed product.

## 1. Internal testing readiness

| Classification | Item | Evidence / closure condition |
|---|---|---|
| READY | Source-level sale amount calculator and price-proof helper tests | `tests/shift-report-pdf.test.mjs` covers signed tenant/branch/product/price, authoritative amount calculation, tax/discount authorization, and tender allocation. These are helper/unit tests, not database integration. |
| READY | Local custody and table-order helper tests | `tests/custody-stock.test.mjs` and `tests/table-order-cancel.test.mjs` pass, including KOT not being counted as a second seller sale and sale shortfall being represented. |
| READY | Kitchen notification deduplication helper tests | `tests/kitchen-notifications.test.mjs` pass for initial load, refresh duplicate, and new revision. Browser audio is not thereby verified. |
| READY | Static TypeScript check | `npx tsc --noEmit` passed on 9 Oct 2026. |
| CONDITIONAL | Full test suite | `npm test` passed 49/49 after sandbox worker spawning was approved; non-fatal module-type warnings remain. Keep this as a repeatable CI check. |
| BLOCKED | Public reliability claims | Landing copy includes “100% offline,” “exact net profit,” and similar broad claims. Revise or substantiate before external launch; see F-01. |
| BLOCKED | SaaS plan enforcement | Public Free/ETB999 plans do not correspond to a verified billing or server entitlement lifecycle; do not sell them as automated subscriptions. |

## 2. Supervised pilot readiness

### BLOCKED — required before relying on Liyu for a live venue ledger

| Blocker | Why blocked | Evidence required to close |
|---|---|---|
| Deployed sale/payment/inventory atomicity and retry | Source SQL and unit tests do not prove the actual database is migrated or that runtime trigger/RPC behavior matches expectations. | Dedicated staging proof of sale + payment + FIFO/branch movement, injected rollback, same-ID retry, duplicate click and concurrent final-stock sale. Inspect rows and balances. |
| Tenant and branch isolation | Source filters and RLS migrations exist, but deployment and direct foreign-ID denial have not been verified. | Test users in two synthetic businesses/branches; direct API/database read/write attempts for products, inventory, orders, sales, payments, KOT, reports, staff, custody and folios. |
| Offline sale/restart/reconnect | Existing IndexedDB/outbox supports offline design; no browser-level offline financial lifecycle was executed for this audit. | Production build on representative Android and desktop: offline checkout/receipt, restart persistence, reconnect retry, exactly one server sale/payment/inventory movement. |
| Actual staging migration/function privileges | Migration files are not proof of migration application. | Confirm exact non-production target, migration history, function definitions and grants (especially service-only room-charge wrapper); run positive/negative calls. |
| Recovery plan | Backup configuration, restore ownership, data export and closure path not established in repository evidence. | Written owner, retention, RPO/RTO and customer export/exit process; successful isolated restore and export reconciliation. |
| Payment semantics / credit policy | Manual digital tenders are not provider-confirmed; credit workflow is not proven as a complete cashier collection/correction path. | Pilot terms/UI state manual tenders honestly. Disable credit until debtor, settlement, refund/correction and retry tests pass. |

### CONDITIONAL — may be used only within approved, supervised limits

| Item | Pilot restriction | Required test / evidence |
|---|---|---|
| Cash and staff-recorded manual tenders | Customer’s existing written cash/payment records remain authoritative; do not claim provider verification. | Confirm each day’s local sale/tender totals against server records and cash/bank/mobile-wallet statements. |
| Table order/KOT and station routing | Use one branch and known products with explicit Kitchen/Bar/None configuration. Keep a paper backup ticket process. | Two authenticated sessions; save, route, prepare, ready, refresh/reconnect, verify no duplicate ticket or missed order. |
| Inventory receive/issue/sale/count | Start with a small controlled SKU set and a witnessed opening count. Issue records custody; sale is the branch deduction. | Daily sample reconciliation of receive, movements, branch balance, custody and sale; halt on unexplained mismatch. |
| Shift close and reports | Owner/manager reviews system report against a handwritten/independent close record. | Compare opening float, completed cash tenders, cash expense/refund treatment, actual count and difference. |
| Telegram delivery | Delivery is an external notification only, not the financial close source. | Verify configured recipient, delivery and retry; close shift independently of Telegram status. |

### READY items for a limited supervised pilot (not a whole-system rating)

- Discovery interviews, sample-data demos, staff usability observation, and willingness-to-pay experiments that do not rely on production records or promise unverified reliability.
- Existing automated helper tests and TypeScript check may be used as engineering evidence, not as deployment certification.
- A manual pilot fee can be invoiced under written terms outside the application; this is not application subscription billing.

## 3. General commercial launch readiness

| Classification | General-launch condition |
|---|---|
| BLOCKED | No deployed evidence for atomic financial lifecycle, RLS isolation, device offline recovery, backup/restore, or operational support. Close all supervised-pilot blockers with repeatable evidence first. |
| BLOCKED | Public plans/pricing lack entitlement/billing enforcement and the pitch base-case outlet count does not reconcile with the revenue model. Reconcile offer and financial materials. |
| BLOCKED | Local tax/fiscal receipt duties, data protection/retention, business terms, support SLA, incident response and payment record semantics need qualified local review. No legal compliance conclusion is made here. |
| CONDITIONAL | Growth beyond Addis, multi-branch promises, hotel folios, credit and automated digital payments require separate capability-specific validation. Do not bundle them into the initial general offer. |
| READY | No general commercial product capability is classified READY from this repository-only audit. This does not mean the feature is broken; required deployment/customer evidence is missing. |

## Release decision

- **Internal testing:** **READY**, with automated test runner and TypeScript check evidence; this means safe isolated engineering tests, not live customer reliance.
- **Supervised pilot:** **BLOCKED until** the core staging, RLS, offline/restart, backup/restore and support gates above are closed. A discovery/demo pilot using synthetic data is suitable now.
- **General commercial launch:** **BLOCKED** pending deployed reliability/security evidence, claims correction, operational and legal review, and a commercial billing/collection policy.

## Go/no-go stop conditions

Stop a live pilot immediately for unexplained sale/payment mismatch, duplicate or missing inventory movement, cross-tenant access, unrecoverable pending operation, a lost receipt, role bypass, or inability to reconcile end-of-day totals. Preserve logs and business records; use the agreed manual fallback and contact the designated operator. Do not “fix” the ledger by editing or deleting records without an authorized audit process.

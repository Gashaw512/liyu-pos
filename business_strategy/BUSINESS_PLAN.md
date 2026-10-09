# Liyu POS — Business Plan

**Prepared:** 9 October 2026
**Basis:** Current repository review, checked-in migrations and documentation, plus linked public market/vendor sources.
**Evidence rule:** “Implemented in source” does not mean deployed or proven in a live business. All market sizing and financial figures below are proposals or explicitly labeled assumptions. No customer, revenue, retention, partnership, or production-readiness claims were found that can be verified from this repository.

## 1. Executive summary

Liyu POS is a bilingual, mobile-first hospitality and small-business point-of-sale web application. Its best initial market is independent Ethiopian cafes, bars/tej houses, and small restaurants where one owner needs to coordinate cashier shifts, table orders, kitchen/bar tickets, stock, and daily closeout without relying on uninterrupted internet.

The product has unusually broad operational coverage for its current stage: sales, products, branch inventory, stock receiving and adjustments, staff roles, table orders, configured Kitchen/Bar ticket routing, shift reconciliation, expenses, reporting, a staff custody ledger, optional hotel folios, and an IndexedDB outbox/offline model are represented in source. This breadth is a product opportunity, but it is also a launch risk: checked-in migrations, RLS, offline behavior, payment/stock atomicity and multi-device behavior still require staging and device validation. The current credit collection workflow is also incomplete.

The practical launch is a **founder-led, paid controlled pilot**, not a broad “all businesses” rollout. Focus on one locality and one operating segment, prove a normal day end-to-end, measure setup/support burden and willingness to pay, and then scale the most repeatable package. Lead with cash/shift accountability and fewer missed stock movements. Describe offline operation as a capability being validated until it has passed device and sync tests. Avoid claiming theft detection, guaranteed profit, external wallet verification, tax compliance, or customer outcomes without evidence.

Recommended commercial direction: per-outlet monthly subscription in ETB, optional paid onboarding/training, and a multi-branch package. Do not charge payment commissions while Telebirr/CBE Birr/bank methods are manually recorded tenders rather than provider-integrated settlement. The existing landing page shows Starter at ETB 0 and Business at ETB 999/month; the repository does not show billing or plan enforcement, so these are visible marketing prices, not verified active subscriptions.

## 2. Product overview

### What it does

Liyu is an operational POS and back-office application for hospitality and other small businesses. A cashier can record sales and tenders; a waiter can save table orders; configured products route to Kitchen, Bar, or no preparation ticket; inventory staff can receive and count stock and issue custody vouchers; owners/managers can review reports, expenses, stock alerts, shifts and staff.

### What problem it addresses

The intended problem is fragmented daily control: handwritten tickets and repeated entry, uncertain cash at shift handover, stock discrepancies, owners lacking timely sales/expense visibility, and work interrupted by unreliable connectivity. The repository implements workflows aimed at these problems; the magnitude of customer pain and willingness to pay must be learned through interviews and pilots.

### Verified product scope in source

| Area | Current source evidence | Status / limitation |
|---|---|---|
| POS and tender recording | Sales page, cart/payment components, `finalizeSale`, `/api/sync` | Implemented in source. Cash, Telebirr, CBE Birr, bank and credit tenders are recorded; those digital tenders are not proof of provider settlement. |
| Products and categories | Management product/category pages, catalog APIs, typed product/category models | Implemented in source; ownership and RLS still need staging verification. |
| Inventory and FIFO | `inventory`, `inventory_movements`, FIFO cost layers/allocations, receive/count UI | Implemented in source. Branch balance is the stock source of truth; IndexedDB is a local projection. Recipe/ingredient depletion is absent. |
| Table orders and KOT | `/api/table-orders`, revision-aware updates, KOT records/trigger and station fields | Implemented in code/migrations. Deployment, realtime and concurrent-device behavior are unverified. |
| Kitchen and Bar | Station-filtered KDS, preparing/ready transitions, polling/realtime code | Implemented in source; actual station availability and live behavior require staging. |
| Custody/handover | Issue, recipient acceptance, custody shifts and reconciliation | Implemented in source/migrations as an accountability sub-ledger; it does not create a separate stockroom. Counts/returns and allocation races need validation. |
| Shifts and expenses | Shift open/close, expense workflows, server-built shift report | Implemented in source. Do not treat as production-certified until DB and real cash tests pass. |
| Reports and Telegram | Dashboard/report pages, PDF generation, recipient configuration/delivery retry logic | Implemented in source. Telegram delivery is external; no live delivery verified. |
| Hotel room charge | Hotel toggle, folios, room-charge sale path, atomic wrapper migration | Implemented in source/migration; not proven deployed or transactionally verified. |
| Credit | Debtor fields, balance/settlement API and ledger migrations | Partial product workflow: cashier-facing debt lookup and collection are not integrated as a complete screen. Do not sell as ready until closed. |
| Customer relationship tools | Customer identity is captured for credit; no full customer-management workflow located | Not a CRM; loyalty, campaigns and customer lifecycle are future work. |
| SaaS billing | Static landing-page plan data and plan enum exist | Billing checkout, subscription ledger and server-side entitlement enforcement were not found. |
| Fiscal/payment integrations | Manual tender methods, configurable tax values and room folio logic | No verified live wallet gateway, acquiring integration, fiscal receipt certification or tax filing integration found. |

### User and buyer roles

- **Buyer:** Owner/operator of a one-to-three outlet restaurant, cafe, bar or tej house.
- **Daily economic user:** Cashier, who needs a fast sale, tender record, receipt and shift balance.
- **Service user:** Waiter, who saves an order and sees preparation status.
- **Production user:** Kitchen worker or barman, who moves routed tickets through preparation states.
- **Stock user:** Inventory clerk/storekeeper, who receives stock, counts it, and assigns custody to a selected staff member.
- **Oversight user:** Manager/owner, who checks exceptions, sales, expenses, stock and shift close.

### Architecture and delivery model

The current product is a **web app/PWA SaaS candidate**, not a native mobile app, marketplace, or public API product. The code uses Next.js App Router, React, TypeScript, Tailwind, Supabase Auth/Postgres, server API routes, RLS/migrations, Zustand, React Query, IndexedDB (`idb`), `next-intl`, and `next-pwa`. English and Amharic message files are present. Hosted deployment provider and production service levels are not verified from the repository.

## 3. Problem and proposed solution

The proposed solution is one practical operations surface that links order entry, preparation, payment, inventory and closeout, with a local queue for supported work during connectivity loss. The most credible initial use case is a small venue with bottled drinks and simple menu stock where staff custody and shift accountability matter. Keep setup short: add products/prices/stock, assign roles, configure station at category/product level, then train each role on its one primary task.

Prove the promise with operational measures: ticket correction rate, closeout time, counted-versus-expected cash, stock count variance, sale completion time and support interventions. Do not state reductions in theft, food waste, or close time until a pilot establishes a baseline and measured result.

## 4. Target customers and personas

| Segment/persona | Job to be done | Buying trigger | Main objection |
|---|---|---|---|
| Owner of a 1–3 site cafe/bar | Know sales, cash, stock and shift exceptions | Repeated mismatch or unreliable manual reports | “Will it work with my staff, device and internet?” |
| Cashier | Finish a bill quickly and reconcile a drawer | Owner wants digital records without slowing service | Training burden, missing shift, uncertain offline state |
| Storekeeper/inventory clerk | Receive stock and account for stock issued to staff | Frequent stock discrepancy or unclear responsibility | Duplicate counting or fear that issue will be treated as sale |
| Waiter | Save table orders and see what is ready | Busy dine-in service with handwritten tickets | Too many steps or uncertain save/Kitchen status |
| Kitchen/bar lead | See only relevant new work and mark progress | Lost or duplicated tickets | Screen/device reliability and alerting |

The first customer should have an owner-manager directly available, one branch, a stable Android phone/tablet or laptop, and willingness to record real-world exceptions during a pilot. Avoid a chain requiring procurement, accounting integration or guaranteed 24/7 SLA as the first deployment.

## 5. Market opportunity and geography

Ethiopia is a reasonable first market because the UI localizes to Amharic and English, tender labels include common local wallets/banks, and the product is explicitly shaped around local shift and stock practices. The National Bank of Ethiopia reports rapid growth in digital payments: its 2025 announcement states ETB 9.7 trillion in digital transactions in FY 2023/24 and more than 128.5 million mobile-money accounts/users by December 2024. These are ecosystem/account figures—not POS buyers or unique active restaurant customers. ([NBE, NDPS Phase Two announcement](https://nbe.gov.et/nbe_news/ethiopia-launches-phase-two-of-national-digital-payments-strategy-building-on-strong-momentum-from-phase-one/))

Connectivity is a reason to validate local-first workflows, not a claim that every Ethiopian venue has poor internet. DataReportal’s January 2025 estimate was 28.6 million internet users and 21.3% population penetration; it also warns that connectivity figures are estimates and mobile connections are not equivalent to internet users. ([DataReportal, Digital 2025: Ethiopia](https://datareportal.com/reports/digital-2025-ethiopia))

No reliable count of the product’s eligible target outlets was identified in the repository or sources reviewed. Use bottom-up market sizing:

```text
Serviceable annual market = verified eligible outlets × annual realized revenue per outlet
Example only: 1,000 outlets × ETB 900/month × 12 = ETB 10.8 million annual recurring revenue potential
```

The 1,000-outlet figure is an illustration, not an Ethiopian market statistic. Validate the outlet count via city-level mapping and interviews. Start in Addis Ababa where founder support can be delivered in person; next expand to other Ethiopian urban centers only after onboarding and support are repeatable. Consider neighboring East African markets only after currency, payment rails, tax/fiscal requirements, language, data-residency expectations and support partners are researched for each country.

## 6. Competitor analysis and differentiation

Public vendor pages are positioning/pricing evidence, not independent product tests.

| Alternative | Public positioning/price evidence | Implication for Liyu |
|---|---|---|
| Dhadhamo (Ethiopia) | Public page lists Free and Pro at ETB 500/month or ETB 5,000/year and describes restaurant/hotel workspace, menus, orders, expenses and reports. ([Dhadhamo](https://www.dhadhamo.com/)) | Direct local price anchor and broad hospitality scope. Liyu cannot win on feature count alone; demonstrate role workflows, branch stock/custody clarity, and proven supported offline recovery. |
| EliteTeQ POS (Ethiopia) | Markets restaurant POS, Kitchen tickets, local payments, inventory and offline operation; pricing is quote-led on the page. ([EliteTeQ Restaurant POS](https://eliteteqpos.com/et/industries/restaurants-and-cafes/)) | Direct service competitor. Verify local onboarding, hardware, support, fiscal compatibility and actual offline behavior in customer interviews. |
| Easymaz (Ethiopia) | Markets QR menus/orders, POS, local payment flows, kitchen visibility and reports. ([Easymaz](https://easymaz.com/)) | Competes on digital ordering and customer-facing QR workflow; Liyu currently centers staff operations and stock/cash custody rather than guest self-service. |
| Loyverse (global) | POS, basic inventory, KDS, multi-store and offline sales are listed free; advanced inventory and employee management are listed at $25/store/month each, and unlimited history at $5/store/month. ([Loyverse pricing](https://loyverse.com/pricing)) | Strong free/global benchmark. Liyu needs local onboarding, language, support and clear stock/cash accountability to justify a paid plan; offline alone is not unique. |
| Odoo (global ERP/POS) | Official pricing page presents a broad suite; price depends on plan and user basis, with listed Standard/Custom monthly per-user prices. ([Odoo pricing](https://www.odoo.com/pricing)) | Flexible and broad, but implementation/configuration is a different buying experience. Liyu should stay focused and simpler rather than becoming an ERP. |
| Toast / Square (international references) | Toast says availability is limited to listed markets (US, Canada, Ireland and UK); Square’s restaurant pricing is built around its own processing ecosystem and location pricing. ([Toast availability](https://pos.toasttab.com/uk/request-demo-intl), [Square pricing](https://squareup.com/us/en/point-of-sale/restaurants/pricing)) | Useful feature/UX benchmarks, but do not position as locally interchangeable without confirming Ethiopia availability, local payment acceptance and support. |

**Potential differentiation to test, not assume:** one application joining waiter → configured Kitchen/Bar ticket → cashier shift close → branch stock movement → selected-person custody reconciliation; Amharic/English; local manual tenders; founder-led local onboarding; supported local-first operations. Competitors may also offer offline or kitchen functions, so claims of uniqueness need customer and competitor validation.

## 7. Value proposition and positioning

**Positioning:** “The daily sales, shift and stock-control app for Ethiopian cafes, restaurants and bars.”

**Core promise:** “See what was sold, what was paid, what stock moved, and what each shift needs to reconcile.”

Use “built for intermittent connectivity” only with a qualification until real devices pass the end-to-end offline tests. Say “records Telebirr/CBE Birr/bank tenders” rather than “verifies payment.” Say “stock variance” rather than “theft detection.”

## 8. Recommended business model and revenue streams

1. **Per-outlet subscription in ETB:** predictable and compatible with ongoing hosting, support and backups.
2. **Onboarding, menu import and staff training:** one-time fee where substantial hands-on setup is requested; waive or discount for limited founding pilots in exchange for structured feedback, not a public testimonial requirement.
3. **Multi-branch and priority support add-ons:** charge for branch complexity and response commitments once the service capability exists.

Do not add transaction fees, wallet commissions, advertising or customer-data monetization. The current payment method choices are recorded tenders and the repository does not show a payment acquiring integration that would support a transparent take-rate.

## 9. Pricing strategy

Price in ETB per outlet per month, excluding applicable tax unless a local adviser confirms the displayed convention. Keep staff seats generous; charge principally for locations and support, not every cashier login. Proposed tiers and assumptions are in [REVENUE_MODEL.md](./REVENUE_MODEL.md). Existing source landing page lists Starter ETB 0 and Business ETB 999/month; these appear to be static marketing values and are not backed by a subscription/entitlement system found in the repository.

## 10. Customer acquisition and marketing

Start with direct founder outreach to owner-operated cafes, bars/tej houses, and casual restaurants in one Addis neighborhood. Offer a short discovery interview, a live workflow demo using visibly labeled sample data, and a tightly scoped pilot after the financial lifecycle is tested. Use bookkeepers, local POS hardware/printer sellers, hospitality consultants and payment providers as referral prospects; no partnership is currently verified.

Content should demonstrate real screens and modest, specific tasks: save a table order, see its configured station ticket, record a shift close, issue/accept stock custody, and distinguish recorded manual tenders from provider confirmations. The detailed plan is in [GOTOMARKET_PLAN.md](./GOTOMARKET_PLAN.md), and proposed social copy is in [SOCIALMEDIACONTENT.md](./SOCIALMEDIACONTENT.md).

## 11. Sales and distribution channels

- Founder-led in-person demos and WhatsApp follow-up, subject to customer consent.
- Local hospitality/accounting/bookkeeping and POS hardware referrals.
- Search landing pages in English and Amharic with real product screenshots, clear scope and a demo request.
- Short video distribution on Instagram/TikTok/Facebook; owner-oriented educational posts on LinkedIn and local business communities.
- Self-serve signup only after onboarding, plan limits, data recovery and support boundaries are clear.

## 12. Operational requirements

- **Implementation/support:** business setup, product import, branch/role setup, tax settings, station configuration, device checks, short staff training and first-week follow-up.
- **Reliability:** staging and production separation; migration tracking; backups and restore drills; error monitoring; offline browser/device tests; documented support and incident process.
- **Security:** verify RLS/tenant/branch roles on deployment; rotate secrets; least-privilege staff setup; secure support access and redacted logs.
- **Hardware:** test customer-owned Android/tablet/laptop, browser, printer and network. Printer compatibility and fleet management are not established as a turnkey product.
- **Finance/compliance:** confirm local tax and fiscal receipt obligations with qualified Ethiopian advisers; reconcile manual wallet claims to external statements; do not imply fiscal certification.
- **Cloud cost:** likely includes hosting, managed Postgres/auth, backups/logging, domain, email/SMS if introduced, support and foreign-currency exposure. See [REVENUE_MODEL.md](./REVENUE_MODEL.md). Actual vendor plans and usage are unknown.

## 13. Risks, assumptions and mitigations

| Risk/assumption | Why it matters | Mitigation |
|---|---|---|
| Live DB/RLS and atomic sale behavior remain unverified | Sale, payments, stock and folio are money-critical | Dedicated staging, migration review, failure injection and ledger assertions before paid pilot |
| Offline reliability is code-level, not device-proven | A lost sale or duplicate movement destroys trust | Android + desktop test, browser restart, lost-response and sync-retry evidence |
| Credit has no complete cashier debt-collection UI | Uncollectable or misreported balances | Disable credit for pilot or finish and verify a minimal collection workflow |
| Static free/paid plan messaging has no visible entitlement enforcement | Users may access paid features without billing or misunderstand limits | Define one commercial offer; implement/test billing and server entitlements before charging self-serve customers |
| Public landing copy contains mock transactions/profit/variance and strong “theft detection” claims | Misleading evidence can harm trust and consumer protection | Replace mock proof with clearly labeled demo data; market measured discrepancy workflow only |
| Local competitors offer low-priced/free product | Strong price pressure | Sell onboarding, local workflow fit and reliability; test price before building advanced features |
| Digital access and literacy vary | Training and support could exceed subscription revenue | Role-specific brief onboarding, bilingual help and simple device requirements |
| Foreign currency and cloud pricing change | ETB price may not cover hosting | Monitor spend, set alerts, keep FX margin and annual-price review clause |
| Tax/fiscal compliance expectations may change or differ by venue | Operators need accepted records | Validate by business type with local tax expert; never market certification without evidence |
| Support cost grows faster than customer count | Low-price SaaS can become unprofitable | Track tickets and onboarding hours per outlet; price branches/onboarding transparently |

## 14. Product roadmap: 3, 6 and 12 months

| Horizon | Business objective | Recommended work and exit gate |
|---|---|---|
| 0–3 months | Prove safe daily operation with a small controlled cohort | Deploy dedicated staging, close financial/offline test gaps; complete one documented end-to-end restaurant day; disable or complete credit; replace unsupported landing claims; run 5–10 discovery/pilot conversations. Exit when a business can reconcile actual source records and staff complete tasks without founder intervention every shift. |
| 4–6 months | Prove repeatable onboarding and willingness to pay | Convert a subset to paid plans; measure setup hours, weekly active outlets, support minutes, gross retention and real willingness-to-pay; ship only repeatable support fixes; add subscription/entitlement enforcement and payment collection if pilot evidence supports SaaS. |
| 7–12 months | Expand within Ethiopia with positive unit economics | Focus on 2–3 urban clusters; establish referral partners; formalize service levels, backup/restore and incident playbooks; add multi-branch pricing/controls as needed. Consider regional expansion only after local compliance/payment/localization review. |

Roadmap timing is a planning proposal, not a claim about existing commitments or staffing.

## 15. KPIs

**Activation:** business setup completion; time to first catalog; time to first paid sale; share of invited staff activated; pilot onboarding hours per outlet.

**Daily value:** weekly active outlets; sales recorded per active outlet; percentage of shifts closed; median close time; variance events reviewed; ticket correction/cancellation rates; low-stock alert follow-through.

**Reliability:** sale sync success on first attempt; pending age; duplicate record count; inventory movement mismatch; crash/failed request rate; offline recovery success on target devices; support incidents per 100 shifts.

**Commercial:** qualified leads, demos held, trial-to-paid conversion, monthly churn, paid outlets, average revenue per outlet (ARPA), MRR/ARR, CAC, onboarding revenue, gross margin and support cost per outlet.

## 16. Recommended next steps

1. Name and isolate a true staging project; validate the critical sale/payment/inventory/room-charge migrations and RLS there.
2. Complete the Android and desktop offline lifecycle with database row counts and cash/stock reconciliation evidence.
3. Decide whether credit is disabled for pilot or finish the cashier collection workflow.
4. Correct landing page claims and align static pricing with the commercial plan and enforced entitlements.
5. Interview 15 target owners, observe real shift close and stock handover, then sell 5 paid or explicitly scoped pilot deployments.
6. Measure willingness to pay, onboarding hours, support cost and weekly use before expanding the roadmap.

## 17. Founder summary and open decisions

### Strongest commercial opportunities

- A focused daily-operations workflow for owner-operated cafes, bars/tej houses and small restaurants.
- Stronger visibility between a sale, shift close, branch inventory movement and staff custody.
- Local onboarding and Amharic/English support as a service advantage, if the founder can deliver it reliably.

### Three most promising revenue streams

1. Per-outlet ETB subscription.
2. Menu/setup import and staff onboarding/training.
3. Multi-branch and priority-support plans after service capacity is proven.

### Biggest business risks

- Critical financial and offline behavior is not yet validated against staging and target devices.
- Existing static plan marketing is not backed by subscription checkout/entitlement enforcement.
- Low local price anchors and high support requirements may compress margins.
- Overstated offline, theft, profit, provider-payment or compliance claims could damage customer trust.

### Five highest-priority actions

1. Secure a separate staging project and complete the end-to-end migration, RLS and ledger validation.
2. Test a full offline day on Android and desktop, including browser restart and same-sale retry.
3. Complete or disable credit for launch and align all marketing claims to evidence.
4. Interview 15–20 owners and ask for paid pilot commitments at several ETB price points.
5. Measure onboarding/support time and retention before hiring or expanding to another city.

### Founder questions the repository cannot answer

- Is the goal a sustainable founder-led Ethiopian SaaS or a venture-scale regional company?
- What cash budget and founder runway are available for the first 12 months?
- Is Addis the intended launch market, and which neighborhood/business segment is easiest to reach?
- Can the founder provide in-person setup, staff training and support, or must the product be self-serve from day one?
- Which customer language should lead—Amharic, English, or both equally—and are other local languages a near-term requirement?
- Is the preferred pricing monthly, annual, per outlet, or a combination with paid setup?
- Will the founder support Android/PWA only, or also printers, cash drawers and dedicated devices?
- What service hours and incident response can be promised honestly at launch?
- Should hotel folio and credit features be sold at launch, or remain disabled until real deployments prove them?

## Research and source notes

Market and vendor pages were reviewed on 9 October 2026. Vendor claims and prices can change; verify before quoting. No independent outlet-count, Liyu traction or Ethiopian willingness-to-pay dataset was found.

- [National Bank of Ethiopia — NDPS Phase Two announcement](https://nbe.gov.et/nbe_news/ethiopia-launches-phase-two-of-national-digital-payments-strategy-building-on-strong-momentum-from-phase-one/)
- [DataReportal — Digital 2025: Ethiopia](https://datareportal.com/reports/digital-2025-ethiopia)
- [Dhadhamo](https://www.dhadhamo.com/)
- [EliteTeQ Ethiopia restaurant POS](https://eliteteqpos.com/et/industries/restaurants-and-cafes/)
- [Easymaz](https://easymaz.com/)
- [Loyverse pricing](https://loyverse.com/pricing)
- [Odoo pricing](https://www.odoo.com/pricing)
- [Toast availability](https://pos.toasttab.com/uk/request-demo-intl)
- [Square restaurant pricing](https://squareup.com/us/en/point-of-sale/restaurants/pricing)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel pricing](https://vercel.com/pricing)

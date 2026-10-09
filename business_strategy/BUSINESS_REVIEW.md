# Liyu POS Business Review

**Review date:** 9 October 2026  
**Purpose:** Challenge the existing business hypotheses using verified repository facts and current public references. No traction or customer economics were found in the repository. All calculations below are planning scenarios, not actual results.

## Findings in brief

Liyu has a credible product direction: connect a small hospitality team’s sale, table order, configured preparation ticket, shift close, branch inventory and custody record. The source breadth supports a focused discovery/pilot, but not the public reliability claims or general commercial readiness. The strongest near-term offer is a founder-supported, one-outlet manual pilot after technical gates pass—not “self-serve SaaS” yet.

### Business hypotheses challenged

| Hypothesis in current business materials | Review |
|---|---|
| Addis owner-operated cafes, bars/tej houses and casual restaurants have urgent cash/stock/order problems | Plausible fit with code workflow, but there is no interview, willingness-to-pay, or customer-loss evidence. Verify a recent costly incident and current workaround rather than asking only whether the idea sounds useful. |
| Linking shift, order, Kitchen/Bar and custody differentiates Liyu | Potentially meaningful workflow integration, but competitors advertise overlapping POS, KDS, inventory and offline features. Differentiation must be demonstrated as simpler local onboarding, accurate reconciliation, Amharic usability, support, or a specific workflow competitors do not satisfy. Do not claim exclusive offline or KDS capability. |
| ETB 999/month is commercially justified | Not yet. It is a static public price, not a paid conversion. Dhadhamo’s public page checked 9 Oct 2026 lists Free and Pro at ETB500/month. Loyverse lists a free core POS including basic inventory, kitchen display and multi-store; optional add-ons are paid. Different scope/support means these are price anchors, not equivalent-product comparisons. |
| Founder-led visits and referrals can acquire customers | Sensible low-cash first channel, but proposed 30–180 qualified leads/month and 17–35% paid conversion from held demos are unsupported. Founder time, access to decision makers, and follow-up capacity are the real constraints. Start with a measurable 30-day local funnel. |
| Base case reaches 98 paying outlets / ETB88,200 MRR | Arithmetic does not match the detailed model. At 80 leads × 45% booking × 80% held × 30% paid, gross additions are 8.64/month. With 2% monthly churn and zero starting customers, the stated model gives about 93 month-12 customers. At ETB900 ARPA that is ETB83,700 MRR and ETB1,004,400 ARR run-rate. 98 × ETB900 is ETB88,200 and ETB1,058,400, but needs a different acquisition input. |
| Regional expansion should be on the near roadmap | Premature until one Addis segment has successful onboarding, repeat use, support economics, localization, tax/fiscal/payment requirements and retention. Treat other cities as a later replication experiment, not a 12-month promise. |
| Social content is publishable | The content pack is unusually cautious and generally labels sample data and manual tenders. Still avoid filming real staff/customer records without consent and do not publish example “100 → 100 → 98” as an observed customer result unless a controlled test validates it. The current product landing page itself has stronger claims than the pack. |

## Product claims supported by source versus not supported

**Supported as source implementation:** Next.js/React web/PWA, Supabase Auth/Postgres integration, English/Amharic message resources, product/category catalog, sales/tenders, table orders, Kitchen/Bar routing configuration, KDS, branch inventory and FIFO code/migrations, custody, shifts, expenses/reports, IndexedDB queue, price proofs and server-side sale amount calculator.

**Not established as production outcomes:** “100% offline,” no-loss sync, exact profit, fraud/theft detection, live Telebirr/CBE settlement, fiscal certification, completed automated subscriptions, deployed RLS, branch/tenant isolation, recipes/ingredient depletion, or a customer-level savings result. The source has relevant building blocks; external environment and real-user evidence remain necessary.

## Competitor and market context

- **Dhadhamo (local, public listing):** checked 9 Oct 2026; public website shows Free and Pro at ETB500/month or ETB5,000/year and describes restaurant/hotel operations, orders, expenses and reporting. This is a vendor listing, not an independently verified deployment or feature comparison. [Dhadhamo pricing and positioning](https://www.dhadhamo.com/)
- **Loyverse (global benchmark):** official pricing page checked 9 Oct 2026 lists a free POS with sales analytics, essential inventory, loyalty, KDS and multi-store; optional monthly add-ons are shown for longer sales history, employee management and advanced inventory. It means offline POS and KDS alone are not sufficient differentiation. Prices and market availability must be checked for an Ethiopian buyer. [Loyverse pricing](https://loyverse.com/pricing)
- **EliteTeQ / Easymaz:** public positioning in existing plan documents includes restaurant functions, KDS/local payments/offline (EliteTeQ) and QR menu/orders/POS (Easymaz). Treat these as vendor claims pending direct product demo and customer interviews. [EliteTeQ restaurant POS](https://eliteteqpos.com/et/industries/restaurants-and-cafes/), [Easymaz](https://easymaz.com/)
- **Digital channel context:** DataReportal’s *Digital 2025: Ethiopia* (published 3 March 2025; estimates for January 2025) reports 28.6 million internet users and 8.30 million social media user identities. These are national estimates and social identities, not Addis hospitality buyers or addressable POS businesses. [DataReportal, 3 Mar 2025](https://datareportal.com/reports/digital-2025-ethiopia)
- **Digital payments context:** National Bank of Ethiopia’s Phase Two announcement dated 28 March 2025 reports 9.7 trillion ETB digital transactions in FY2023/24 and more than 128.5 million mobile-money accounts/users by 31 Dec 2024. These account/transaction totals are ecosystem context, not unique merchant customers, nor proof that Liyu has provider settlement. [NBE, 28 Mar 2025](https://nbe.gov.et/nbe_news/ethiopia-launches-phase-two-of-national-digital-payments-strategy-building-on-strong-momentum-from-phase-one/)

No authoritative current count of target Addis cafes/bars/restaurants was identified. Do not publish TAM/SAM by multiplying an invented outlet count. Build a bottom-up outlet list and validate the number of eligible buyers.

## Corrected financial assumptions table

| Input | Conservative | Base | Optimistic | Evidence status / validation |
|---|---:|---:|---:|---|
| Monthly realized price (ETB/outlet) | 650 | 900 | 1,100 | **Hypothesis.** Public Liyu list is ETB999; proposed tiers in `REVENUE_MODEL.md`; no paid invoices verified. Test 499/999/2,499 packages and support scope. |
| Qualified leads/month | 30 | 80 | 180 | **Hypothesis.** No CRM or lead history found. Count only named, eligible owner/operator prospects with contact permission. |
| Demo booked / qualified lead | 40% | 45% | 50% | **Hypothesis.** Track actual bookings. |
| Demo held / booked | 70% | 80% | 80% | **Hypothesis.** Track no-shows and reasons. |
| Paid / held demo | 17% | 30% | 35% | **Hypothesis.** Count collected pilot/subscription fee, not verbal interest. |
| New paying outlets/month | 1.4 | 8.6 | 25.2 | Formula from above inputs; optimistic volume may exceed founder onboarding/support capacity. |
| Monthly logo churn | 4.0% | 2.0% | 1.5% | **Unsupported hypothesis.** Replace only with paid cohort observations; 3–6 months is still early evidence. |
| Month-12 paying outlets from zero | 14 | 93 | 279 | Model: `new/month × (1 − (1 − churn)^12) / churn`, rounded. These are not actual accounts. |
| Month-12 MRR / ARR run-rate | ETB9,100 / 109,200 | ETB83,700 / 1,004,400 | ETB306,900 / 3,682,800 | `MRR = active paid outlets × realized ARPA`; `ARR = MRR × 12`. Corrects the pitch’s 98-base-customer mismatch. |
| Shared infrastructure/monitoring/backups per month | ETB8,000 | ETB8,000 | ETB8,000 | Model estimate only. Actual vendor, region, database size, egress, backups, logs, FX and tax unknown. |
| Direct support/service per active outlet/month | ETB120 | ETB120 | ETB120 | Hypothetical cash/labor allocation. Measure support minutes and loaded labor cost; founder labor should not be hidden. |
| Non-service monthly operating expenses | ETB35,000 | ETB35,000 | ETB35,000 | Hypothesis from existing model: field sales/travel, telecom, admin and modest operator allocation. Not actual spend. |
| Payment processing/provider cost | 0 in model | 0 in model | 0 in model | No in-app subscription processor/payment gateway evidenced. Manual customer payment collection still has bank/collection costs; verify before using zero. |
| Founder compensation | Separate from cash costs | Separate from cash costs | Separate from cash costs | Existing ETB35k assumption includes a modest operator allocation, but unpaid founder hours can still make CAC/margin look artificially good. Record hours and show both cash and fully loaded results. |
| Tax/compliance | Excluded | Excluded | Excluded | Obtain Ethiopian tax, invoicing/fiscal, data/privacy, employment and consumer contract advice. Do not estimate without qualified inputs. |
| Onboarding labor/cost | ETB1k–5k proposed fee | ETB1k–5k | ETB1k–5k | Proposed one-time range, not proven. Track setup hours, travel, catalog import and staff training per venue. |

## Formulas and corrected scenario use

```text
MRR = month-end paying outlets × realized monthly revenue per outlet (ARPA)
ARR run-rate = MRR × 12
Gross margin = (subscription revenue − direct cost to serve) / subscription revenue
Contribution/outlet = ARPA − variable direct service cost/outlet
Break-even outlets = (shared fixed service cost + other fixed operating cost) / contribution/outlet
CAC = attributable sales/marketing cash + valued acquisition labor / new paying outlets
Simple LTV = ARPA × contribution margin % / monthly logo churn
```

Using the base assumptions: `break-even = (8,000 + 35,000) / (900 − 120) = 55.1`, approximately **56 outlets**, before tax/capex and subject to actual cost verification. At 93 outlets, base month-12 gross margin using the existing direct-cost model is `(83,700 − (8,000 + 120×93))/83,700 = 77.1%`. This omits tax, founder time beyond the assumed operator allocation, one-time onboarding, bad debt, payment collection and incident costs; it is not a demonstrated margin.

## Sensitivity: base model, one input changed

| Change | Approximate directional result | Practical decision |
|---|---|---|
| Realized ARPA ETB900 → ETB650 at 93 outlets | MRR drops ETB23,250 to ETB60,450; contribution falls to ETB530/outlet; break-even rises to about 82 outlets at fixed ETB43k overhead. | Test willingness to pay and exact scope before lowering price. |
| Paid demo conversion 30% → 15% | Gross additions halve from 8.64 to 4.32/month; month-12 outlet estimate roughly halves (before capacity effects). | Track paid conversion, not likes or stated interest. |
| Monthly churn 2% → 4% | At 8.64 gross/month, month-12 cohort estimate falls from ~93 to ~85; long-run replacement burden and LTV worsen more sharply. | Retention/usefulness matters more than top-of-funnel volume. |
| Variable support ETB120 → ETB300 | Contribution at ETB900 falls from ETB780 to ETB600; break-even rises from 56 to 72 outlets. | Measure support and onboarding minutes by venue. |
| Shared and other fixed monthly cost +50% | Fixed spend rises ETB43k to ETB64.5k; break-even at ETB780 contribution rises from 56 to about 83 outlets. | Obtain actual hosting, tax, field support and founder cost. |
| 30% fewer qualified leads | Acquisition and month-12 MRR decline approximately proportionally under the model; no demonstrated channel provides replacement volume. | Build a small verified venue list and channel source attribution. |

## Operating cost and obligations to verify

Existing model mentions example Supabase/Vercel list prices, but source configuration does not establish that those providers/plans are actually used. Obtain actual bills and inspect backup/compute/egress usage. Add founder/support labor, travel, mobile data, device testing, domain/email, incident response, payment collection/bank fees, foreign-currency spread, tax/compliance, legal terms, data export/retention, and customer acquisition cash. Ask an Ethiopian tax/accounting professional to confirm VAT/business tax, invoice, receipt, fiscal device/software and withholding obligations before charging customers.

## Recommended commercial decision

1. Do not frame ETB999 or a “14-day trial” as a validated automated subscription. Offer a written, limited pilot fee collected manually with a clear refund/exit policy.
2. Compare ETB499/999/2,499 only with specific scope and support hours; ask for a paid commitment.
3. Exclude credit, hotel folio, fiscal compliance, real wallet verification, and offline guarantees from the first offer unless each separately passes its release test.
4. Do not pay for broad ads or expand regionally until 3–5 venues activate, reconcile daily, renew/convert, and fit the support economics.

## References and date notes

Public vendor pages are dynamic. Prices/features above are reported listings checked 9 October 2026; they do not prove equivalent features, quality, Ethiopian availability or contractual support. NBE publication date is 28 March 2025. DataReportal publication date is 3 March 2025, reporting January 2025 estimates. Links above lead to primary/vendor sources where available.

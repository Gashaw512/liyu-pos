# Liyu POS — Revenue Model and 12-Month Scenarios

**Status:** Proposed model, not actual revenue or a forecast based on customer history. No customers, conversions, churn, costs, or revenue could be verified in the repository. Prices and scenarios below are hypotheses to validate in paid pilots.

## 1. Recommended monetization

Use a monthly **per-outlet subscription in ETB**, with optional one-time onboarding and multi-branch support. This aligns the bill with the location whose sales, shifts, inventory and staff the system supports. It is easier for a small business to budget than a transaction commission and avoids charging for manually recorded payments that the app does not verify through Telebirr/CBE/bank providers.

The current landing page statically displays Starter at ETB 0 (“Free forever”) and Business at ETB 999/month with a 14-day trial. Source review did not find checkout, recurring billing, plan limits or server-enforced entitlements. Treat these as public copy, not revenue, a live subscription product or proof that customers have paid.

### Proposed plans

All prices are **hypothetical ETB prices per outlet**, before applicable tax; confirm tax display and collection with a local adviser. Plan limits are proposals and must be enforced before they are sold as hard limits.

| Plan | Proposed price | Intended customer and included scope | Important gate |
|---|---:|---|---|
| Free | ETB 0 | Time-limited evaluation or tightly limited solo demo account; one outlet, sample data and basic POS exploration | Do not offer unlimited production use until support, abuse, storage and paid conversion economics are known. Current landing page says “free forever”; reconcile this. |
| Starter | ETB 499/month | One outlet, owner + up to 3 staff, catalog, POS, manual tenders, basic stock and shift summary | Pilot with simple cafes/shops; omit any feature not actually supported in released code. |
| Professional | ETB 999/month | One outlet, up to 10 staff, tables, configured Kitchen/Bar tickets, custody workflow, fuller reports and standard support | This preserves the existing public 999 ETB anchor while adding no unverified provider integration. |
| Business | ETB 2,499/month | Up to 3 outlets, centralized owner view, broader staff access and priority onboarding/support | Sell only after multi-branch user/branch operations and support are staging-tested. |
| Enterprise | From ETB 7,500/month, quote-based | 5+ outlets or special support, onboarding, reporting and security requirements | “From” price is a test hypothesis; define SLAs and integration scope before taking orders. |

**Pricing experiment:** Interview 15–20 owners and present the actual package at ETB 499, 999 and 2,499 as separate, credible offers. Ask for a paid pilot or deposit, not only “would you pay?” Do not A/B price in a way that violates local law or customer trust.

## 2. Revenue streams

1. **Recurring outlet subscription** — primary predictable revenue.
2. **One-time implementation** — menu/product import, opening balance setup and staff training. Proposed fee: ETB 1,000–5,000 depending on time and travel; waive for a small number of design partners only with clear feedback terms.
3. **Multi-branch / priority service** — additional branch pricing or support package once the service operation exists.

Later possibilities: hardware/printer referral margin, custom reports, professional onboarding, and partner-delivered training. Avoid ads, data resale, payment take rates or provider commissions now. There is no verified integrated acquiring/payment flow or sufficient scale for these to be credible.

## 3. Assumptions and formulas

Definitions:

```text
MRR = paying active outlets at month end × realized monthly revenue per outlet (ARPA)
ARR run-rate = month-end MRR × 12
Year-1 recognized subscription revenue ≈ average active outlets × ARPA × 12
Gross profit = subscription revenue - direct infrastructure and support cost to serve
Gross margin = gross profit / subscription revenue
Monthly operating result = revenue - direct service cost - non-service operating costs
Break-even outlets = (fixed service cost + fixed operating cost) / (ARPA - variable service cost per outlet)
Simple LTV = ARPA × contribution gross margin per outlet / monthly logo churn
```

This simple LTV is not cohort-tested and excludes discounting, taxes and expansion revenue. It is for sensitivity planning only.

### Acquisition funnel assumptions

| Scenario | Qualified owner leads/month | Demo booked | Demo held | Paid from held demo | Gross new outlets/month (calculation) | Monthly churn assumption |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | 30 | 40% | 70% | 17% | 30 × .40 × .70 × .17 ≈ 1.4 | 4.0% |
| Base | 80 | 45% | 80% | 30% | 80 × .45 × .80 × .30 ≈ 8.6 | 2.0% |
| Optimistic | 180 | 50% | 80% | 35% | 180 × .50 × .80 × .35 = 25.2 | 1.5% |

Estimated active outlets at month 12 use `N₁₂ = monthly gross additions × [1 − (1 − churn)¹²] / churn`, starting from zero. This assumes steady acquisition and churn and is not actual funnel data.

## 4. 12-month scenarios

Hypothetical service cost assumptions: shared hosting/monitoring/backups **ETB 8,000/month**; variable direct support/service effort **ETB 120 per active outlet/month**. Non-service operating spend **ETB 35,000/month** for a lean founder-led operation (modest founder/operator allocation, field sales/travel, telecom and basic administration). Excludes hardware, legal/compliance work, taxes, major hiring, failed-deployment remediation and any payment-provider charges. Actual cloud provider/hosting is unknown. Supabase currently lists Pro at US$25/month and Vercel Pro at US$20/month, but Liyu may use another deployment setup and total cost depends on usage, compute, backups, FX and tax. ([Supabase pricing](https://supabase.com/pricing), [Vercel pricing](https://vercel.com/pricing))

| Metric | Conservative | Base | Optimistic |
|---|---:|---:|---:|
| Month-12 paying outlets (formula estimate, rounded) | 14 | 93 | 279 |
| Month-12 ARPA | ETB 650 | ETB 900 | ETB 1,100 |
| Month-12 MRR | ETB 9,100 | ETB 83,700 | ETB 306,900 |
| Month-12 ARR run-rate | ETB 109,200 | ETB 1,004,400 | ETB 3,682,800 |
| Approx. Year-1 subscription revenue (linear ramp: month-end outlets ÷ 2 × ARPA × 12) | ETB 54,600 | ETB 502,200 | ETB 1,841,400 |
| Month-12 direct service cost (8,000 + 120 × outlets) | ETB 9,680 | ETB 19,160 | ETB 41,480 |
| Month-12 gross margin | -6.4% | 77.1% | 86.5% |
| Month-12 total operating cost (direct service cost + ETB 35,000 non-service spend) | ETB 44,680 | ETB 54,160 | ETB 76,480 |
| Approx. Year-1 service cost (8,000 × 12 + 120 × average outlets × 12) | ETB 106,080 | ETB 162,960 | ETB 296,880 |
| Year-1 non-service operating cost assumption | ETB 420,000 | ETB 420,000 | ETB 420,000 |
| Approx. Year-1 operating result before tax/capex | -ETB 471,480 | -ETB 80,760 | ETB 1,124,520 |

**Interpretation:** A founder-led product can still lose money in the first year even if month-12 MRR looks promising, because customer count ramps gradually. The base case approaches but does not reach year-one operating break-even under this cost model. The optimistic case requires a substantial lead and onboarding engine; it must not be treated as a target until capacity is proven.

### Month-12 LTV/CAC (illustrative only)

| Scenario | Variable contribution margin `(ARPA − 120) / ARPA` | Monthly churn | Simple LTV | Assumed CAC | LTV/CAC |
|---|---:|---:|---:|---:|---:|
| Conservative | 81.5% | 4.0% | ETB 13,244 | ETB 6,000 | 2.2× |
| Base | 86.7% | 2.0% | ETB 39,015 | ETB 3,500 | 11.1× |
| Optimistic | 89.1% | 1.5% | ETB 65,340 | ETB 2,500 | 26.1× |

CAC assumes direct acquisition cash and founder time are fully counted; if founder time is omitted, CAC is understated. A very high modeled LTV/CAC is not evidence of a strong business; replace churn and CAC assumptions with cohort data.

## 5. Break-even analysis

Using base ARPA ETB 900, variable service cost ETB 120/outlet, shared service cost ETB 8,000/month and non-service operating cost ETB 35,000/month:

```text
Break-even outlets = (8,000 + 35,000) / (900 - 120)
                   = 55.1, so approximately 56 active outlets
```

At 56 outlets, monthly revenue is ETB 50,400; estimated direct service cost is ETB 14,720; operating cost is ETB 35,000; operating result is approximately ETB 680 before tax/capex. This is a very thin cushion. If ARPA is ETB 650, break-even rises to about 82 outlets; if ARPA is ETB 1,100, it falls to about 44 outlets, holding costs constant.

## 6. Sensitivity analysis

| Assumption change at base scale | Approximate effect | Why to measure |
|---|---:|---|
| ARPA ± ETB 100 at 93 outlets | MRR ± ETB 9,300 | Price is a stronger lever than small cloud optimization. |
| Paid conversion falls from 30% to 20% | Gross additions fall by one-third; month-12 MRR falls materially | Demo quality, owner urgency and onboarding fit determine growth. |
| Monthly churn rises from 2% to 4% | Lower surviving cohort and lower LTV; more replacement sales needed | Reliability and daily habit determine retention. |
| Variable support rises from ETB 120 to ETB 300/outlet | Base month-12 direct cost increases ETB 17,640/month | Onboarding/self-serve and support burden determine SaaS margins. |
| Shared infrastructure cost doubles from ETB 8,000 to ETB 16,000/month | Break-even rises by ~10 outlets at base contribution | Measure database, egress, logs, backup and hosting invoices. |
| Foreign-currency settlement rate rises | ETB vendor costs increase; impact = USD bill × FX-rate change | Keep a pricing buffer and inspect actual payment route/fees. |
| Annual discount of two months | Cash collected earlier but recognized revenue per outlet drops 16.7% | Do not introduce before churn and cash needs are understood. |

## 7. Costs and figures requiring real-world verification

- Actual hosting/deployment provider, Supabase plan/compute/backup choices, logs, egress and incident costs.
- ETB/USD settlement conversion, bank fees, foreign card availability and applicable tax on vendor charges.
- Local tax treatment and customer-facing tax invoice requirements.
- Founder and support labor, travel, device/printer training and customer acquisition costs.
- Willingness to pay at ETB 499/999/2,499; price sensitivity by outlet type and city.
- Qualified target outlet count and density by Addis neighborhood/city.
- Trial-to-paid conversion, monthly churn, support minutes per outlet and referral share.
- Whether free usage is sustainable and what plan limits can be implemented/enforced.
- Payment-provider settlement/commission costs if a real gateway is added later.

**Do not present this model to investors as actual traction or audited forecasts.** It is a planning model with transparent assumptions.

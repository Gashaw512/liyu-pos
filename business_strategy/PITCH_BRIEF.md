# Liyu POS — Pitch Brief

## One-sentence pitch

Liyu POS helps Ethiopian cafes, restaurants and bars connect daily sales, staff shifts, configured Kitchen/Bar orders and stock accountability in one bilingual, mobile-first operations app.

## Problem

Small hospitality teams often coordinate sales, handwritten tickets, stock counts and cash close across separate processes. Owners may not see a clear relationship between the order, payment, stock movement and staff handover. Internet interruption adds operational risk when workflows depend entirely on a live server.

These problems are the product hypothesis; their frequency and financial value need validation with operating businesses.

## Solution

Liyu’s current source contains a POS and tender workflow, products/categories, branch inventory and FIFO records, shift close and reports, expense entry, staff roles, table orders, configurable Kitchen/Bar/no-preparation routing, stock custody/handover and optional hotel room folios. The app uses Next.js, Supabase and an IndexedDB local outbox, and includes English and Amharic interface messages.

## Target market

First: independent one-to-three outlet cafes, bars/tej houses and casual restaurants in Addis Ababa. Buyer is the owner/operator; daily users are cashiers, waiters, storekeepers and Kitchen/Bar staff. Expansion should follow proven onboarding and support, first to other Ethiopian urban centers, then other East African markets only after localization and regulatory/payment validation.

## Differentiation

- Connects cashier shift close, waiter table order, configured station ticket, branch inventory and staff custody in one operational flow.
- Amharic and English UI messages are present in source.
- Designed for a local-first workflow and records common local tender labels; provider settlement is not claimed.
- Focuses on hospitality daily operations rather than being a broad ERP.

These advantages are hypotheses relative to competitors, not proven exclusive capabilities. Local offerings include Dhadhamo, EliteTeQ and Easymaz; global benchmarks include Loyverse and Odoo. Public competitor feature and price claims need in-market validation.

## Business model

Proposed ETB per-outlet subscriptions with optional onboarding and multi-branch support. The current public code displays Starter ETB 0 and Business ETB 999/month, but no subscription payment flow or server-enforced entitlement system was found. Proposed price ladder and unit economics are documented in [REVENUE_MODEL.md](./REVENUE_MODEL.md).

## Current traction

**No verifiable customer count, paid revenue, retention, deployment footprint, partner, or pilot result was found in the repository.** No traction is asserted here. Source-level features and automated tests are not customer traction or production verification.

## Revenue potential (assumption only)

Illustrative base case: 98 paying outlets at ETB 900 average monthly revenue per outlet by month 12 would imply ETB 88,200 month-end MRR and ETB 1,058,400 annualized recurring run-rate. This is a formula-based scenario, not a forecast or current revenue. It assumes a founder-led acquisition funnel and an unverified 2% monthly churn; details and conservative/optimistic cases are in [REVENUE_MODEL.md](./REVENUE_MODEL.md).

## Growth strategy

1. Complete staging and real-device validation of sale, payment, stock, custody, order and retry behavior.
2. Recruit a few owner-led Addis pilot venues and measure onboarding, support load and daily usage.
3. Convert to paid plans only after plan limits, billing and support terms are clear.
4. Grow through referrals, bookkeepers, hospitality advisors and hardware/service partners; treat all as prospects until agreements exist.
5. Expand city-by-city when retention and support economics work.

## Partnership opportunities

Potential partners include local bookkeepers/accountants, tablet/printer sellers and repair shops, hospitality training providers and local payment providers for a future integration. No partnership is currently verified.

## Concise pitch

“Liyu POS is building a practical operating tool for Ethiopian cafes, restaurants and bars. It brings together fast sales, staff shifts, table orders, Kitchen/Bar preparation and inventory accountability, with a local-first architecture designed for unreliable connections. We are validating the complete financial and offline lifecycle in staging and with target devices before making production guarantees. We’re looking for a small number of Addis owner-operators to help test the workflow, identify what matters most, and establish a paid product that is simple for staff and useful to owners.”

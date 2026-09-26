# Liyu POS

A premium, mobile-first POS and operations platform for Ethiopian businesses that need speed, clarity, and reliability in the real world.

Liyu POS is built for shops, cafés, bars, hotels, and small retail businesses operating in environments where internet access is inconsistent, staff turnover is high, and daily cash reconciliation matters. It combines point-of-sale workflows, staff management, inventory monitoring, and operational reporting into one elegant system built for daily execution.

## Why teams choose Liyu POS

- Lightning-fast checkout for busy retail and hospitality teams
- Offline-first behavior when connectivity drops during the day
- English and Amharic support for local staff and business owners
- Cash and shift reconciliation designed for real store operations
- Clear reporting that helps owners spot losses, margin leaks, and sales trends
- A web experience that works like a reliable retail tool, not a generic admin dashboard

## Product snapshot

### Core capabilities

- Point-of-sale selling with product browsing, filters, cart flow, and payment handling
- Shift opening and closing with cash counts and discrepancy checks
- Inventory review, stock counts, and valuation-aware stock tracking
- Dashboard metrics for revenue, profit, stock alerts, and daily summaries
- Expense logging and operational reporting
- Telegram-enabled shift report delivery for configured business recipients
- Offline synchronization through IndexedDB and retry-safe sync flows
- Installable PWA experience for devices used in-store

### Business value

Liyu POS helps businesses move from spreadsheet chaos to a structured operational system without adding friction for staff. The platform is designed to keep front-line work simple while giving owners the confidence to monitor performance and act quickly.

---

## Product architecture at a glance

The current repository reflects a production-minded architecture built around a Next.js app, Supabase backend, and local-first operational flow.

### System layers

- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind
- App state: Zustand + React Query
- Data and auth: Supabase Auth and Postgres
- Local operations: IndexedDB for queued and cached work
- Reporting: dashboard, shift, and PDF/report generation utilities
- Delivery: Telegram-based shift report messaging

### Repository map

- [src/app](src/app) — route structure, locale-aware pages, and API handlers
- [src/components](src/components) — domain UI modules for dashboard, inventory, POS, reports, management, and shared screens
- [src/lib](src/lib) — calculations, offline logic, auth, reports, and app services
- [src/stores](src/stores) — local state for inventory, cart, auth, reports, and shifts
- [src/hooks](src/hooks) — behavioral hooks for permissions, online status, sync, and store workflows
- [src/queries](src/queries) — data access and query logic
- [src/services](src/services) — business logic and access rules
- [src/types](src/types) — typed domain structures and database contracts
- [src/i18n](src/i18n) — messages and locale configuration
- [supabase/migrations](supabase/migrations) — database schema and security evolution
- [tests](tests) — validation for critical operational flows

---

## User roles by screen

The app is structured around real business responsibilities. The roles below reflect the system’s current access model and how screens are intended to behave.

| Role | Primary use | Typical screens | Access pattern |
| --- | --- | --- | --- |
| Owner | Controls the business and sees the full picture | Dashboard, Reports, Management, Staff, Shift close, Settings | Full visibility and admin authority |
| Manager | Oversight and operational control | Dashboard, Sales, Inventory, Reports, Management | Broad operational access without owner-only controls |
| Cashier | Day-to-day selling and shift work | POS, Shift workflow, Dashboard summary | Limited to sales and relevant shift context |
| Inventory Clerk | Stock movement and counts | Inventory, Stock review, Inventory adjustments | Access focused on stock operations |

### Screen-level access summary

| Screen / area | Owner | Manager | Cashier | Inventory Clerk |
| --- | --- | --- | --- | --- |
| Dashboard | Full | Full | Summary only | Limited |
| POS / Sales | Full | Full | Full | No |
| Inventory | Full | Full | View only | Full |
| Reports | Full | Full | Own shift only / restricted | No |
| Staff / Management | Full | Full / partial depending on operation | No | No |
| Shift close | Full | Full | Full for own shift | No |
| Settings / business controls | Full | Partial | No | No |

This is aligned with the project’s role model and navigation permissions implemented in the app structure, especially in the shared navigation and authorization logic.

---

## Core workflows

### 1. Shift workflow

A cashier opens a shift, processes sales throughout the day, and closes the shift with cash reconciliation. The owner or manager can review the closing summary and delivery activity.

### 2. POS workflow

The cashier selects products, builds a cart, chooses a payment method, and completes a sale. The system keeps the operation fast and understandable on mobile devices.

### 3. Inventory workflow

Stock clerks and managers can review inventory, count stock, and reconcile counts against expected values. The app supports a low-friction inventory check without heavy manual entry.

### 4. Reporting workflow

The reporting layer summarizes sales, costs, margin, and discrepancies so owners can understand what happened in a day or week. Shift reports can also be delivered to Telegram recipients.

### 5. Offline workflow

The app caches product and operational data locally, queues pending work, and syncs it when the device reconnects. This keeps the experience resilient in low-connectivity conditions.

---

## Technology stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- `@supabase/ssr` and `@supabase/supabase-js`
- Zustand for client-side state
- React Query for data access
- IndexedDB (`idb`) for local-first persistence
- `next-intl` for localization
- PWA support for installable store-friendly workflows

---

## Local setup

### Requirements

- Node.js 20.9 or later
- npm
- A Supabase project or local Supabase stack

### Install

```bash
npm ci
```

### Environment configuration

Create a local `.env.local` file:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
MESSAGING_ENCRYPTION_KEY=YOUR_SERVER_ONLY_ENCRYPTION_KEY
TELEGRAM_BOT_TOKEN_ENCRYPTED=YOUR_ENCRYPTED_TELEGRAM_BOT_TOKEN
```

Important notes:

- `NEXT_PUBLIC_*` values are public by design
- Service-role credentials, Telegram tokens, and encryption keys are server-only
- Never commit secrets or plaintext credentials to the repo

### Run

```bash
npm run dev
```

Open http://localhost:3000

---

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production app |
| `npm start` | Start the built app |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |
| `npm test` | Run project tests |
| `npm run encrypt:telegram-bot` | Encrypt the Telegram bot token |

---

## Security and reliability

- Tenant data is protected by Supabase Auth and database-level authorization rules
- UI visibility is not a substitute for true permission checks
- Local queueing protects operational work during temporary outages
- Shift reporting is tenant-scoped and resolved server-side before delivery
- External messaging is designed to be idempotent and retry-safe

---

## Quality checks

Before shipping a change, validate the affected area with the smallest relevant checks:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

If the change affects sales, stock, offline sync, tenant access, or reporting, include tests covering the affected workflow and retry/failure paths.

---

## Development principles

- Keep business authorization on the server and database boundary
- Preserve idempotency in sync and outbound delivery flows
- Prefer clear ownership for modules and services
- Keep reports separate from calculation logic and presentation
- Add schema changes as reviewed migrations in [supabase/migrations](supabase/migrations)

---

## Architecture companion

A deeper system view is available in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). It expands on the runtime flow, data model, and operational architecture behind the app.

## Summary

Liyu POS is a practical, resilient commerce platform for Ethiopian businesses that need dependable daily operations, visible margins, and a mobile-first cashier experience. The project balances modern stack choices, local-first reliability, and business-focused UX to serve real-world retail and hospitality workflows.

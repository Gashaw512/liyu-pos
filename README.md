# Liyu POS

Liyu POS is a point-of-sale and business operations app built for day-to-day work in Ethiopian shops and hospitality businesses. It brings sales, shifts, stock, expenses, and reporting together in one mobile-friendly workspace. The interface supports English and Amharic, and ETB is used throughout the sales and reporting flows.

The project is designed to keep checkout useful when a connection is unreliable: sales can be recorded locally and synchronized when the device is back online. The browser's local database is a working cache and queue, so it should be allowed to finish its initial data load before a device is used for offline selling.

## What's in the app

- **Point of sale:** browse and search products, filter by category, record sales and payments, and review a seller’s own daily statement.
- **Shifts and cash:** open and close staff shifts, enter counted cash, and review the shift summary.
- **Inventory:** view stock, receive stock with its purchase cost, and review inventory valuation.
- **FIFO costing:** inventory receipts create cost layers. Sales consume the oldest available layer first, and sale allocations preserve the cost used for historical profit calculations.
- **Dashboard and expenses:** review business performance, stock alerts, and expense records.
- **Reports:** open daily, weekly, monthly, and custom-range sales reports, with print/PDF support on the daily report.
- **Shift report delivery:** an owner or other authorized user can configure business-specific Telegram recipients. Closing a shift can produce a PDF report and route it to enabled recipients for that business.
- **Offline synchronization:** IndexedDB stores the local catalog and pending work. The sync engine sends queued sales and related operations to the authenticated server endpoint and handles retryable failures.
- **Installable web app:** production builds generate a service worker; PWA support is disabled during local development.

WhatsApp shift-report delivery is not implemented yet. Telegram uses one server-configured bot, while each business manages its own enabled recipients. These are current product boundaries, not setup options.

## Technology

- Next.js 16 with the App Router and React 19
- TypeScript
- Supabase Auth and Postgres, accessed with `@supabase/ssr` and `@supabase/supabase-js`
- IndexedDB (`idb`) for local operational data and pending synchronization
- Tailwind CSS 4
- `next-intl` for localized routes and messages
- A generated service worker for production PWA support

## Run locally

### Requirements

- Node.js 20.9 or later and npm
- A Supabase project (or a local Supabase stack) with this repository’s migrations applied

Install dependencies from the committed lockfile:

```bash
npm ci
```

Create `.env.local` in the repository root and add the values for your Supabase project:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

The public Supabase URL and anon/publishable key are used by the browser and server clients. Never put a service-role key or other secret in a variable prefixed with `NEXT_PUBLIC_`.

Some server-side operations need additional configuration:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
MESSAGING_ENCRYPTION_KEY=YOUR_SERVER_ONLY_ENCRYPTION_KEY
TELEGRAM_BOT_TOKEN_ENCRYPTED=YOUR_ENCRYPTED_TELEGRAM_BOT_TOKEN
```

Keep these values in local environment configuration and your deployment platform’s **server-side runtime environment**. Do not commit `.env.local`, paste secrets into source files, or expose them in browser responses or logs. `.env*` files are ignored by Git. The Telegram bot token is encrypted with the project’s `MESSAGING_ENCRYPTION_KEY`; see [Telegram shift reports](#telegram-shift-reports) for setup. The encryption key must remain stable across deployments so stored credentials can still be decrypted.

Apply the SQL migrations under [`supabase/migrations`](supabase/migrations) to the intended database using your team's Supabase migration workflow. Review each migration and confirm the target project before applying it; do not use production as a development database.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local development uses Webpack and does not generate/register the production service worker.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Create the production build. |
| `npm start` | Serve a previously created production build. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Check TypeScript without emitting files. |
| `npm test` | Run the shift-report PDF, encryption, delivery, and tenant-routing tests. |
| `npm run encrypt:telegram-bot` | Encrypt a Telegram bot token for server configuration. |

The test script uses Node's built-in test runner and the native TypeScript stripping flag. Use a Node release that supports `--experimental-strip-types` when running it.

## Telegram shift reports

Shift reports use one Telegram bot configured for the application. Recipient lists and the enabled state belong to individual businesses. The closing request is associated with the authenticated user and shift; the server resolves the business and sends only to that business's enabled recipients. The browser does not choose the tenant for delivery.

1. Set the server-only `MESSAGING_ENCRYPTION_KEY` on the deployment environment. It must be a 32-byte key in the format accepted by [`src/lib/shift-reports/crypto.ts`](src/lib/shift-reports/crypto.ts). Keep it private and stable.
2. Provide the bot token to the encryption script through the secure local setup described by the script, then run `npm run encrypt:telegram-bot`. Store the resulting ciphertext as `TELEGRAM_BOT_TOKEN_ENCRYPTED` in the server runtime environment. Do not commit the token or ciphertext.
3. In the app, open **Management > Shift report messages**, add each recipient's Telegram chat ID, enable the intended recipients, save, and use **Test all enabled recipients**.
4. Close a shift to generate and deliver its PDF report. Failed deliveries are retained for retry, and delivery records protect against duplicate notifications.

The bot token and encryption key are never settings to share with a business recipient. Business users manage only their own recipient list. WhatsApp is currently shown as unavailable because Meta document-delivery credentials and integration are not present.

## Where to look in the code

| Area | Location |
| --- | --- |
| Local persistence and sync | [`src/lib/offline`](src/lib/offline), [`src/app/api/sync/route.ts`](src/app/api/sync/route.ts) |
| POS and shift workflows | [`src/app/[locale]/(app)/sales`](src/app/%5Blocale%5D/%28app%29/sales), [`src/components/pos`](src/components/pos), [`src/components/shifts`](src/components/shifts) |
| Inventory and stock receipt UI | [`src/app/[locale]/(app)/inventory`](src/app/%5Blocale%5D/%28app%29/inventory), [`src/components/inventory`](src/components/inventory) |
| Dashboard and expenses | [`src/app/[locale]/(app)/dashboard`](src/app/%5Blocale%5D/%28app%29/dashboard), [`src/components/dashboard`](src/components/dashboard) |
| Sales reports | [`src/app/[locale]/(app)/reports`](src/app/%5Blocale%5D/%28app%29/reports), [`src/lib/reports`](src/lib/reports), [`src/components/reports`](src/components/reports) |
| Telegram report generation and delivery | [`src/lib/shift-reports`](src/lib/shift-reports), [`src/app/api/shift-reports`](src/app/api/shift-reports) |
| Supabase schema history | [`supabase/migrations`](supabase/migrations) |
| Automated checks | [`tests`](tests), [`.github/workflows`](.github/workflows) |

The database is the shared source of truth for synchronized records. Local IndexedDB exists to support the active device's workflow and its pending queue; clearing browser storage removes that device's cached catalog and unsynchronized local work. Make sure queued work has synchronized before clearing site data or changing devices.

## Data and security notes

- Supabase Auth identifies the current user. Database Row Level Security and server-side authorization protect tenant data; application screens should not treat a client-provided business ID as proof of access.
- `NEXT_PUBLIC_*` variables are public by design. Service-role credentials, encryption keys, and the Telegram bot token are server-only.
- Offline records may remain on a device until synchronization succeeds. Keep POS devices controlled by the business and avoid clearing browser data while work is pending.
- FIFO cost layers track receipt quantity and unit cost. Sale cost allocations are stored against sale items so later receipts do not rewrite the cost of older sales.

## Quality checks and CI

The frontend workflow installs dependencies, runs TypeScript, lint, and a production build. The database workflow validates the Supabase migration sequence. Run the checks locally before submitting a change:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

If a change affects sales, stock, offline sync, tenant access, or shift delivery, include tests for the affected behavior and for relevant failure or retry paths. A passing build alone does not verify synchronization or tenant isolation.

## Making changes

- Keep business and tenant authorization on the server/database boundary; UI visibility is not an access check.
- Preserve idempotency when adding work to offline queues or external delivery, since clients and networks may retry requests.
- Add database changes as reviewed migrations in `supabase/migrations` and keep generated types and application behavior aligned.
- Prefer small, focused components and services with clear ownership. Keep report presentation separate from data loading and calculations.
- Verify the smallest relevant test first, then run the broader checks when the change warrants it.

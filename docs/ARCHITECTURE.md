# Liyu POS Architecture

This document explains the system architecture behind the current Liyu POS application as it exists in this repository. It complements the product overview in the root README and focuses on how the app is structured, how data flows, and how responsibilities are split across front-end, local persistence, and backend services.

## 1. Product and system intent

Liyu POS is designed for store and hospitality operations in environments with inconsistent connectivity, shared staff devices, and fast daily cash workflows. The product is not a generic SaaS dashboard; it is a front-line operational system built around the realities of Ethiopian small businesses.

The core design principles are:

- work quickly at the point of sale
- keep staff productive even when offline
- preserve business accountability and tenant boundaries
- provide owners with clear performance and loss visibility
- support multi-role operations with controlled access

## 2. Architectural layers

### 2.1 Presentation layer

The application UI is implemented in Next.js App Router pages and components. The project organizes screens by business domain such as:

- dashboard
- inventory
- pos
- reports
- shifts
- management
- onboarding
- shared UI and navigation

This structure keeps business concerns separated while making each module easy to reason about.

### 2.2 State and data access layer

The app uses a combination of:

- Zustand for local app state and store-based workflows
- React Query for fetched data and query orchestration
- route-level server actions and API routes for authenticated operations

This separation allows the app to behave like a modern retail workflow while still supporting secure tenant-aware operations.

### 2.3 Local-first operational layer

A key design decision is local-first operation. For devices operating in a real shop environment, the app persists local operational data in IndexedDB to support the following:

- selling while offline
- queued changes and retries
- local product cache while devices reconnect
- delayed synchronization without losing work

This layer allows the app to remain operational even when the network is flaky or momentarily down.

### 2.4 Database and authorization layer

The app relies on Supabase Postgres as the shared source of truth for synchronized records. The repository includes migration-based schema evolution under [supabase/migrations](../supabase/migrations).

Important design intent:

- the database is the system of record
- client state is not trusted as security evidence
- business access is enforced using server-side logic and database-level authorization

### 2.5 Reporting and delivery layer

Reporting and delivery services are separated from the UI to keep business logic and communication concerns clean. This includes:

- dashboard summaries
- shift metrics
- PDF/structured report generation
- Telegram delivery for configured recipients
- retry-safe handling of delivery failures

## 3. Core runtime flow

### 3.1 User session and tenant context

The app begins with a Supabase-authenticated session. User profile and business context determine which screens and permissions are appropriate for that user.

Key behavior:

- session identifies the user
- profile resolves role and tenant
- server-side checks rank above any client-only UI visibility

### 3.2 Sales flow

A typical sales runtime path is:

1. user logs in
2. shift context is resolved or created
3. product catalog is loaded from local cache or server data
4. cart updates occur in local state
5. sale is recorded and placed in the local pending queue if needed
6. when online, the pending work is synchronized with the server

This preserves a practical retail workflow while keeping the data model consistent.

### 3.3 Inventory and reconciliation flow

Inventory work follows a similar pattern:

- count and stock movement data is captured in the app
- inventory discrepancies can be displayed immediately
- the system keeps a record of the movement and stock state
- later sync moves that data to the canonical backend records

This supports daily operational tracking and helps managers understand stock issues without requiring a full back-office process.

### 3.4 Shift closing flow

The shift close path is a critical workflow because it combines:

- cash accountability
- sales totals
- owner / manager visibility
- report generation
- optional notification delivery

The closing operation depends on reliable user context, role validation, and business scoping so the generated report always belongs to the right business and staff member.

## 4. Data model boundaries

The project structures data around operational realities rather than an abstract SaaS model. Several domains are clearly separated:

- businesses
- branches
- profiles / staff
- products and categories
- suppliers and purchases
- inventory and stock movements
- sales and sale items
- payments
- shifts
- expenses
- audit records
- report delivery records

This reflects the working structure of a real retail business system and allows tenant-aware reporting and audit trails.

## 5. Multi-role access model

The app recognizes a few primary roles that shape access, navigation, and workflow rights:

- owner
- manager
- cashier
- inventory clerk

Each role is mapped to navigation and business capabilities. The design avoids broad client-side trust and instead relies on server and database-level validation as the real authority.

### Example access objectives

- owner: broad control and reporting
- manager: operational oversight and management tasks
- cashier: daily sales and shift actions
- inventory clerk: stock movement and counting tasks

This is consistent with the role-based patterns in the navigation and access utilities in the frontend code.

## 6. Offline-first design

### Why it matters

The app needs to support store work even when connectivity fails. This is a product requirement, not an implementation preference.

### Offline architecture

The offline design includes:

- local IndexedDB storage for operational data
- capability to queue pending work
- retry-safe synchronization when connectivity returns
- local display of relevant states like offline or pending sync

The system is intentionally designed to preserve user work and avoid destructive local state loss when a worker temporarily loses connectivity.

## 7. Reporting architecture

The reporting layer combines business data with presentation concerns. It is split conceptually into:

- calculation logic
- report aggregation and filtering
- presentation for the UI
- delivery and export workflows

This separation helps keep metrics accurate and the UI easier to maintain.

## 8. Security architecture

The security model is built around the idea that the app is a business system, not merely a front-end display.

### Key principles

- authenticate users with Supabase Auth
- resolve business, branch, and role from profile data
- enforce authorization at the server/database boundary
- keep business data isolated per tenant
- keep security-sensitive data out of client-visible logs and public env vars

### Example-sensitive flows

- shift report delivery
- tax and financial reporting
- access to business dashboards
- role transitions and management actions

These flows must be permission-checked and not trusted based on UI state alone.

## 9. Operational performance assumptions

The product is optimized for practical, low-end mobile environments:

- large touch targets for staff-operated screens
- minimal friction and low cognitive load
- fast information hierarchy on core screens
- lightweight rendering for critical operational pages
- offline resilience for the most important use cases

## 10. Recommended future evolution

The current architecture is already strong for a local retail workflow, but it can evolve further with:

- stronger typed domain boundaries between service layers
- deeper test coverage around sync retries and business access rules
- more explicit audit logging at the business process layer
- broadened reporting capabilities for weekly and custom-range analysis
- optional native app packaging for device-specific deployment

## 11. Summary

Liyu POS is a business operations platform designed for the realities of Ethiopian commerce. Its architecture intentionally combines a modern Next.js frontend, a tenant-aware Supabase backend, and an offline-first local layer so staff can keep working while owners retain visibility and control.

That combination is the foundation of the product: practical for daily operations, resilient for connectivity issues, and structured for business accountability.

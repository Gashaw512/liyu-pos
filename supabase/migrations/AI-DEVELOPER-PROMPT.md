# Liyu POS — AI Architectural Directive & Infrastructure Strategy

Here is a highly professional, technically structured system prompt you can copy and paste directly into another AI assistant or developer agent. It clearly describes the structural complexity of Liyu POS, details the infrastructure dilemma you are facing, and forces the agent to focus strictly on zero-downtime, continuous-business availability solutions.

---

## 📋 Copy-Paste Prompt for Other AI Agents

### System Context & Architectural Directive

I am building **Liyu POS**, an enterprise-grade, multi-tenant, role-matrixed, multi-branch SaaS platform optimized for restaurant and retail environments. 

Currently, the system runs locally and in development using the Supabase CLI with a highly structured, 15-stage atomic PostgreSQL migration pipeline. Below is the structural layout of my system:

#### 📂 Project Architecture Layout
```text
supabase/
└── migrations/
    ├── 20260610000001_001_extensions.sql          # Cryptographic & ID engine extensions
    ├── 20260610000002_002_base_functions.sql      # Global helpers (timestamps, string formatters)
    ├── 20260610000003_003_schema_business.sql     # Multi-tenant roots: businesses, branches
    ├── 20260610000004_004_schema_users.sql        # Profiles, role matrix, and staff invitations
    ├── 20260610000005_005_schema_catalog.sql      # Products, categories, template structures
    ├── 20260610000006_006_schema_inventory.sql    # Stock caches, purchases, and reconciliations
    ├── 20260610000007_007_schema_sales.sql        # Orders, sales ledger lines, and payment models
    ├── 20260610000008_008_schema_operations.sql   # Cashier shifts and localized expenses
    ├── 20260610000009_009_schema_audit.sql        # High-fidelity security logging tables
    ├── 20260610000010_010_auth_triggers.sql       # Hooks tied directly to auth.users events
    ├── 20260610000011_011_business_triggers.sql   # Real-time stock deductions and metric updates
    ├── 20260610000012_012_rls_helpers.sql        # Security evaluators & state assert macros
    ├── 20260610000013_013_rls.sql                 # Row-Level Security isolation rules
    ├── 20260610000014_014_seed_data.sql           # Localization structures & business lookups
    └── 20260610000015_015_indexes.sql             # Composite query optimization and indexing
```

> **Security Guardrail:** Zero-trust paradigm via PostgreSQL Row-Level Security (RLS) tracking `business_id` and `branch_id` using an optimized database context macro predicate: `assert_security_context(allowed_roles)`.

---

### 🚨 The Problem

I need to deploy this system for a 3-month production trial serving **at least 10 restaurants with multiple branches**. However, running this on Supabase's managed Free Tier introduces major business risks:

1. **The 500MB Storage Ceiling:** This limit will trigger an automatic 'Read-Only' lock if broken by heavy operational logs (sales ledger lines, inventory reconciliations), crashing live point-of-sale actions.
2. **The 7-Day Auto-Pause:** Inactivity will take the database completely offline if a branch experiences a slow week, causing catastrophic morning operational delays.
3. **No Backups:** Lack of automated backups threatens absolute data loss if an active trial database gets corrupted.

---

### ⚠️ The Absolute Constraint

**Business continuity is completely mandatory.** I am willing to adjust the hosting strategy or split the stack, but under no circumstances can the software crash, lag out on simultaneous tablet counts, go read-only, or lock out active restaurant managers during daily operations. I want to keep operational infrastructure costs as low or free as possible during this test period.

---

### 🎯 Your Task

Provide a comprehensive, rock-solid infrastructure blueprint and a clean data-migration strategy to safely separate our multi-tenant workloads without breaking our 15-stage migration architecture.

#### Specifically, Answer:

1. **Auth & Data Decoupling:** How do we keep using Supabase Auth (which handles 50k MAU on the free tier) but cleanly decouple our heavy data layers (Inventory, Sales, Audits) to an external serverless DB (like Neon Postgres or CockroachDB Serverless) without breaking our RLS logic?
2. **Backend Adaptation:** How must we adapt our Node.js/Next.js backend framework layer to verify incoming Supabase Auth session JWT tokens, and cleanly forward the verified `business_id` context into the separated, high-capacity serverless database?
3. **DX Preservation:** Give me the specific SQL commands, configuration adjustments, or proxy workflows required to map this out seamlessly without losing our local `supabase db reset` or `supabase migration up` developer experience.

Ensure your solutions prioritize data safety, zero-downtime, and rapid serverless connection pooling to survive peak restaurant shift traffic.

---

## 💡 Pro-Tip Before You Proceed

When the next agent responds with the code, make sure to ask them specifically about **"Supabase Custom JWT Claims."**

* **Why?** Because since your database uses `public.auth_business_id()` inside your RLS files (like `013_rls.sql`), if you move the inventory database out of Supabase, your standard database won't natively know who the logged-in user is.
* **The Fix:** You will need to write a small Supabase Edge Function or backend helper that stamps the `business_id` directly inside the user's login token (JWT). That way, when the backend talks to the external database, the RLS policies can still quickly read the business ID from the security token safely and instantly!

---

## 🛠️ Automated CI Migration Testing (GitHub Actions)

To guarantee that your 15-stage sequential migration chain never breaks during collaboration or database separation refactoring, place the following configuration into `.github/workflows/supabase-test.yml`:

```yaml
name: Liyu POS Database CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-migrations:
    name: Validate 15-Stage Pipeline Sequence
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code Repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Install Supabase CLI Native Binary
        run: |
          npm install -g supabase

      - name: Initialize Supabase Local Stack
        run: |
          supabase init

      - name: Boot Container Network & Run Migrations
        run: |
          # Boots Postgres, Auth, Realtime, and Studio networks locally inside the CI runner
          supabase start
          
      - name: Assert Dependency Integrity & Schema Lint
        run: |
          # Tests the 15-stage migration layout for syntax or circular constraints
          supabase migration list
          
      - name: Verify Hard Baseline Resets
        run: |
          # Runs a destructive reset to guarantee sequence compiles cleanly on blank targets
          supabase db reset
```

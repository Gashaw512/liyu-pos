# Liyu POS — Enterprise Multi-Tenant Database Architecture

[![Supabase](https://img.shields.io/badge/Backend-Supabase-green?style=flat-square&logo=supabase)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%2B-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Multi--Tenant%20%7C%20Offline--First-orange?style=flat-square)]()

This repository contains the enterprise-grade, distributed database schema for **Liyu POS**—a multi-tenant, role-matrixed, multi-branch SaaS platform optimized for restaurant and retail environments. 

The schema has been completely refactored from a monolithic migration script into a **15-stage atomic migration pipeline** to eliminate circular dependencies, guarantee strict data isolation (RLS), and handle distributed, offline-first client replication cleanly.

---

##  15-Stage Migration Blueprint

To prevent schema failures during a clean database initialization, migrations must be executed in a strict, dependency-aware sequence. Parent lookups and infrastructure functions must compile before child foreign key attachments are asserted.

```mermaid
graph TD
    001[001_extensions.sql] --> 002[002_base_functions.sql]
    002 --> 003[003_schema_business.sql]
    003 --> 004[004_schema_users.sql]
    004 --> 005[005_schema_catalog.sql]
    005 --> 006[006_schema_inventory.sql]
    006 --> 007[007_schema_sales.sql]
    007 --> 008[008_schema_operations.sql]
    008 --> 009[009_schema_audit.sql]
    009 --> 010[010_auth_triggers.sql]
    010 --> 011[011_business_triggers.sql]
    011 --> 012[012_rls_helpers.sql]
    012 --> 013[013_rls.sql]
    013 --> 014[014_seed_data.sql]
    014 --> 015[015_indexes.sql]
   ```
## Directory Structure & Allocation
```Plaintext
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
## ⚡ Local Setup & Migration Execution

Follow these step-by-step instructions to spin up the local environment, apply the migration sequence, and verify the multi-tenant architecture locally.

### 1. Prerequisites
Ensure you have the following toolchains installed locally:
* **Docker Desktop** (Required for containerized database execution)
* **Node.js LTS & npm**
* **Supabase CLI** (Native database control harness)

#### Install Supabase CLI

```bash
# MacOS via Homebrew
brew install supabase/tap/supabase

# Windows via Scoop
scoop bucket add supabase [https://github.com/supabase/scoop-bucket.git](https://github.com/supabase/scoop-bucket.git)
scoop install supabase
```
### 2. Initialize the Local Environment
Navigate to your project root folder and spin up the container network:
```bash
# Initialize local project context configuration
supabase init

# Start local Supabase container cluster (PostgreSQL, Auth, Storage, Studio)
supabase start
```
#### Note:
Once running, make note of the Studio URL (typically http://localhost:54323), which serves as your local visual administrative dashboard.

### 3. Deploy the Migration Chain
To clean up your local directory and ensure strict deployment tracking, distribute your SQL modules across the exact chronological files listed in the 15-stage blueprint, then run:
```bash
# Validates SQL syntax and pushes the 15-file migration chain sequentially
supabase migration up

# Check status to ensure all migration blocks applied successfully
supabase migration list
```
### 4. Resetting & Re-building from Scratch
If you modify schemas during local development, do not stack fix-it scripts. Execute a hard baseline reset to verify that your full migration dependency order remains completely unbroken:
```bash
supabase db reset
```
## Security Architecture (Row-Level Security)
Liyu POS applies a zero-trust paradigm directly at the data layer. Multi-tenant partitioning relies on session validation context using lightweight, caching security functions instead of slow application-layer filter injections.

### Context Security Macro
Rather than embedding repeated role and status validations inside every unique query target, security policies reference the optimized macro predicate ```assert_security_context(allowed_roles):```

```sql
CREATE OR REPLACE FUNCTION public.assert_security_context(allowed_roles VARCHAR(30)[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    public.auth_is_profile_active() AND 
    public.auth_has_any_role(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Multi-Tenant Rule Enforcement Patterns
### Direct Property Isolation
Tables tracking data via a native foreign key rely directly on tenant validation checks:
```sql
CREATE POLICY "Product access isolation" ON public.products
  FOR ALL USING (business_id = public.auth_business_id());
```
### Relational Context Interception
Deep transactional line items (like sale_items) traverse up through parent records via relational lookups optimized with highly efficient EXISTS predicates to ensure index utilization:
```sql
CREATE POLICY "Sale items line tracking isolation" ON public.sale_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sales 
    WHERE public.sales.id = public.sale_items.sale_id 
      AND public.sales.business_id = public.auth_business_id()
  ));
```
## 📈 Future Enhancements for Enterprise Readiness

To transition this core operational engine into an enterprise-ready distributed SaaS platform, prioritize deploying the following architectural milestones:

### 1. Offline-First Sync Architecture (`sync_queue`)
To insulate physical POS terminals against local network dropouts or latency spikes, implement a multi-master replication queue to capture state changes locally before draining changes securely back to the upstream cloud database.

```sql
CREATE TABLE public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_mutation_id VARCHAR(100) UNIQUE NOT NULL, -- Client-side state tracking token
    table_name VARCHAR(80) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    payload JSONB NOT NULL,
    processed_status VARCHAR(20) DEFAULT 'pending' CHECK (processed_status IN ('pending', 'applied', 'conflict')),
    conflict_resolution_strategy VARCHAR(50) DEFAULT 'client_wins',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_pending ON public.sync_queue(business_id, processed_status) 
WHERE processed_status = 'pending';
```


## 👨‍💻 Contributing Core Guidelines

* **Database First:** All data model adjustments must originate as sequential migration files inside `supabase/migrations/`. Never alter schema structures directly via the live online Supabase Dashboard UI to protect production environment predictability.
* **Deterministic Generation:** Always prefix new structural updates with accurate timestamp signatures (`YYYYMMDDHHMMSS_name.sql`) to keep environment configurations perfectly synchronized across all engineering team workstations.




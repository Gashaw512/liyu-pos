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

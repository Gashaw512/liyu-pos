# Liyu POS — Enterprise Multi-Tenant Database Architecture

[![Supabase](https://img.shields.io/badge/Backend-Supabase-green?style=flat-square&logo=supabase)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015%2B-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Multi--Tenant%20%7C%20Offline--First-orange?style=flat-square)]()

This repository contains the enterprise-grade, distributed database schema for **Liyu POS**—a multi-tenant, role-matrixed, multi-branch SaaS platform optimized for restaurant and retail environments. 

The schema has been completely refactored from a monolithic migration script into a **15-stage atomic migration pipeline** to eliminate circular dependencies, guarantee strict data isolation (RLS), and handle distributed, offline-first client replication cleanly.

---

## 🏗️ 15-Stage Migration Blueprint

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

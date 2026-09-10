-- ============================================================
-- 015_indexes.sql
-- Domain: Global Database Query Optimization Ledger
-- Dependencies: All Schema Domain Files (003 - 009)
-- ============================================================

-- ─── 1. CORE BUSINESS & USER OPTIMIZATIONS ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_active ON public.businesses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_business ON public.branches(business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_business ON public.profiles(business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(business_id, role);
CREATE INDEX IF NOT EXISTS idx_profile_roles_lookup ON public.profile_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_code ON public.staff_invitations(code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_staff_invitations_business ON public.staff_invitations(business_id);

-- ─── 2. CATALOG ENGINE OPTIMIZATIONS ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;

-- ─── 3. INVENTORY & REALTIME CONTROL OPTIMIZATIONS ─────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON public.inventory(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_prod ON public.inventory_movements(business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON public.purchases(business_id) WHERE deleted_at IS NULL;

-- ─── 4. TRANSACTIONS & SALES PERFORMANCE OPTIMIZATIONS ─────────────────
CREATE INDEX IF NOT EXISTS idx_sales_business_created ON public.sales(business_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_parent ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);

-- ─── 5. OPERATION METRIC OPTIMIZATIONS ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shifts_active ON public.shifts(business_id, branch_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(business_id, expense_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);


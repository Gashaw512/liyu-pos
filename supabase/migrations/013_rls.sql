-- ============================================================================
-- 013_rls.sql
-- Domain: Row-Level Security (RLS) Isolation Enforcements
-- Dependencies: All Schema Domain Files (003 - 009), 012_rls_helpers.sql
-- ============================================================================

-- ─── 1. GLOBAL FORCE ACTIVATE RLS ───────────────────────────────────────
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_groups ENABLE ROW LEVEL SECURITY; -- Bono security activation
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── 2. CORE DOMAIN RLS POLICIES ───────────────────────────────────────

-- BUSINESSES
CREATE POLICY "Users can view their own business profile" ON public.businesses
  FOR SELECT USING (id = public.auth_business_id());

CREATE POLICY "Owners can update their own business profile" ON public.businesses
  FOR UPDATE USING (id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner']));

-- BRANCHES
CREATE POLICY "Users can access branches belonging to their business" ON public.branches
  FOR ALL USING (business_id = public.auth_business_id());

-- ONBOARDING PROGRESS
CREATE POLICY "Users can view and edit business onboarding state" ON public.onboarding_progress
  FOR ALL USING (business_id = public.auth_business_id());

-- PROFILES
CREATE POLICY "Profiles are readable by co-workers within the same business" ON public.profiles
  FOR SELECT USING (business_id = public.auth_business_id());

CREATE POLICY "Users can modify their own individual profiles" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Management can modify subordinate profiles" ON public.profiles
  FOR ALL USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner', 'manager']));

-- PROFILE ROLES
CREATE POLICY "Profile roles read isolation within business" ON public.profile_roles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE public.profiles.id = public.profile_roles.profile_id AND public.profiles.business_id = public.auth_business_id()
  ));

-- STAFF INVITATIONS
-- CREATE POLICY "Staff invitations accessible by business managers" ON public.staff_invitations
--   FOR ALL USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner', 'manager']));


-- DROP POLICY IF EXISTS "Staff invitations accessible by business managers"
-- ON public.staff_invitations;

-- =====================================================
-- STAFF INVITATIONS RLS (SIMPLIFIED WORKING VERSION)
-- =====================================================


-- OWNER/MANAGER FULL ACCESS = Read, Update, select, delete
CREATE POLICY "Staff invites full access"
ON public.staff_invitations
FOR ALL
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(ARRAY['owner','manager'])
)
WITH CHECK (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(ARRAY['owner','manager'])
);

-- PUBLIC CAN ONLY CHECK PENDING INVITES BY CODE
CREATE POLICY "Public invite validation"
ON public.staff_invitations
FOR SELECT
USING (
  status = 'pending'
);


-- CATEGORIES & TEMPLATES
CREATE POLICY "Category access isolation" ON public.categories
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

CREATE POLICY "Global template access allowed to all authenticated accounts" ON public.category_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- PRICE GROUPS (BONO)
CREATE POLICY "Bono pricing groups isolation" ON public.price_groups
  FOR ALL 
  USING (
    business_id = public.auth_business_id() 
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    business_id = public.auth_business_id() 
    AND public.auth_has_any_role(ARRAY['owner', 'manager'])
  );
-- PRODUCTS
CREATE POLICY "Product access isolation" ON public.products
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

-- SUPPLIERS
CREATE POLICY "Supplier management isolation" ON public.suppliers
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

-- RESTAURANT TABLES
CREATE POLICY "Restaurant tables isolation" ON public.restaurant_tables
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

-- INVENTORY & MOVEMENTS
CREATE POLICY "Inventory records isolation" ON public.inventory
  FOR ALL USING (business_id = public.auth_business_id());

CREATE POLICY "Inventory ledger movements isolation" ON public.inventory_movements
  FOR ALL USING (business_id = public.auth_business_id());

-- PURCHASES & ITEMS
CREATE POLICY "Purchases system isolation" ON public.purchases
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

CREATE POLICY "Purchase items system isolation" ON public.purchase_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.purchases 
    WHERE public.purchases.id = public.purchase_items.purchase_id 
      AND public.purchases.business_id = public.auth_business_id()
      AND public.purchases.deleted_at IS NULL
  ));

-- SALES, ITEMS, PAYMENTS
CREATE POLICY "Sales transactional isolation" ON public.sales
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

CREATE POLICY "Sale items line tracking isolation" ON public.sale_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sales 
    WHERE public.sales.id = public.sale_items.sale_id 
      AND public.sales.business_id = public.auth_business_id()
      AND public.sales.deleted_at IS NULL
  ));

CREATE POLICY "Payment ledger transaction isolation" ON public.payments
  FOR ALL USING (business_id = public.auth_business_id());

-- SHIFTS & EXPENSES
CREATE POLICY "Operational shifts tracking isolation" ON public.shifts
  FOR ALL USING (business_id = public.auth_business_id());

CREATE POLICY "Operational business expenses isolation" ON public.expenses
  FOR ALL USING (business_id = public.auth_business_id() AND deleted_at IS NULL);

-- STOCK RECONCILIATIONS
CREATE POLICY "Stock audit reconciliations isolation" ON public.stock_reconciliations
  FOR ALL USING (business_id = public.auth_business_id());

-- AUDIT LOGS
CREATE POLICY "Security audit log ledger read restriction" ON public.audit_logs
  FOR SELECT USING (business_id = public.auth_business_id() AND public.auth_has_any_role(ARRAY['owner', 'manager']));


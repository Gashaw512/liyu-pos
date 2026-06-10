-- -- npx supabase init 
-- -- npx supabase start 
-- -- npx supabase db reset 
-- -- npx supabase migrations new 002_security_and_rls
-- -- npx supabase migrations new 001_schema 


-- -- ========================================================
-- -- LIYU POS — SECURITY ARCHITECTURE (RLS & HELPER FUNCTIONS)
-- -- ========================================================

-- -- Enable RLS across all core data assets
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_reconciliations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- -- Security Definer functions to safely read context without policy recursion
-- CREATE OR REPLACE FUNCTION auth_business_id()
-- RETURNS UUID AS $$
--   SELECT business_id FROM public.profiles
--   WHERE id = auth.uid() AND deleted_at IS NULL
--   LIMIT 1;
-- $$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- CREATE OR REPLACE FUNCTION auth_role()
-- RETURNS TEXT AS $$
--   SELECT role FROM public.profiles
--   WHERE id = auth.uid() AND deleted_at IS NULL
--   LIMIT 1;
-- $$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- -- 1. BUSINESSES POLICIES
-- CREATE POLICY "business_tenant_isolation_select" ON businesses FOR SELECT USING (id = auth_business_id());
-- CREATE POLICY "business_owner_modify" ON businesses FOR UPDATE USING (id = auth_business_id() AND auth_role() = 'owner');

-- -- 2. BRANCHES POLICIES
-- CREATE POLICY "branches_tenant_isolation_select" ON branches FOR SELECT USING (business_id = auth_business_id());
-- CREATE POLICY "branches_owner_modify" ON branches FOR ALL USING (business_id = auth_business_id() AND auth_role() = 'owner');

-- -- ============================================
-- -- 3. PROFILES POLICIES (UPDATED TO PREVENT RECURSION)
-- -- ============================================
-- CREATE POLICY "profiles_secure_select" ON public.profiles
--   FOR SELECT 
--   TO authenticated
--   USING (
--     id = auth.uid() 
--     OR 
--     business_id = auth_business_id()
--   );

-- CREATE POLICY "profiles_secure_administrative" ON public.profiles
--   FOR ALL
--   TO authenticated
--   USING (
--     business_id = auth_business_id() 
--     AND 
--     auth_role() IN ('owner', 'manager')
--   );

-- -- 4. PRODUCTS POLICIES
-- CREATE POLICY "products_tenant_select" ON products FOR SELECT USING (business_id = auth_business_id());
-- CREATE POLICY "products_administrative_modify" ON products FOR ALL USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));

-- -- 5. SALES POLICIES
-- CREATE POLICY "sales_tenant_select" ON sales FOR SELECT USING (business_id = auth_business_id());
-- CREATE POLICY "sales_staff_insert" ON sales FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_role() IN ('owner','manager','cashier'));
-- CREATE POLICY "sales_administrative_void" ON sales FOR UPDATE USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));

-- -- 6. SHIFTS POLICIES
-- CREATE POLICY "shifts_tenant_and_staff_select" ON shifts FOR SELECT USING (business_id = auth_business_id() AND (auth_role() IN ('owner','manager') OR cashier_id = auth.uid()));
-- CREATE POLICY "shifts_staff_insert" ON shifts FOR INSERT WITH CHECK (business_id = auth_business_id() AND auth_role() IN ('owner','manager','cashier'));
-- CREATE POLICY "shifts_staff_update" ON shifts FOR UPDATE USING (business_id = auth_business_id() AND (auth_role() IN ('owner','manager') OR cashier_id = auth.uid()));

-- -- 7. INVENTORY POLICIES
-- CREATE POLICY "inventory_tenant_select" ON inventory FOR SELECT USING (business_id = auth_business_id());
-- CREATE POLICY "inventory_clerk_modify" ON inventory FOR UPDATE USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager','inventory_clerk'));

-- -- 8. AUDIT LOGS POLICIES
-- CREATE POLICY "audit_logs_administrative_select" ON audit_logs FOR SELECT USING (business_id = auth_business_id() AND auth_role() IN ('owner','manager'));


-- -- ========================================================
-- -- BACKEND PROVISIONING PIPELINE AUTOMATION (SOLVES REGISTRATION RLS LOCKS)
-- -- ========================================================

-- CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   new_business_id UUID;
--   new_branch_id   UUID;
--   biz_name        TEXT;
--   biz_type        TEXT;
--   full_name_val   TEXT;
-- BEGIN
--   -- Safely pull data sent from the registration frontend form state
--   biz_name      := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store');
--   biz_type      := COALESCE(NEW.raw_user_meta_data->>'business_type', 'other');
--   full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Owner');

--   -- Step A: Set up Business Workspace Record
--   INSERT INTO public.businesses (name, type, phone, plan, currency)
--   VALUES (biz_name, biz_type, NEW.phone, 'starter', 'ETB')
--   RETURNING id INTO new_business_id;

--   -- Step B: Set up Default Main Headquarters Operational Branch
--   INSERT INTO public.branches (business_id, name, phone, is_main, is_active)
--   VALUES (new_business_id, 'ዋና ቅርንጫፍ (Main Branch)', NEW.phone, TRUE, TRUE)
--   RETURNING id INTO new_branch_id;

--   -- Step C: Map Profile Relationship Back to the Auth Record
--   INSERT INTO public.profiles (id, business_id, branch_id, full_name, phone, role, language, is_active)
--   VALUES (NEW.id, new_business_id, new_branch_id, full_name_val, NEW.phone, 'owner', 'am', TRUE);

--   RETURN NEW;
-- EXCEPTION WHEN OTHERS THEN
--   RETURN NULL; -- Drop bad transactions safely
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -- Setup the execution event listener hook on Supabase Auth Engine engine
-- DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
-- CREATE TRIGGER trg_on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
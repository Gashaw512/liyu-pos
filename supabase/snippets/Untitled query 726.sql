-- Remove the recursive policies
DROP POLICY IF EXISTS "profiles_self_lookup_and_tenant_view" ON public.profiles;
DROP POLICY IF EXISTS "profiles_administrative_management" ON public.profiles;

-- 1. Optimized Profile Read Policy (No inner select recursion)
CREATE POLICY "profiles_secure_select" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    business_id = auth_business_id()
  );

-- 2. Optimized Profile Management Policy (Uses your safe helper function)
CREATE POLICY "profiles_secure_administrative" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    business_id = auth_business_id() 
    AND 
    auth_role() IN ('owner', 'manager')
  );



  select * from onboarding_progress;
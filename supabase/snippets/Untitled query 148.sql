create policy "Only business owners can invite staff"
on staff_invitations
for insert
to authenticated
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('owner', 'manager')
  )
);



-- STAFF INVITATIONS INSERT POLICY (FIXED)
create policy "Allow owners and managers to create invitations"
on staff_invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.business_id = staff_invitations.business_id
      and profiles.role in ('owner', 'manager')
      and profiles.is_active = true
  )
);



alter policy "Allow owners and managers to create invitations"
on staff_invitations
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.business_id = staff_invitations.business_id
      and profiles.role in ('owner', 'manager')
      and profiles.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.business_id = staff_invitations.business_id
      and profiles.role in ('owner', 'manager')
      and profiles.deleted_at is null
  )
);



select * from staff_invitations;
select * from inventory;


alter table staff_invitations
add column phone text;


DROP POLICY IF EXISTS "Staff invitations accessible by business managers"
ON public.staff_invitations;

CREATE POLICY "Staff invitations - read access"
ON public.staff_invitations
FOR SELECT
USING (
  business_id = public.auth_business_id()
);



CREATE POLICY "Staff invitations - update by managers only"
ON public.staff_invitations
FOR UPDATE
USING (
  business_id = public.auth_business_id()
  AND public.auth_has_any_role(ARRAY['owner', 'manager'])
)
WITH CHECK (
  business_id = public.auth_business_id()
);

alter table public.staff_invitations
add column expires_at timestamptz;



select * from staff_invitations
where code = 'LY-E90D41';


-- 2. Create profile (AUTO LINK EVERYTHING)

-- PUBLIC INVITE LOOKUP (SAFE - only code lookup)
CREATE POLICY "Public invite lookup by code"
ON public.staff_invitations
FOR SELECT
USING (
  status = 'pending'
);



select * from profiles;


select * from categories;

select
  conname,
  conrelid::regclass as table_from,
  confrelid::regclass as table_to
from pg_constraint
where contype = 'f'
and conrelid = 'public.products'::regclass;



alter table public.products
add constraint products_price_group_id_fkey
foreign key (price_group_id)
references public.price_groups(id)
on delete set null;




CREATE TABLE public.price_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_am         VARCHAR(100), -- Localized "Bono" name
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_amount CHECK (amount >= 0)
);






CREATE INDEX idx_price_groups_business ON public.price_groups(business_id) WHERE deleted_at IS NULL;

-- Soft-delete aware unique constraint for Bono names per business
CREATE UNIQUE INDEX uq_price_groups_active_name 
  ON public.price_groups(business_id, name) 
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_price_groups_updated
    BEFORE UPDATE ON public.price_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


add foreign key (price_group_id)

    alter table public.products
add constraint products_price_group_id_fkey
foreign key (price_group_id)
references public.price_groups(id)
on delete set null;



SELECT *
FROM pg_policies
WHERE tablename = 'price_groups';



select
  auth.uid(),
  public.auth_business_id();




  select * from price_groups;
  select * from products;
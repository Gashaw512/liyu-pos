'use server'

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js" // 🟢 Added for admin client initialization
import { revalidatePath } from "next/cache"
import type { StaffRole } from "@/types/enum"

type CreateStaffInvitationInput = {
  staffName: string
  roleAssigned: StaffRole
  locale: string
  phone?: string | null
}

const ALLOWED_ROLES: StaffRole[] = [
  'owner',
  'manager',
  'cashier',
  'inventory_clerk',
  'waiter',
  'barman',
  'kitchen'
]

export async function createStaffInvitation(input: CreateStaffInvitationInput) {
  // 🟢 We use the normal client for checking user permissions and authentication context
  const supabase = await createServerClient()

  const { staffName, roleAssigned, locale, phone } = input

  // =========================================================
  // 1. AUTH
  // =========================================================
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // =========================================================
  // 2. PROFILE CONTEXT
  // =========================================================
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    throw new Error("Profile not found")
  }

  if (!profile.business_id) {
    throw new Error("Missing business context")
  }

  // =========================================================
  // 3. ROLE AUTHORIZATION (SECURITY LAYER)
  // =========================================================
  if (!["owner", "manager"].includes(profile.role)) {
    throw new Error("Permission denied")
  }

  // =========================================================
  // 4. ROLE VALIDATION (DB SAFETY)
  // =========================================================
  if (!ALLOWED_ROLES.includes(roleAssigned)) {
    throw new Error("Invalid role assigned")
  }

  // =========================================================
  // 5. CODE GENERATION
  // =========================================================
  const code = `LY-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

  // =========================================================
  // 6. INSERT INVITATION (USING SERVICE ROLE FOR CLOUD RUNTIME)
  // =========================================================
  // 🟢 This admin client uses the service key to bypass the broken RLS functions on the remote server
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error: insertError } = await supabaseAdmin
    .from("staff_invitations")
    .insert({
      business_id: profile.business_id,
      staff_name: staffName,
      role_assigned: roleAssigned,
      phone: phone ?? null,
      code,
      status: "pending"
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(insertError.message)
  }

  // =========================================================
  // 7. CACHE REFRESH
  // =========================================================
  revalidatePath(`/${locale}/staff`)

  // =========================================================
  // 8. RETURN CLEAN RESULT
  // =========================================================
  return {
    success: true,
    code,
    invitation: data
  }
}

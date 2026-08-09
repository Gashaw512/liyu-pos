'use server'

import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()

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
  // 6. INSERT INVITATION
  // =========================================================
  const { data, error: insertError } = await supabase
    .from("staff_invitations")
    .insert({
      business_id: profile.business_id,
      staff_name: staffName,
      role_assigned: roleAssigned,
      phone: phone ?? null,
      code,
      status: "pending"
      // expires_at handled by DB default
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
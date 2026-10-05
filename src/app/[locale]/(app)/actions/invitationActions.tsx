
"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getAssignedProfileRoles } from "@/lib/shift-reports/server";
import type { StaffRole } from "@/types/enum";

type CreateStaffInvitationInput = {
  staffName: string;
  roleAssigned: StaffRole;
  locale: string;
  phone?: string | null;
};

const INVITABLE_ROLES: StaffRole[] = [
  "manager",
  "cashier",
  "inventory_clerk",
  "waiter",
  "barman",
  "kitchen",
];

function normalizePhone(value: string | null | undefined) {
  if (!value) return "";

  const cleaned = value.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("09")) {
    return `+251${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("251")) {
    return `+${cleaned}`;
  }

  return cleaned;
}

export async function createStaffInvitation(
  input: CreateStaffInvitationInput
) {
  const supabase = await createClient();

  const {
    staffName,
    roleAssigned,
    locale,
    phone,
  } = input;

  /* -------------------------------------------------------
     1. Authenticate current user
  ------------------------------------------------------- */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  /* -------------------------------------------------------
     2. Load current user's business + role
  ------------------------------------------------------- */

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    console.error(
      "[INVITATION] Failed to load current profile:",
      profileError
    );

    throw new Error("Profile not found");
  }

  const roles = await getAssignedProfileRoles(supabase, user.id, profile.role)
  if (!profile.business_id) {
    throw new Error("Missing business context");
  }

  if (!["owner", "manager"].some((role) => roles.includes(role))) {
    throw new Error("Permission denied");
  }

  const businessId = profile.business_id;

  /* -------------------------------------------------------
     3. Validate input
  ------------------------------------------------------- */

  const cleanName = staffName.trim();
  const normalizedPhone = normalizePhone(phone);

  if (!cleanName) {
    throw new Error("Please enter the staff member's full name");
  }

  if (cleanName.length < 2) {
    throw new Error("Please enter a valid staff name");
  }

  if (!normalizedPhone) {
    throw new Error("Please enter a phone number");
  }

  if (!/^\+2519\d{8}$/.test(normalizedPhone)) {
    throw new Error(
      "Please enter a valid Ethiopian phone number"
    );
  }

  if (!INVITABLE_ROLES.includes(roleAssigned)) {
    throw new Error("Invalid role assigned");
  }

  /* -------------------------------------------------------
     4. Check whether this phone already belongs to staff
     
     IMPORTANT:
     This is checked against the current business only.
  ------------------------------------------------------- */

  const { data: existingStaff, error: existingStaffError } =
    await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("business_id", businessId)
      .eq("phone", normalizedPhone)
      .is("deleted_at", null)
      .maybeSingle();

  if (existingStaffError) {
    console.error(
      "[INVITATION] Failed checking existing staff:",
      existingStaffError
    );

    throw new Error(
      "Unable to verify whether this staff member already exists"
    );
  }

  if (existingStaff) {
    throw new Error(
      "A staff account already exists for this phone number"
    );
  }

  /* -------------------------------------------------------
     5. Create admin client
     
     Used only for the invitation insert because invitation
     creation may be restricted by RLS.
  ------------------------------------------------------- */

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[INVITATION] Supabase admin environment variables are missing"
    );

    throw new Error(
      "Invitation service is not configured correctly"
    );
  }

  const supabaseAdmin = createAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  /* -------------------------------------------------------
     6. Check for an existing pending invitation
     
     This prevents repeatedly inviting the same person
     before they activate their account.
  ------------------------------------------------------- */

  const {
    data: existingInvitation,
    error: existingInvitationError,
  } = await supabaseAdmin
    .from("staff_invitations")
    .select("id, code, staff_name, role_assigned, status")
    .eq("business_id", businessId)
    .eq("phone", normalizedPhone)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvitationError) {
    console.error(
      "[INVITATION] Failed checking existing invitation:",
      existingInvitationError
    );

    throw new Error(
      "Unable to verify existing invitations"
    );
  }

  if (existingInvitation) {
    throw new Error(
      "A pending invitation already exists for this phone number"
    );
  }

  /* -------------------------------------------------------
     7. Generate invitation code
  ------------------------------------------------------- */

  const code = `LY-${crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;

  /* -------------------------------------------------------
     8. Create invitation
  ------------------------------------------------------- */

  const { data, error: insertError } =
    await supabaseAdmin
      .from("staff_invitations")
      .insert({
        business_id: businessId,
        staff_name: cleanName,
        role_assigned: roleAssigned,
        phone: normalizedPhone,
        code,
        status: "pending",
      })
      .select()
      .single();

  if (insertError) {
    console.error(
      "[INVITATION] Failed creating invitation:",
      insertError
    );

    throw new Error(
      "Unable to create the invitation"
    );
  }

  /* -------------------------------------------------------
     9. Refresh staff management page
  ------------------------------------------------------- */

  revalidatePath(
    `/${locale}/management/staff`
  );

  return {
    success: true,
    code,
    invitation: data,
  };
}


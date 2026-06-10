// src/app/actions/invitationActions.ts
'use server'

import { createClient } from "../../../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStaffInvitation(formData: {
  staffName: string;
  roleAssigned: string;
  locale: string;
}) {
  const supabase = await createClient();

  // 1. Get current authenticated user profile session context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized context execution.");

  // 2. Fetch owner's business reference details
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "manager")) {
    throw new Error("Privilege Violation: Action restricted to management tier.");
  }

  // 3. Generate a secure, hard-to-guess 6-digit alphanumeric code prefix
  const secureInviteCode = `LY-${Math.floor(100000 + Math.random() * 900000)}`;

  // 4. Save into the verification registry mapping the company ID
  const { error } = await supabase
    .from("staff_invitations")
    .insert({
      business_id: profile.business_id,
      code: secureInviteCode,
      staff_name: formData.staffName,
      role_assigned: formData.roleAssigned,
      status: "pending"
    });

  if (error) throw new Error(`Database fault: ${error.message}`);

  revalidatePath(`/${formData.locale}/dashboard/staff`);
  
  return {
    success: true,
    code: secureInviteCode,
  };
}
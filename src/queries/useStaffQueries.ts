import { createClient } from "@/lib/supabase/server";

export async function getStaff(businessId: string) {
  const supabase = await createClient();

  return supabase
    .from("profiles")
    .select("id, full_name, phone, role, branch_id")
    .eq("business_id", businessId)
    .order("full_name");
}

export async function getPendingInvites(businessId: string) {
  const supabase = await createClient();

  return supabase
    .from("staff_invitations")
    .select("id, code, business_id, branch_id, status, created_at")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
}
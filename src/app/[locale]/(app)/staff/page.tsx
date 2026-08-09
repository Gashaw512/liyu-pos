import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StaffWorkspaceTabs from "@/components/user/StaffWorkspaceTabs";

import type { Profile, StaffInvitation } from "@/types/database/users";

export const dynamic = "force-dynamic";

export default async function StaffManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  /**
   * =========================
   * 1. AUTH CHECK
   * =========================
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login` as any);
  }

  /**
   * =========================
   * 2. LOAD PROFILE (ROLE CONTEXT)
   * =========================
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const businessId = profile?.business_id;

  if (!businessId || (role !== "owner" && role !== "manager")) {
    redirect(`/${locale}/dashboard`);
  }

  /**
   * =========================
   * 3. STAFF LIST (SOURCE OF TRUTH = profiles.role)
   * =========================
   */
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  const typedStaff = (staffMembers ?? []) as Profile[];

  /**
   * =========================
   * 4. PENDING INVITES
   * =========================
   */
  const { data: pendingInvites } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const typedInvites = (pendingInvites ?? []) as StaffInvitation[];

  /**
   * =========================
   * 5. RENDER
   * =========================
   */
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-black">
          {locale === "am"
            ? "የሰራተኞች ማስተዳደሪያ"
            : "Staff Management"}
        </h1>
      </div>

      <StaffWorkspaceTabs
        locale={locale}
        staffMembers={typedStaff}
        pendingInvites={typedInvites}
      />
    </div>
  );
}
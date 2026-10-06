import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAssignedProfileRoles } from "@/lib/shift-reports/server";
import StaffWorkspaceTabs from "@/components/user/StaffWorkspaceTabs";

import type {
  Profile,
  StaffInvitation,
} from "@/types/database/users";
import { Route } from "next";
import type { AvailableRole } from "@/services/roles";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function StaffManagementPage({
  params,
}: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const isAm = locale === "am";

  // Authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login` as Route);
  }

  // Current user's business and role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const roles = profile
    ? await getAssignedProfileRoles(supabase, user.id, profile.role)
    : []
  if (
    !profile?.business_id ||
    !roles.some((role) => role === "owner" || role === "manager")
  ) {
    redirect(`/${locale}/dashboard` as Route);
  }

  const businessId = profile.business_id;

  // Load staff and pending invitations together
  const [staffResult, inviteResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),

    supabase
      .from("staff_invitations")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (staffResult.error) {
    console.error(
      "[STAFF] Failed to load staff:",
      staffResult.error,
    );
  }

  if (inviteResult.error) {
    console.error(
      "[STAFF] Failed to load invitations:",
      inviteResult.error,
    );
  }

  const staffRows = (staffResult.data ?? []) as Profile[]
  const staffIds = staffRows.map((staff) => staff.id)
  const { data: roleRows, error: roleRowsError } = staffIds.length
    ? await supabase.from("profile_roles").select("profile_id,role_name").in("profile_id", staffIds)
    : { data: [], error: null }
  if (roleRowsError) console.error("[STAFF] Failed to load staff roles:", roleRowsError)
  const rolesByStaff = new Map<string, Set<AvailableRole>>()
  for (const staff of staffRows) rolesByStaff.set(staff.id, new Set([staff.role as AvailableRole]))
  for (const assignment of roleRows ?? []) rolesByStaff.get(assignment.profile_id)?.add(assignment.role_name as AvailableRole)
  const staffMembers = staffRows.map((staff) => ({
    ...staff,
    roles: [...(rolesByStaff.get(staff.id) ?? new Set([staff.role as AvailableRole]))],
  }))

  const pendingInvites =
    (inviteResult.data ?? []) as StaffInvitation[];

  return (
    <main className="min-h-screen bg-cream-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-coffee-700">
            {isAm
              ? "የሰራተኞች ማስተዳደሪያ"
              : "Staff Management"}
          </h1>

          <p className="mt-1 text-sm text-coffee-500">
            {isAm
              ? "ሰራተኞችን ያክሉ፣ ሚናዎችን ያስተዳድሩ።"
              : "Add staff and manage their roles."}
          </p>
        </header>

        {/* Staff workspace */}
        <StaffWorkspaceTabs
          locale={locale}
          staffMembers={staffMembers}
          pendingInvites={pendingInvites}
        />
      </div>
    </main>
  );
}

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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

  // --------------------------------------------------
  // Authentication
  // --------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login` as Route);
  }

  // --------------------------------------------------
  // Current user's business + role
  // --------------------------------------------------

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile?.business_id ||
    (profile.role !== "owner" && profile.role !== "manager")
  ) {
    redirect(`/${locale}/dashboard`);
  }

  const businessId = profile.business_id;

  // --------------------------------------------------
  // Staff
  // profiles.role = source of truth
  // --------------------------------------------------

  const { data: staffMembers, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (staffError) {
    console.error("[STAFF MANAGEMENT] Failed to load staff:", staffError);
  }

  const typedStaff = (staffMembers ?? []) as Profile[];

  // --------------------------------------------------
  // Pending invitations
  // --------------------------------------------------

  const { data: pendingInvites, error: inviteError } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (inviteError) {
    console.error(
      "[STAFF MANAGEMENT] Failed to load invitations:",
      inviteError,
    );
  }

  const typedInvites = (pendingInvites ?? []) as StaffInvitation[];

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  const isAmharic = locale === "am";

  return (
    <main className="min-h-screen bg-cream-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:px-8">
        <header className="mb-5">
          <h1 className="text-xl font-bold text-coffee-700 sm:text-2xl">
            {isAmharic ? "የሰራተኞች ማስተዳደሪያ" : "Staff Management"}
          </h1>

          <p className="mt-1 text-sm text-coffee-500">
            {isAmharic
              ? "ሰራተኞችን፣ ሚናዎችን እና የግብዣ ጥያቄዎችን ያስተዳድሩ።"
              : "Manage staff, roles, and pending invitations."}
          </p>
        </header>

        <StaffWorkspaceTabs
          locale={locale}
          staffMembers={typedStaff}
          pendingInvites={typedInvites}
        />
      </div>
    </main>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  ChevronLeft,
  Edit3,
  Phone,
  Shield,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAssignedProfileRoles } from "@/lib/shift-reports/server";
import StaffUpdateRoleForm from "@/components/user/StaffUpdateRoleForm";
import type { AvailableRole } from "@/services/roles";

interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  inventory_clerk: "Stock Clerk",
  waiter: "Waiter",
  barman: "Barman",
  kitchen: "Kitchen",
};

const ROLE_LABELS_AM: Record<string, string> = {
  owner: "ባለቤት",
  manager: "አስተዳዳሪ",
  cashier: "ገንዘብ ተቀባይ",
  inventory_clerk: "የክምችት ኃላፊ",
  waiter: "አስተናጋጅ",
  barman: "ባርማን",
  kitchen: "ወጥ ቤት",
};

function getRoleLabel(role: string, isAm: boolean) {
  return (
    (isAm ? ROLE_LABELS_AM[role] : ROLE_LABELS[role]) ??
    role
  );
}

export default async function StaffProfileDetailPage({
  params,
}: PageProps) {
  const { locale, id } = await params;
  const isAm = locale === "am";

  const supabase = await createClient();

  /* -------------------------------------------------------
     1. Authenticate
  ------------------------------------------------------- */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login` as Route);
  }

  /* -------------------------------------------------------
     2. Load current user's business + role
  ------------------------------------------------------- */

  const { data: currentUserProfile, error: currentUserError } =
    await supabase
      .from("profiles")
      .select("role, business_id")
      .eq("id", user.id)
      .single();

  const currentUserRoles = currentUserProfile
    ? await getAssignedProfileRoles(supabase, user.id, currentUserProfile.role)
    : []
  if (
    currentUserError ||
    !currentUserProfile?.business_id ||
    !currentUserRoles.some((role) => ["owner", "manager"].includes(role))
  ) {
    redirect(`/${locale}/dashboard` as Route);
  }

  const businessId = currentUserProfile.business_id;

  /* -------------------------------------------------------
     3. Load selected staff member

     Business scope is mandatory.
  ------------------------------------------------------- */

  const { data: targetStaff, error: targetStaffError } =
    await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          phone,
          role,
          business_id,
          created_at
        `
      )
      .eq("id", id)
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .maybeSingle();

  if (targetStaffError) {
    console.error(
      "[STAFF DETAIL] Failed to load staff member:",
      targetStaffError
    );
  }

  if (!targetStaff) {
    redirect(`/${locale}/management/staff` as Route);
  }

  const targetRoles = await getAssignedProfileRoles(supabase, targetStaff.id, targetStaff.role)
  const roleLabel = targetRoles.map((role) => getRoleLabel(role, isAm)).join(" + ")

  const initials =
    targetStaff.full_name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "?";

  const isOwner = targetStaff.role === "owner";

  const joinedDate = targetStaff.created_at
    ? new Date(targetStaff.created_at).toLocaleDateString(
        isAm ? "am-ET" : "en-ET",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "—";

  return (
    <main className="min-h-screen bg-cream-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-24 sm:px-6">
        {/* Back */}
        <div className="mb-4">
          <Link
            href={`/${locale}/management/staff` as Route}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 text-xs font-bold text-coffee-600 shadow-sm transition hover:bg-cream-50 hover:text-coffee-800 active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" />
            {isAm ? "ወደ ሰራተኞች" : "Back to Staff"}
          </Link>
        </div>

        {/* Profile card */}
        <section className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-cream-200 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-berbere-50 text-base font-black text-berbere-600">
                {targetStaff.full_name ? (
                  initials
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-black tracking-tight text-coffee-700">
                  {targetStaff.full_name ||
                    (isAm
                      ? "ያልተሰየመ ሰራተኛ"
                      : "Unnamed staff")}
                </h1>

                <p className="mt-0.5 text-xs text-coffee-400">
                  {roleLabel}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-bold text-gold-700">
                {isAm ? "ንቁ" : "Active"}
              </span>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {/* Name */}
            <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
                    {isAm ? "ሙሉ ስም" : "Full name"}
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-coffee-700">
                    {targetStaff.full_name || "—"}
                  </p>
                </div>

                <Link
                  href={
                    `/${locale}/management/staff/${targetStaff.id}/edit` as Route
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-2.5 text-[11px] font-bold text-coffee-600 transition hover:border-berbere-200 hover:bg-berbere-50 hover:text-berbere-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isAm ? "አርትዕ" : "Edit"}
                </Link>
              </div>
            </div>

            {/* Phone */}
            <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                  <Phone className="h-4 w-4 text-coffee-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
                    {isAm ? "ስልክ ቁጥር" : "Phone number"}
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-coffee-700">
                    {targetStaff.phone || "—"}
                  </p>
                </div>

                <Link
                  href={
                    `/${locale}/management/staff/${targetStaff.id}/edit` as Route
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-2.5 text-[11px] font-bold text-coffee-600 transition hover:border-berbere-200 hover:bg-berbere-50 hover:text-berbere-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isAm ? "አርትዕ" : "Edit"}
                </Link>
              </div>
            </div>

            {/* Joined */}
            <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
                {isAm ? "የተመዘገበበት ቀን" : "Joined"}
              </p>

              <p className="mt-1 text-sm font-bold text-coffee-700">
                {joinedDate}
              </p>
            </div>

            {/* Role */}
            <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                  <Shield className="h-4 w-4 text-coffee-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
                    {isAm ? "የስራ ሚና" : "Staff role"}
                  </p>

                  <p className="mt-1 text-sm font-bold text-coffee-700">
                    {roleLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Role management */}
            {!isOwner && (
              <div className="border-t border-cream-200 pt-4">
                <StaffUpdateRoleForm
                  locale={locale}
                  staffId={targetStaff.id}
                  primaryRole={targetStaff.role as AvailableRole}
                  assignedRoles={targetRoles as AvailableRole[]}
                />
              </div>
            )}

            {/* Owner protection */}
            {isOwner && (
              <div className="border-t border-cream-200 pt-4">
                <div className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-3">
                  <div className="flex items-start gap-2.5">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />

                    <div>
                      <p className="text-xs font-bold text-coffee-700">
                        {isAm
                          ? "የባለቤት መዳረሻ"
                          : "Owner access"}
                      </p>

                      <p className="mt-0.5 text-[11px] leading-5 text-coffee-500">
                        {isAm
                          ? "የንግድ ባለቤት ሚና ከዚህ ገጽ አይቀየርም።"
                          : "The business owner role cannot be changed from this page."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

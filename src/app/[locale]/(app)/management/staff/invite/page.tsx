import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import InviteStaffWizard from "@/components/user/InviteStaffWizard";
import { Route } from "next";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function InviteStaffPage({
  params,
}: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const isAm = locale === "am";

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
  // Authorization
  // --------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const canInvite =
    profile?.business_id &&
    (profile.role === "owner" || profile.role === "manager");

  if (!canInvite) {
    redirect(`/${locale}/dashboard`);
  }

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-cream-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-24 sm:px-6">
        {/* Back */}
        <Link
          href={`/${locale}/management/staff`}
          className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-coffee-600 transition-colors hover:bg-cream-50"
        >
          <ChevronLeft className="h-4 w-4" />
          {isAm ? "ለሰራተኞች ይመለሱ" : "Back to Staff"}
        </Link>

        {/* Header */}
        <header className="mb-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-berbere-500 text-white">
            <UserPlus className="h-5 w-5" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-coffee-700">
            {isAm ? "አዲስ ሰራተኛ ይጋብዙ" : "Invite Staff"}
          </h1>

          <p className="mt-1 text-sm leading-6 text-coffee-500">
            {isAm
              ? "የሰራተኛውን መረጃ እና ሚና ያስገቡ። ከዚያ የመግቢያ ግብዣ ይፍጠሩ።"
              : "Enter the staff member's details and role, then create their invitation."}
          </p>
        </header>

        {/* Invitation form */}
        <section className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm sm:p-6">
          <InviteStaffWizard locale={locale} />
        </section>
      </div>
    </main>
  );
}
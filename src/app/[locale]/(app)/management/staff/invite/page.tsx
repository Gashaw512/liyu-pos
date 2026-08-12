// src/app/[locale]/staff/invite/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from 'next'
import { ChevronLeft } from "lucide-react";
// import InviteStaffForm from "@/components/user/StaffWorkspaceTabs";
// 1. Change line 7 to import the actual wizard form component:
import InviteStaffWizard from "@/components/user/InviteStaffWizard";


interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function InviteStaffPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const isAm = locale === 'am';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  if ((profile?.role !== 'owner' && profile?.role !== 'manager') || !profile?.business_id) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24 font-['DM_Sans',sans-serif]">
      
      {/* Back Button */}
      <Link 
        href={`/${locale}/staff`} 
        className="inline-flex items-center gap-1 text-xs font-bold text-coffee-600 mb-6 bg-white px-3 py-1.5 rounded-xl border border-cream-200 active:scale-95 transition-transform"
      >
        <ChevronLeft className="h-4 w-4" />
        {isAm ? 'ተመለስ' : 'Back to Crew'}
      </Link>

      <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-black text-coffee-950 tracking-tight">
            {isAm ? 'አዲስ ሰራተኛ መጋበዣ' : 'Create Invitation Link'}
          </h2>
          <p className="text-xs text-coffee-500 mt-1">
            {isAm 
              ? 'የሰራተኛውን ስም እና የስራ ሚና በመምረጥ የማረጋገጫ ኮድ ያመንጩ።' 
              : 'Specify full details below to issue an encrypted verification pass-code.'}
          </p>
        </div>

        {/* Form Client Core component interaction */}
        <InviteStaffWizard locale={locale} />
      </div>

    </div>
  );
}
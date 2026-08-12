// src/app/[locale]/staff/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from 'next'
import { ChevronLeft, Shield, Phone, User, Trash2 } from "lucide-react";
// import StaffUpdateRoleForm from "@/components/user/StaffWorkspaceTabs"
import StaffUpdateRoleForm from "@/components/user/StaffUpdateRoleForm"



interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function StaffProfileDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const isAm = locale === 'am';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login` as Route);

  // Verify authorization parameters
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  if ((currentUserProfile?.role !== 'owner' && currentUserProfile?.role !== 'manager') || !currentUserProfile?.business_id) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch targeted crew member profile details
  const { data: targetStaff } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("business_id", currentUserProfile.business_id)
    .single();

  if (!targetStaff) {
    redirect(`/${locale}/staff`);
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24 font-['DM_Sans',sans-serif] space-y-4">
      
      <Link 
        href={`/${locale}/staff`} 
        className="inline-flex items-center gap-1 text-xs font-bold text-coffee-600 bg-white px-3 py-1.5 rounded-xl border border-cream-200 active:scale-95 transition-transform"
      >
        <ChevronLeft className="h-4 w-4" />
        {isAm ? 'ወደ ሰራተኞች ዝርዝር' : 'Back to Crew'}
      </Link>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-cream-100 pb-4">
          <div className="h-12 w-12 rounded-full bg-cream-100 flex items-center justify-center text-coffee-800 font-black text-lg">
            {targetStaff.full_name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-lg font-black text-coffee-950">{targetStaff.full_name}</h2>
            <p className="text-xs text-coffee-400 capitalize">{targetStaff.role}</p>
          </div>
        </div>

        {/* Structural Metadata Rows */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3 p-3 bg-cream-50/50 rounded-xl">
            <Phone className="h-4 w-4 text-coffee-400 shrink-0" />
            <div>
              <span className="block text-[10px] text-coffee-400 font-bold uppercase">{isAm ? 'ስልክ ቁጥር' : 'Phone Number'}</span>
              <span className="font-mono text-coffee-900 text-sm font-bold">{targetStaff.phone || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-cream-50/50 rounded-xl">
            <Shield className="h-4 w-4 text-coffee-400 shrink-0" />
            <div>
              <span className="block text-[10px] text-coffee-400 font-bold uppercase">{isAm ? 'የአሁኑ የስራ ድርሻ' : 'Active Permission Level'}</span>
              <span className="text-coffee-900 font-bold text-sm capitalize">{targetStaff.role}</span>
            </div>
          </div>
        </div>

        {/* Change Role Client Core form component */}
        {targetStaff.role !== 'owner' && (
          <div className="pt-2 border-t border-cream-100">
            <StaffUpdateRoleForm locale={locale} staffId={targetStaff.id} currentRole={targetStaff.role} />
          </div>
        )}
      </div>

    </div>
  );
}
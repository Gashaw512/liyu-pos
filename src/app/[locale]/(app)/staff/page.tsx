// src/app/[locale]/staff/staff/page.tsx
import { createClient } from "../../../../lib/supabase/server";
import { redirect } from "next/navigation";
import StaffWorkspaceTabs from "../../../../components/user/StaffWorkspaceTabs";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function StaffManagementPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. Enforce Authentication Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login` as any);
  }

  // 2. Authorize Roles: Only owner or manager can enter this security view!
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || "waiter";
  const currentBusinessId = profile?.business_id;

  if ((userRole !== "owner" && userRole !== "manager") || !currentBusinessId) {
    redirect(`/${locale}/dashboard`);
  }

  /* 
    3. Load data for all sub-views at once to prevent multiple page network hops
  */
  // A. Fetch Active Staff Directory
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      role,
      profile_roles (
        role_name
      )
    `)
    .eq("business_id", currentBusinessId)
    .order("full_name", { ascending: true });

  // B. Fetch Pending Invitations Queue
  const { data: pendingInvites } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("business_id", currentBusinessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const isAm = locale === 'am';

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-3 md:p-6 font-['DM_Sans',sans-serif] pb-24">
      
      {/* Page Heading & Context */}
      <div className="border-b border-[#2B1E1A]/10 pb-3">
        <h1 className="text-xl md:text-2xl font-black text-coffee-950 tracking-tight">
          {isAm ? 'የሰራተኞች ማስተዳደሪያ' : 'Staff Management'}
        </h1>
        <p className="text-[11px] md:text-xs text-coffee-500">
          {isAm 
            ? 'ሰራተኞችን ይጋብዙ፣ የስራ ሃላፊነት ይቆጣጠሩ፣ እና ንቁ አካውንቶችን ያስተዳድሩ።' 
            : 'Invite your crew, audit permissions, and adjust system access parameters.'}
        </p>
      </div>

      {/* 
        🎯 Interactive Switch Engine: 
        Passes fetched data down to handle the dynamic layout natively across all form factors.
      */}
      <StaffWorkspaceTabs 
        locale={locale} 
        staffMembers={staffMembers || []} 
        pendingInvites={pendingInvites || []} 
      />

    </div>
  );
}
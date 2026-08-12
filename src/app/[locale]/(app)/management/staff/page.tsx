// src/app/[locale]/staff/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from 'next'
import { UserPlus, Clock, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function StaffDirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const isAm = locale === 'am';

  // 1. Enforce Authentication Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  // 2. Authorize Roles: Only owner or manager can view
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

  // 3. Fetch Active Staff Directory
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select(`id, full_name, phone, role`)
    .eq("business_id", currentBusinessId)
    .order("full_name", { ascending: true });

  // 4. Fetch Pending Invitations Queue
  const { data: pendingInvites } = await supabase
    .from("staff_invitations")
    .select("id")
    .eq("business_id", currentBusinessId)
    .eq("status", "pending");

  const pendingCount = pendingInvites?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-24 font-['DM_Sans',sans-serif]">
      
      {/* Page Heading & Context */}
      <div className="border-b border-[#2B1E1A]/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-coffee-950 tracking-tight">
          {isAm ? 'የሰራተኞች ማስተዳደሪያ' : 'Staff Directory'}
        </h1>
        <p className="text-xs md:text-sm text-coffee-500 mt-1">
          {isAm 
            ? 'አዲስ ሰራተኛ ለመጨመር ወይንም የነባር ሰራተኞችን መረጃ ለመቀየር ከታች ያሉትን ትልልቅ ቁልፎች ይጠቀሙ።' 
            : 'Manage your crew parameters, change access controls, or check incoming invitation keys.'}
        </p>
      </div>

      {/* 🎯 BIG TOUCH TILES FOR EASY NAVIGATION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link 
          href={`/${locale}/staff/invite` as Route}
          className="flex items-center justify-between p-5 bg-coffee-950 text-white rounded-2xl active:scale-[0.98] transition-transform shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <UserPlus className="h-6 w-6 text-[#E2A03F]" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-base">{isAm ? 'አዲስ ሰራተኛ ይጋብዙ' : 'Invite New Staff'}</h3>
              <p className="text-[11px] text-cream-100/70">{isAm ? 'ስልክ እና ሚና በመምረጥ' : 'Add cashiers or waiters'}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-cream-200/50" />
        </Link>

        <div className="flex items-center justify-between p-5 bg-white border border-cream-200 rounded-2xl relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cream-50 rounded-xl">
              <Clock className="h-6 w-6 text-coffee-500" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-base text-coffee-950">{isAm ? 'ያልተረጋገጡ ግብዣዎች' : 'Pending Invites'}</h3>
              <p className="text-[11px] text-coffee-500">{isAm ? 'የማረጋገጫ ኮድ የሚጠብቁ' : 'Waiting for confirmation code'}</p>
            </div>
          </div>
          <span className="bg-berbere-500 text-white font-black text-xs px-2.5 py-1 rounded-full">
            {pendingCount}
          </span>
        </div>
      </div>

      {/* ─── ACTIVE STAFF DIRECTORY MATRIX ─── */}
      <div className="bg-white rounded-2xl border border-cream-200/80 shadow-[0_2px_8px_rgba(43,30,26,0.02)] overflow-hidden">
        <div className="p-4 bg-cream-50/50 border-b border-cream-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-coffee-600" />
            <h2 className="font-black text-sm text-coffee-950">{isAm ? 'አሁን ያሉ ሰራተኞች' : 'Active Crew Members'}</h2>
          </div>
          <span className="text-[10px] uppercase font-black tracking-wider text-coffee-400 bg-white px-2 py-0.5 rounded-md border border-cream-200">
            {staffMembers?.length || 0} {isAm ? 'ሰራተኛ' : 'Total'}
          </span>
        </div>

        <div className="divide-y divide-cream-100 block w-full">
          {staffMembers?.map((staff) => (
            <Link
              key={staff.id}
              href={`/${locale}/staff/${staff.id}` as Route}
              className="flex items-center justify-between p-4 hover:bg-cream-50/40 active:bg-cream-50 transition-colors w-full block text-left"
            >
              <div className="space-y-0.5 max-w-[70%]">
                <h4 className="font-bold text-sm text-coffee-950 truncate">{staff.full_name || (isAm ? 'ስም አልተሞላም' : 'No Name Set')}</h4>
                <p className="text-xs text-coffee-500 font-mono tracking-tight">{staff.phone || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                  staff.role === 'owner' || staff.role === 'manager'
                    ? 'bg-coffee-950 text-[#E2A03F]'
                    : staff.role === 'cashier'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-cream-100 text-coffee-800'
                }`}>
                  {staff.role === 'owner' ? (isAm ? 'ባለቤት' : 'Owner') :
                   staff.role === 'manager' ? (isAm ? 'ማናጀር' : 'Manager') :
                   staff.role === 'cashier' ? (isAm ? 'ካሼር' : 'Cashier') : (isAm ? 'አስተናጋጅ' : 'Waiter')}
                </span>
                <ArrowRight className="h-4 w-4 text-coffee-300 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
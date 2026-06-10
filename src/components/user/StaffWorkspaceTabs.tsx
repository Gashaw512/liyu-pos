// src/components/user/StaffWorkspaceTabs.tsx
'use client'

import { useState, useTransition } from "react";
import { UserPlus, Users, ShieldCheck, MailQuestion } from "lucide-react";
import InviteStaffWizard from "./InviteStaffWizard";
import StaffTable from "./StaffTable";

interface TabsProps {
  locale: string;
  staffMembers: any[];
  pendingInvites: any[];
}

export default function StaffWorkspaceTabs({ locale, staffMembers, pendingInvites }: TabsProps) {
  const isAm = locale === "am";
  const [activeTab, setActiveTab] = useState<"invite" | "active" | "roles" | "pending">("active");
  const [isPending, startTransition] = useTransition();

  const t = (en: string, am: string) => isAm ? am : en;

  const handleRefresh = () => {
    startTransition(async () => {
      // Revalidation callback trace
    });
  };

  const navItems = [
    { id: "active", label: t("ንቁ", "Active"), icon: Users, count: staffMembers.length },
    { id: "invite", label: t("ጋብዝ", "Invite"), icon: UserPlus, count: null },
    { id: "pending", label: t("ግብዣዎች", "Pending"), icon: MailQuestion, count: pendingInvites.length },
    { id: "roles", label: t("ሚና", "Roles"), icon: ShieldCheck, count: null },
  ];

  return (
    <div className="w-full max-w-full block overflow-hidden">
      
      {/* 🎯 NAVBAR: Fluid grid using auto-sizing text to guarantee 100% viewport compliance */}
      <div className="sticky top-0 bg-[#F7F4EB] z-30 py-2 border-b border-cream-200/60 w-full mb-4">
        <div className="grid grid-cols-4 gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all active:scale-95 select-none text-center ${
                  isActive
                    ? "bg-coffee-950 text-white shadow-sm"
                    : "bg-white border border-cream-200/80 text-coffee-600"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#E2A03F]" : "text-coffee-400"}`} />
                <span className="block text-[9px] xs:text-[10px] font-black truncate max-w-full mt-0.5">{item.label}</span>
                {item.count !== null && (
                  <span className={`text-[8px] px-1 rounded-full font-bold mt-0.5 ${
                    isActive ? "bg-white/20 text-white" : "bg-cream-100 text-coffee-700"
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DYNAMIC DISPLAY STACK: Locked to current viewport math minus page padding ─── */}
      <div className="w-full max-w-[calc(100vw-24px)] md:max-w-full block overflow-hidden">
        
        {/* TAB 1: ACTIVE DIRECTORY VIEW */}
        {activeTab === "active" && (
          <div className="bg-white rounded-2xl border border-cream-200/80 p-3 shadow-[0_2px_8px_rgba(43,30,26,0.02)] w-full block overflow-hidden">
            {/* Scroll Container */}
            <div className="w-full overflow-x-auto block clear-both scrollbar-thin">
              <div className="inline-block min-w-full align-middle">
                <StaffTable users={staffMembers} locale={locale} onRefreshList={handleRefresh} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVITE NEW STAFF BUILDER */}
        {activeTab === "invite" && (
          <div className="w-full block overflow-hidden px-0.5">
            <InviteStaffWizard locale={locale} />
          </div>
        )}

        {/* TAB 3: PENDING INVITATIONS WATCHLIST */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl border border-cream-200/80 p-3 shadow-[0_2px_8px_rgba(43,30,26,0.02)] w-full block overflow-hidden">
            {pendingInvites.length === 0 ? (
              <div className="text-center py-8 text-xs text-coffee-400 font-medium">
                {t("ሊንክ የተላከለት የለም።", "No pending staff invitations found.")}
              </div>
            ) : (
              /* Deep isolated horizontal scroll container */
              <div className="w-full overflow-x-auto block scrollbar-thin">
                <table className="w-full text-left text-xs text-coffee-800 table-fixed min-w-[320px]">
                  <thead>
                    <tr className="border-b border-cream-100 bg-cream-50/50 text-[10px] font-black uppercase tracking-wider text-coffee-500">
                      <th className="p-2 w-[40%]">{t("ስም", "Name")}</th>
                      <th className="p-2 w-[25%]">{t("ሚና", "Role")}</th>
                      <th className="p-2 w-[35%] text-right">{t("ኮድ", "Code")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-50">
                    {pendingInvites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-cream-50/30 transition-colors">
                        <td className="p-2 font-bold text-coffee-950 truncate">{inv.staff_name}</td>
                        <td className="p-2">
                          <span className="bg-berbere-50 text-berbere-700 font-bold px-1 py-0.5 rounded text-[9px] block text-center truncate">
                            {inv.role_assigned}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-black text-coffee-700 tracking-wider text-right text-[11px]">
                          {inv.code}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACCESS CONTROL POLICY CHECKS MATRIX */}
        {activeTab === "roles" && (
          <div className="bg-white rounded-2xl border border-cream-200/80 p-4 shadow-[0_2px_8px_rgba(43,30,26,0.02)] text-xs text-coffee-700 space-y-3 w-full block overflow-hidden">
            <h3 className="font-black text-sm text-coffee-950">{t("ስልጣን እና ፍቃዶች", "Role Matrix")}</h3>
            <div className="space-y-2 pt-1 text-[11px]">
              <div className="p-2 bg-cream-50 rounded-xl"><b className="text-coffee-900">Manager:</b> Full stock control & orders.</div>
              <div className="p-2 bg-cream-50 rounded-xl"><b className="text-coffee-900">Cashier:</b> Execute sales receipts & logs.</div>
              <div className="p-2 bg-cream-50 rounded-xl"><b className="text-coffee-900">Waiter:</b> Restricted ordering tickets feeds.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
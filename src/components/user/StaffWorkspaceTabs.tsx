'use client'

import { useState, useTransition } from "react";
import { UserPlus, Users, MailQuestion } from "lucide-react";
import InviteStaffWizard from "./InviteStaffWizard";
import StaffTable from "./StaffTable";

interface TabsProps {
  locale: string;
  staffMembers: any[];
  pendingInvites: any[];
}

export default function StaffWorkspaceTabs({
  locale,
  staffMembers,
  pendingInvites,
}: TabsProps) {
  const isAm = locale === "am";

  const [activeTab, setActiveTab] = useState<
    "active" | "invite" | "pending"
  >("active");

  const [, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {});
  };

  const navItems = [
    {
      id: "active",
      label: isAm ? "ሰራተኞች" : "Staff",
      icon: Users,
      count: staffMembers.length,
    },
    {
      id: "invite",
      label: isAm ? "አዲስ ሰራተኛ" : "Add Staff",
      icon: UserPlus,
      count: null,
    },
    {
      id: "pending",
      label: isAm ? "ግብዣዎች" : "Invitations",
      icon: MailQuestion,
      count: pendingInvites.length,
    },
  ];

  return (
    <div className="w-full space-y-4">

      {/* Summary Cards */}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-coffee-500">
            {isAm ? "ንቁ ሰራተኞች" : "Active Staff"}
          </p>

          <p className="text-2xl font-black text-coffee-950 mt-1">
            {staffMembers.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-coffee-500">
            {isAm ? "በመጠባበቅ ላይ" : "Pending"}
          </p>

          <p className="text-2xl font-black text-berbere-600 mt-1">
            {pendingInvites.length}
          </p>
        </div>
      </div>

      {/* Tabs */}

      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`
                rounded-2xl p-3 transition-all duration-150
                border text-center
                ${
                  isActive
                    ? "bg-berbere-500 border-berbere-500 text-white shadow-md"
                    : "bg-white border-cream-200 text-coffee-700"
                }
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon
                  className={`h-4 w-4 ${
                    isActive
                      ? "text-white"
                      : "text-coffee-500"
                  }`}
                />

                <span className="text-[11px] font-black">
                  {item.label}
                </span>

                {item.count !== null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-cream-100 text-coffee-700"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* STAFF LIST */}

      {activeTab === "active" && (
        <div className="bg-white rounded-2xl border border-cream-200 p-3 shadow-sm">
          <StaffTable
            users={staffMembers}
            locale={locale}
            onRefreshList={handleRefresh}
          />
        </div>
      )}

      {/* ADD STAFF */}

      {activeTab === "invite" && (
        <div className="space-y-4">

          <InviteStaffWizard locale={locale} />

          <div className="bg-white rounded-2xl border border-cream-200 p-4">
            <h3 className="font-black text-sm text-coffee-950 mb-3">
              {isAm ? "የስራ ሚናዎች" : "Staff Roles"}
            </h3>

            <div className="space-y-2 text-[11px]">

              <div className="bg-cream-50 rounded-xl p-3">
                👨‍💼 <strong>Manager</strong>
                <p className="text-coffee-500 mt-1">
                  {isAm
                    ? "ንግዱን በየቀኑ ያስተዳድራል"
                    : "Manages daily business operations"}
                </p>
              </div>

              <div className="bg-cream-50 rounded-xl p-3">
                💰 <strong>Cashier</strong>
                <p className="text-coffee-500 mt-1">
                  {isAm
                    ? "ሽያጭና ክፍያዎች"
                    : "Handles sales and payments"}
                </p>
              </div>

              <div className="bg-cream-50 rounded-xl p-3">
                🍽️ <strong>Waiter</strong>
                <p className="text-coffee-500 mt-1">
                  {isAm
                    ? "የደንበኛ ትዕዛዞች"
                    : "Takes customer orders"}
                </p>
              </div>

              <div className="bg-cream-50 rounded-xl p-3">
                👨‍🍳 <strong>Kitchen</strong>
                <p className="text-coffee-500 mt-1">
                  {isAm
                    ? "ምግብ ያዘጋጃል"
                    : "Prepares food orders"}
                </p>
              </div>

              <div className="bg-cream-50 rounded-xl p-3">
                📦 <strong>Stock Clerk</strong>
                <p className="text-coffee-500 mt-1">
                  {isAm
                    ? "ክምችት ያስተዳድራል"
                    : "Manages inventory and stock"}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* INVITATIONS */}

      {activeTab === "pending" && (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">

          {pendingInvites.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-5xl mb-3">📨</div>

              <h3 className="font-black text-coffee-950">
                {isAm
                  ? "ምንም ግብዣ የለም"
                  : "No Pending Invitations"}
              </h3>

              <p className="text-xs text-coffee-500 mt-2">
                {isAm
                  ? "አዲስ ሰራተኛ ለመጨመር Add Staff ይጠቀሙ"
                  : "Use Add Staff to invite employees"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-cream-50 border-b border-cream-100">
                    <th className="p-3 text-left">
                      {isAm ? "ስም" : "Name"}
                    </th>

                    <th className="p-3 text-left">
                      {isAm ? "ሚና" : "Role"}
                    </th>

                    <th className="p-3 text-right">
                      {isAm ? "ኮድ" : "Code"}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pendingInvites.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-cream-50"
                    >
                      <td className="p-3 font-bold">
                        {inv.staff_name}
                      </td>

                      <td className="p-3">
                        <span className="bg-berbere-50 text-berbere-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {inv.role_assigned}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-black">
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
    </div>
  );
}
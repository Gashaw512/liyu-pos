"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MailQuestion,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import InviteStaffWizard from "./InviteStaffWizard";
import StaffTable from "./StaffTable";

import type {
  Profile,
  StaffInvitation,
} from "@/types/database/users";

type TabId = "active" | "invite" | "pending";

interface StaffWorkspaceTabsProps {
  locale: string;
  staffMembers?: Profile[];
  pendingInvites?: StaffInvitation[];
}

export default function StaffWorkspaceTabs({
  locale,
  staffMembers = [],
  pendingInvites = [],
}: StaffWorkspaceTabsProps) {
  const router = useRouter();
  const isAm = locale === "am";

  const [activeTab, setActiveTab] =
    useState<TabId>("active");

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const staffCount = staffMembers.length;
  const pendingCount = pendingInvites.length;

  const refreshWorkspace = () => {
    setIsRefreshing(true);

    router.refresh();

    // Keep the loading state short because router.refresh()
    // does not expose a completion callback.
    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const tabs: {
    id: TabId;
    label: string;
    labelAm: string;
    icon: typeof Users;
    count?: number;
  }[] = [
    {
      id: "active",
      label: "Staff",
      labelAm: "ሰራተኞች",
      icon: Users,
      count: staffCount,
    },
    {
      id: "invite",
      label: "Add Staff",
      labelAm: "ሰራተኛ ጨምር",
      icon: UserPlus,
    },
    {
      id: "pending",
      label: "Invitations",
      labelAm: "ግብዣዎች",
      icon: MailQuestion,
      count: pendingCount,
    },
  ];

  return (
    <section className="w-full">
      {/* Workspace navigation */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-cream-300 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-selected={selected}
              className={[
                "flex min-h-14 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5",
                "text-xs font-bold transition-colors sm:gap-2 sm:text-sm",
                selected
                  ? "bg-berbere-500 text-white shadow-sm"
                  : "text-coffee-600 hover:bg-cream-100",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />

              <span className="truncate">
                {isAm ? tab.labelAm : tab.label}
              </span>

              {tab.count !== undefined && (
                <span
                  className={[
                    "min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-cream-200 text-coffee-700",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Staff */}
      {activeTab === "active" && (
        <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-coffee-700 sm:text-base">
                {isAm
                  ? "የንግድ ሰራተኞች"
                  : "Business Staff"}
              </h2>

              <p className="mt-0.5 text-xs text-coffee-500">
                {isAm
                  ? "ሰራተኞችን እና ሚናቸውን ያስተዳድሩ"
                  : "Manage staff members and their roles"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Refresh */}
              <button
                type="button"
                onClick={refreshWorkspace}
                disabled={isRefreshing}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream-300 bg-white text-coffee-500 transition hover:bg-cream-100 hover:text-coffee-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  isAm
                    ? "የሰራተኞችን ዝርዝር አድስ"
                    : "Refresh staff list"
                }
                title={
                  isAm
                    ? "አድስ"
                    : "Refresh"
                }
              >
                <RefreshCw
                  className={[
                    "h-4 w-4",
                    isRefreshing
                      ? "animate-spin"
                      : "",
                  ].join(" ")}
                />
              </button>

              {/* Add */}
              <button
                type="button"
                onClick={() => setActiveTab("invite")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-berbere-500 px-3 text-xs font-bold text-white transition-colors hover:bg-berbere-600"
              >
                <UserPlus className="h-4 w-4" />

                <span className="hidden sm:inline">
                  {isAm
                    ? "ሰራተኛ ጨምር"
                    : "Add Staff"}
                </span>
              </button>
            </div>
          </div>

          <StaffTable
            users={staffMembers}
            locale={locale}
            onRefreshList={refreshWorkspace}
          />
        </div>
      )}

      {/* Add staff */}
      {activeTab === "invite" && (
        <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-coffee-700 sm:text-base">
                {isAm
                  ? "አዲስ ሰራተኛ ይጨምሩ"
                  : "Add a Staff Member"}
              </h2>

              <p className="mt-0.5 text-xs leading-5 text-coffee-500">
                {isAm
                  ? "መረጃውን ያስገቡ እና የስራ ሚና ይመድቡ።"
                  : "Enter their details and assign a role."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-coffee-500 transition hover:bg-cream-100 hover:text-coffee-700"
            >
              {isAm ? "ሰራተኞች" : "Staff"}
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <InviteStaffWizard locale={locale} />
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {activeTab === "pending" && (
        <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-coffee-700 sm:text-base">
                {isAm
                  ? "በመጠባበቅ ላይ ያሉ ግብዣዎች"
                  : "Pending Invitations"}
              </h2>

              <p className="mt-0.5 text-xs text-coffee-500">
                {isAm
                  ? "ገና ያልተቀበሉ የሰራተኞች ግብዣዎች"
                  : "Staff invitations that have not been accepted yet."}
              </p>
            </div>

            <button
              type="button"
              onClick={refreshWorkspace}
              disabled={isRefreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cream-300 bg-white text-coffee-500 transition hover:bg-cream-100 hover:text-coffee-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={
                isAm
                  ? "ግብዣዎችን አድስ"
                  : "Refresh invitations"
              }
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  isRefreshing
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />
            </button>
          </div>

          {pendingCount === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cream-100">
                <MailQuestion className="h-5 w-5 text-coffee-400" />
              </div>

              <h3 className="mt-3 text-sm font-bold text-coffee-700">
                {isAm
                  ? "ምንም የሚጠባበቅ ግብዣ የለም"
                  : "No pending invitations"}
              </h3>

              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-coffee-500">
                {isAm
                  ? "አዲስ ሰራተኛ ለመጨመር የሰራተኛ ጨምር ይጫኑ።"
                  : "Add a staff member to create a new invitation."}
              </p>

              <button
                type="button"
                onClick={() => setActiveTab("invite")}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-berbere-500 px-3.5 text-xs font-bold text-white transition-colors hover:bg-berbere-600"
              >
                <UserPlus className="h-4 w-4" />

                {isAm
                  ? "ሰራተኛ ጨምር"
                  : "Add Staff"}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-cream-200">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-coffee-700">
                      {invite.staff_name || "—"}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-coffee-500">
                        {formatRole(
                          invite.role_assigned,
                          isAm
                        )}
                      </span>

                      {invite.phone && (
                        <>
                          <span className="text-coffee-300">
                            ·
                          </span>

                          <span className="truncate text-[11px] text-coffee-400">
                            {invite.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-lg border border-gold-200 bg-gold-50 px-2.5 py-1.5">
                    <span className="font-mono text-xs font-black tracking-wider text-gold-700">
                      {invite.code || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatRole(
  role: string | null | undefined,
  isAm: boolean
): string {
  const roles: Record<string, [string, string]> = {
    owner: ["Owner", "ባለቤት"],
    manager: ["Manager", "አስተዳዳሪ"],
    cashier: ["Cashier", "ገንዘብ ተቀባይ"],
    inventory_clerk: [
      "Stock Clerk",
      "የክምችት ኃላፊ",
    ],
    waiter: ["Waiter", "አስተናጋጅ"],
    barman: ["Barman", "ባርማን"],
    kitchen: ["Kitchen", "ወጥ ቤት"],
  };

  const pair = role ? roles[role] : undefined;

  if (!pair) {
    return role || "—";
  }

  return isAm ? pair[1] : pair[0];
}


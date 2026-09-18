"use client";

import React from "react";
import { UserRoleRow, UserProfile } from "./UserRoleRow";

interface StaffTableProps {
users: UserProfile[];
onRefreshList: () => void;
locale: string;
}

export default function StaffTable({
users = [],
onRefreshList,
locale,
}: StaffTableProps) {
const isAm = locale === "am";

const safeUsers = Array.isArray(users) ? users : [];

return (
<div className="w-full overflow-hidden rounded-2xl border border-cream-200/80 bg-white shadow-sm">
{/* HEADER */}
<div className="border-b border-cream-100 bg-cream-50/40 px-3 py-3">
<h2 className="text-sm font-black text-coffee-950">
{isAm ? "የሰራተኞች ዝርዝር" : "Staff List"}
</h2>

    <p className="mt-0.5 text-[10px] text-coffee-500">
      {isAm
        ? "ሰራተኞችን ይመልከቱ እና ሚናቸውን ይቆጣጠሩ"
        : "View staff and manage roles easily"}
    </p>
  </div>

  {/* TABLE */}
  <div className="w-full overflow-x-auto">
    <table className="w-full min-w-full table-fixed border-collapse text-left">
      {/* TABLE HEAD */}
      <thead>
        <tr className="border-b border-cream-100 bg-cream-50 text-[10px] font-black uppercase tracking-wider text-coffee-500">
          <th className="w-[60%] px-3 py-3">
            {isAm ? "ሰራተኛ / ስልክ" : "Employee / Phone"}
          </th>

          <th className="w-[40%] px-3 py-3 text-right">
            {isAm ? "ሚና" : "Role"}
          </th>
        </tr>
      </thead>

      {/* TABLE BODY */}
      <tbody className="divide-y divide-cream-50 text-xs">
        {safeUsers.length === 0 ? (
          <tr>
            <td colSpan={2} className="px-3 py-10 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-cream-100 text-coffee-400">
                <span className="text-lg">+</span>
              </div>

              <p className="text-xs font-bold text-coffee-900">
                {isAm ? "ምንም ሰራተኛ የለም" : "No staff yet"}
              </p>

              <p className="mt-1 text-[10px] text-coffee-400">
                {isAm
                  ? "ከ‘ሰራተኛ ጨምር’ ትር ሰራተኛ ይጋብዙ"
                  : "Go to Add Staff to invite employees"}
              </p>
            </td>
          </tr>
        ) : (
          safeUsers.map((user) => (
            <UserRoleRow
              key={user.id}
              user={user}
              onRefreshList={onRefreshList}
              locale={locale}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
</div>

);
}
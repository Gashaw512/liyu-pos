'use client'

import React from 'react';
import { UserRoleRow, UserProfile } from './UserRoleRow';

interface StaffTableProps {
  users: UserProfile[];
  onRefreshList: () => void;
  locale: string;
}

export default function StaffTable({ users = [], onRefreshList, locale }: StaffTableProps) {
  const isAm = locale === 'am';

  const safeUsers = Array.isArray(users) ? users : [];

  return (
    <div className="w-full bg-white rounded-2xl border border-cream-200/80 overflow-hidden shadow-sm">

      {/* HEADER */}
      <div className="px-3 py-3 bg-cream-50/40 border-b border-cream-100">
        <h2 className="text-sm font-black text-coffee-950">
          {isAm ? "የሰራተኞች ዝርዝር" : "Staff List"}
        </h2>
        <p className="text-[10px] text-coffee-500 mt-0.5">
          {isAm
            ? "ሰራተኞችን ይመልከቱ እና ሚናቸውን ይቆጣጠሩ"
            : "View staff and manage roles easily"}
        </p>
      </div>

      {/* TABLE WRAPPER */}
      <div className="w-full overflow-x-auto select-none">

        <table className="w-full table-fixed min-w-full text-left border-collapse">

          {/* TABLE HEAD */}
          <thead>
            <tr className="bg-cream-50 border-b border-cream-100 text-[10px] font-black uppercase tracking-wider text-coffee-500">
              <th className="px-3 py-3 w-[60%]">
                {isAm ? 'ሰራተኛ / ስልክ' : 'Employee / Phone'}
              </th>

              <th className="px-3 py-3 w-[40%] text-right">
                {isAm ? 'ሚና' : 'Role'}
              </th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-cream-50 text-xs">

            {/* EMPTY STATE */}
            {safeUsers.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-10 text-center">
                  <div className="text-3xl mb-2">👥</div>

                  <p className="text-xs font-bold text-coffee-900">
                    {isAm ? "ምንም ሰራተኛ የለም" : "No staff yet"}
                  </p>

                  <p className="text-[10px] text-coffee-400 mt-1">
                    {isAm
                      ? "ከ‘አዲስ ሰራተኛ’ ትር ተጋብዝ"
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
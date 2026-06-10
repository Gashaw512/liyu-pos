'use client'

import React from 'react';
import { UserRoleRow, UserProfile } from './UserRoleRow';

interface StaffTableProps {
  users: UserProfile[];
  onRefreshList: () => void;
  locale: string;
}

export default function StaffTable({ users, onRefreshList, locale }: StaffTableProps) {
  const isAm = locale === 'am';

  return (
    <div className="w-full bg-white rounded-xl border border-cream-200/80 overflow-hidden">
      
      {/* 📱 Mobile-First Layout: table-fixed ensures widths are locked to percentages */}
      <div className="w-full overflow-x-auto select-none">
        <table className="w-full text-left border-collapse table-fixed min-w-full">
          <thead>
            <tr className="bg-cream-50/50 border-b border-cream-100 text-[10px] font-black uppercase tracking-wider text-coffee-500">
              {/* Layout allocation split perfectly across small viewports: 60% Name/Phone, 40% Role Actions */}
              <th className="px-3 py-3 w-[60%]">{isAm ? 'ሰራተኛ / ስልክ' : 'Employee / Phone'}</th>
              <th className="px-3 py-3 w-[40%] text-right">{isAm ? 'ሚና' : 'System Role'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-50 text-xs">
            {users.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-xs font-medium text-coffee-400">
                  {isAm ? 'ምንም ንቁ ሰራተኛ አልተገኘም' : 'No active staff members found.'}
                </td>
              </tr>
            ) : (
              users.map((user) => (
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
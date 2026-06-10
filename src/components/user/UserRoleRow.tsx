'use client'

import React, { useState } from 'react'
import { useRoleManagement } from '../../hooks/useRoleManagement'
import { AvailableRole } from '../../services/roles'

export interface UserProfile {
  id: string
  full_name: string
  phone: string
  profile_roles: { role_name: string }[]
}

interface UserRoleRowProps {
  user: UserProfile
  onRefreshList: () => void;
  locale: string
}

const ALL_SYSTEM_ROLES: AvailableRole[] = [
  'owner',
  'manager',
  'cashier',
  'inventory_clerk',
  'waiter',
  'barman',
  'kitchen'
]

export const UserRoleRow: React.FC<UserRoleRowProps> = ({ user, onRefreshList, locale }) => {
  const isAm = locale === 'am';
  
  // Track the primary active role safely
  const [currentRole, setCurrentRole] = useState<string>(
    user.profile_roles[0]?.role_name || 'waiter'
  )

  const { toggleRoleAssignment, isProcessing } = useRoleManagement({
    onSuccess: (msg) => {
      console.log('Success:', msg)
      onRefreshList()
    },
    onError: (err) => {
      alert(`Access Control Alert: ${err}`)
    }
  })

  const getLocalizedRoleName = (rawRole: string): string => {
    if (!isAm) return rawRole.replace('_', ' ').toUpperCase();
    const roleMap: Record<string, string> = {
      owner: "ባለቤት",
      manager: "ስራ አስኪያጅ",
      cashier: "ካሺየር",
      waiter: "አስተናጋጅ",
      kitchen: "ወጥ ቤት",
      barman: "ባርማን",
      inventory_clerk: "ክምችት ተቆጣጣሪ"
    };
    return roleMap[rawRole.toLowerCase()] || rawRole;
  };

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as AvailableRole;
    const oldRole = currentRole;
    
    // Optimistically update the UI view layer
    setCurrentRole(newRole);

    // 1. Remove the old role context assignment, then bind the new one
    const success = await toggleRoleAssignment(user.id, newRole, [oldRole]);
    if (!success) {
      // Revert state if backend database pipeline fails
      setCurrentRole(oldRole);
    }
  };

  return (
    <tr className="hover:bg-cream-50/20 transition-colors duration-150 group">
      
      {/* 👤 LEFT COLUMN: EMPLOYEE INFO IDENTITY (60% Width Allocated) */}
      <td className="px-3 py-3 w-[60%] align-middle overflow-hidden">
        <div className="text-xs font-bold text-coffee-800 group-hover:text-coffee-950 transition-colors truncate max-w-full">
          {user.full_name}
        </div>
        <div className="text-[10px] font-mono text-coffee-400 mt-0.5 tracking-tight truncate max-w-full">
          {user.phone || (isAm ? 'ስልክ አልተመዘገበም' : 'No phone entry')}
        </div>
      </td>

      {/* ⚙️ RIGHT COLUMN: RESPONSIVE NATIVE DROP-DOWN SELECTION (40% Width Allocated) */}
      <td className="px-3 py-3 w-[40%] text-right align-middle">
        <div className="inline-block relative max-w-full">
          <select
            value={currentRole}
            disabled={isProcessing}
            onChange={handleRoleChange}
            className={`text-[11px] font-black tracking-tight bg-berbere-50/60 border border-berbere-200/80 text-berbere-700 rounded-lg px-2 py-1 outline-none text-right appearance-none cursor-pointer transition-all active:scale-95
              ${isProcessing ? 'opacity-40 pointer-events-none' : 'hover:bg-berbere-100/50'}
            `}
            style={{ direction: 'rtl' }} // Enforces clean native text alignment to the right side on touch layouts
          >
            {ALL_SYSTEM_ROLES.map((role) => (
              <option key={role} value={role} className="bg-white text-coffee-800 text-left text-xs font-semibold">
                {getLocalizedRoleName(role)} {currentRole === role ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </td>

    </tr>
  )
}
'use client'

import React, { useState } from 'react'
import { useRoleManagement } from '../../hooks/useRoleManagement'
import { AvailableRole } from '../../services/roles'

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  role: AvailableRole
}

interface UserRoleRowProps {
  user: UserProfile
  onRefreshList: () => void
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

export const UserRoleRow: React.FC<UserRoleRowProps> = ({
  user,
  onRefreshList,
  locale
}) => {
  const isAm = locale === 'am'

  /**
   * SINGLE SOURCE OF TRUTH
   */
  const [currentRole, setCurrentRole] = useState<AvailableRole>(user.role)

  const { toggleRoleAssignment, isProcessing } = useRoleManagement({
    onSuccess: () => onRefreshList(),
    onError: (err) => alert(`Access Control Alert: ${err}`)
  })

  const getLocalizedRoleName = (role: AvailableRole): string => {
    if (!isAm) return role.replace('_', ' ').toUpperCase()

    const map: Record<AvailableRole, string> = {
      owner: "ባለቤት",
      manager: "ስራ አስኪያጅ",
      cashier: "ካሺየር",
      waiter: "አስተናጋጅ",
      kitchen: "ወጥ ቤት",
      barman: "ባርማን",
      inventory_clerk: "ክምችት ተቆጣጣሪ"
    }

    return map[role]
  }

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as AvailableRole
    const oldRole = currentRole

    setCurrentRole(newRole)

    const success = await toggleRoleAssignment(user.id, newRole, [oldRole])

    if (!success) {
      setCurrentRole(oldRole)
    }
  }

  return (
    <tr className="hover:bg-cream-50/20 transition-colors duration-150 group">
      {/* LEFT */}
      <td className="px-3 py-3 w-[60%]">
        <div className="text-xs font-bold text-coffee-800 truncate">
          {user.full_name}
        </div>

        <div className="text-[10px] font-mono text-coffee-400">
          {user.phone ?? (isAm ? 'ስልክ የለም' : 'No phone')}
        </div>
      </td>

      {/* RIGHT */}
      <td className="px-3 py-3 w-[40%] text-right">
        <select
          value={currentRole}
          disabled={isProcessing}
          onChange={handleRoleChange}
          className="text-[11px] font-black bg-berbere-50/60 border border-berbere-200/80 text-berbere-700 rounded-lg px-2 py-1"
        >
          {ALL_SYSTEM_ROLES.map((role) => (
            <option key={role} value={role}>
              {getLocalizedRoleName(role)}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRoleManagement } from "../../hooks/useRoleManagement";
import { AvailableRole } from "../../services/roles";
import { Route } from "next";

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: AvailableRole;
}

interface UserRoleRowProps {
  user: UserProfile;
  onRefreshList: () => void;
  locale: string;
}

const ALL_SYSTEM_ROLES: AvailableRole[] = [
  "owner",
  "manager",
  "cashier",
  "inventory_clerk",
  "waiter",
  "barman",
  "kitchen",
];

export const UserRoleRow: React.FC<UserRoleRowProps> = ({
  user,
  onRefreshList,
  locale,
}) => {
  const isAm = locale === "am";

  const [currentRole, setCurrentRole] =
    useState<AvailableRole>(user.role);

  const {
    toggleRoleAssignment,
    isProcessing,
  } = useRoleManagement({
    onSuccess: () => onRefreshList(),
    onError: (err) =>
      alert(`Access Control Alert: ${err}`),
  });

  const getLocalizedRoleName = (
    role: AvailableRole
  ): string => {
    if (!isAm) {
      return role.replace("_", " ").toUpperCase();
    }

    const map: Record<AvailableRole, string> = {
      owner: "ባለቤት",
      manager: "ስራ አስኪያጅ",
      cashier: "ካሺየር",
      waiter: "አስተናጋጅ",
      kitchen: "ወጥ ቤት",
      barman: "ባርማን",
      inventory_clerk: "ክምችት ተቆጣጣሪ",
    };

    return map[role];
  };

  const handleRoleChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newRole =
      e.target.value as AvailableRole;

    const oldRole = currentRole;

    if (newRole === oldRole) {
      return;
    }

    setCurrentRole(newRole);

    const success =
      await toggleRoleAssignment(
        user.id,
        newRole,
        [oldRole]
      );

    if (!success) {
      setCurrentRole(oldRole);
    }
  };

  const staffDetailHref =
    `/${locale}/management/staff/${user.id}` as Route;

  return (
    <tr className="group transition-colors duration-150 hover:bg-cream-50/20">
      {/* STAFF */}
      <td className="w-[60%] px-3 py-3">
        <Link
          href={staffDetailHref}
          className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-berbere-300"
        >
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-coffee-800 transition-colors hover:text-berbere-600">
              {user.full_name ||
                (isAm
                  ? "ያልተሰየመ ሰራተኛ"
                  : "Unnamed staff")}
            </div>

            <div className="truncate font-mono text-[10px] text-coffee-400">
              {user.phone ??
                (isAm
                  ? "ስልክ የለም"
                  : "No phone")}
            </div>
          </div>
        </Link>
      </td>

      {/* ROLE */}
      <td className="w-[40%] px-3 py-3 text-right">
        <select
          value={currentRole}
          disabled={isProcessing}
          onChange={handleRoleChange}
          aria-label={
            isAm
              ? `የ${user.full_name} ሚና`
              : `Role for ${user.full_name}`
          }
          className="rounded-lg border border-berbere-200/80 bg-berbere-50/60 px-2 py-1 text-[11px] font-black text-berbere-700 outline-none transition focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ALL_SYSTEM_ROLES.map((role) => (
            <option
              key={role}
              value={role}
            >
              {getLocalizedRoleName(role)}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
};


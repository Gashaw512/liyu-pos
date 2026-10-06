"use client";

import { useState } from "react";
import type { AvailableRole } from "@/services/roles";

interface StaffUpdateRoleFormProps {
  locale: string;
  staffId: string;
  primaryRole: AvailableRole;
  assignedRoles: AvailableRole[];
}

const OPTIONS: Array<{ role: Exclude<AvailableRole, "owner">; en: string; am: string }> = [
  { role: "manager", en: "Manager", am: "አስተዳዳሪ" },
  { role: "cashier", en: "Cashier", am: "ገንዘብ ተቀባይ" },
  { role: "inventory_clerk", en: "Stockkeeper", am: "የክምችት ተቆጣጣሪ" },
  { role: "waiter", en: "Waiter", am: "አስተናጋጅ" },
  { role: "barman", en: "Barman", am: "ባርማን" },
  { role: "kitchen", en: "Kitchen", am: "ወጥ ቤት" },
]

export default function StaffUpdateRoleForm({ locale, staffId, primaryRole, assignedRoles }: StaffUpdateRoleFormProps) {
  const isAm = locale === "am"
  const [roles, setRoles] = useState<AvailableRole[]>([...new Set([primaryRole, ...assignedRoles])])
  const [busyRole, setBusyRole] = useState<AvailableRole | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function updateRole(role: Exclude<AvailableRole, "owner">, assigned: boolean) {
    setBusyRole(role)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/management/staff/${staffId}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, assigned }),
      })
      const result = await response.json() as { roles?: AvailableRole[]; error?: string }
      if (!response.ok || !result.roles) throw new Error(result.error || "Could not update staff role.")
      setRoles(result.roles)
      setMessage(isAm ? "የስራ ሚና ተቀይሯል።" : "Staff role updated.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update staff role.")
    } finally {
      setBusyRole(null)
    }
  }

  return (
    <section aria-labelledby="staff-roles-title">
      <h2 id="staff-roles-title" className="text-sm font-black text-coffee-700">
        {isAm ? "የስራ ሚናዎች" : "Staff roles"}
      </h2>
      <p className="mt-1 text-xs leading-5 text-coffee-500">
        {isAm ? "አንድ ሰራተኛ ከአንድ በላይ ሚና ሊኖረው ይችላል።" : "A staff member can have more than one role."}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map(({ role, en, am }) => {
          const checked = roles.includes(role)
          const primary = role === primaryRole
          return (
            <label key={role} className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm font-semibold text-coffee-700">
              <input
                type="checkbox"
                checked={checked}
                disabled={primary || busyRole !== null}
                onChange={(event) => void updateRole(role, event.target.checked)}
                className="h-5 w-5 accent-berbere-500 disabled:opacity-70"
              />
              <span className="flex-1">{isAm ? am : en}</span>
              {primary && <span className="text-[10px] font-bold text-coffee-400">{isAm ? "ዋና" : "Primary"}</span>}
              {busyRole === role && <span className="text-[10px] text-coffee-400">{isAm ? "በማስቀመጥ ላይ" : "Saving…"}</span>}
            </label>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-xs font-semibold text-success">{message}</p>}
    </section>
  )
}

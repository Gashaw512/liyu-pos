"use client";

import { useState } from "react";
import createClient from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StaffUpdateRoleFormProps {
  locale: string;
  staffId: string;
  currentRole: string;
}

export default function StaffUpdateRoleForm({
  locale,
  staffId,
  currentRole,
}: StaffUpdateRoleFormProps) {
  const isAm = locale === "am";

  const supabase = createClient();
  const router = useRouter();

  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: "manager",
      label: isAm ? "ማናጀር" : "Manager",
    },
    {
      id: "cashier",
      label: isAm ? "ካሺየር" : "Cashier",
    },
    {
      id: "inventory_clerk",
      label: isAm
        ? "የክምችት ሰራተኛ"
        : "Stock Clerk",
    },
    {
      id: "waiter",
      label: isAm ? "አስተናጋጅ" : "Waiter",
    },
    {
      id: "barman",
      label: isAm ? "ባርማን" : "Barman",
    },
    {
      id: "kitchen",
      label: isAm ? "ወጥ ቤት" : "Kitchen",
    },
  ];

  async function handleUpdateRole(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (role === currentRole) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role,
        })
        .eq("id", staffId);

      if (error) {
        throw error;
      }

      router.refresh();

      alert(
        isAm
          ? "የስራ ሚናው በተሳካ ሁኔታ ተቀይሯል!"
          : "Staff role updated successfully!"
      );
    } catch (err) {
      console.error(
        "[STAFF ROLE] Failed to update role:",
        err
      );

      // Return the selector to the saved role
      setRole(currentRole);

      alert(
        isAm
          ? "ሚና ለመቀየር አልተሳካም።"
          : "Failed to update role."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleUpdateRole}
      className="mt-2 space-y-3"
    >
      <label
        htmlFor="staff-role"
        className="block text-[11px] font-bold uppercase tracking-wide text-coffee-600"
      >
        {isAm
          ? "የስራ ሚና ቀይር"
          : "Change Staff Role"}
      </label>

      <div className="flex gap-2">
        <select
          id="staff-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2 text-xs font-bold text-coffee-900 outline-none transition focus:border-berbere-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {roles.map((r) => (
            <option
              key={r.id}
              value={r.id}
            >
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={
            loading ||
            role === currentRole
          }
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-berbere-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-berbere-600 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-coffee-400"
        >
          {loading && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}

          {isAm ? "አዘምን" : "Update"}
        </button>
      </div>
    </form>
  );
}
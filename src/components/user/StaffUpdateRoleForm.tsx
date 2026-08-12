'use client'

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
    { id: "manager", label: isAm ? "ማናጀር" : "Manager" },
    { id: "cashier", label: isAm ? "ካሺየር" : "Cashier" },
    { id: "waiter", label: isAm ? "አስተናጋጅ" : "Waiter" },
    { id: "kitchen", label: isAm ? "ወጥ ቤት" : "Kitchen" },
    { id: "stock_clerk", label: isAm ? "የክምችት ሰራተኛ" : "Stock Clerk" },
  ];

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: role })
        .eq("id", staffId);

      if (error) throw error;
      
      router.refresh();
      alert(isAm ? "የስራ ሚናው በተሳካ ሁኔታ ተቀይሯል!" : "Staff role updated successfully!");
    } catch (err) {
      console.error(err);
      alert(isAm ? "ሚና ለመቀየር አልተሳካም" : "Failed to update role");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpdateRole} className="space-y-3 mt-2">
      <label className="block text-[11px] font-bold text-coffee-600 uppercase">
        {isAm ? "የስራ ሚና ቀይር" : "Change Staff Role"}
      </label>
      
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
          className="flex-1 text-xs bg-cream-50/50 border border-cream-200 rounded-xl px-3 py-2 font-bold text-coffee-900 focus:outline-none focus:border-berbere-500"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading || role === currentRole}
          className="bg-berbere-500 hover:bg-berbere-600 disabled:bg-cream-200 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {isAm ? "አቅርብ" : "Update"}
        </button>
      </div>
    </form>
  );
}

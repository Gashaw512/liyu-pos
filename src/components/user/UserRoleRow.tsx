import Link from "next/link";
import type { Route } from "next";
import type { AvailableRole } from "@/services/roles";

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: AvailableRole;
  roles: AvailableRole[];
}

interface UserRoleRowProps {
  user: UserProfile;
  onRefreshList: () => void;
  locale: string;
}

const ROLE_LABELS: Record<AvailableRole, [string, string]> = {
  owner: ["Owner", "ባለቤት"],
  manager: ["Manager", "አስተዳዳሪ"],
  cashier: ["Cashier", "ገንዘብ ተቀባይ"],
  inventory_clerk: ["Stockkeeper", "የክምችት ተቆጣጣሪ"],
  waiter: ["Waiter", "አስተናጋጅ"],
  barman: ["Barman", "ባርማን"],
  kitchen: ["Kitchen", "ወጥ ቤት"],
};

export function UserRoleRow({ user, locale }: UserRoleRowProps) {
  const isAm = locale === "am";
  const staffDetailHref = `/${locale}/management/staff/${user.id}` as Route;

  return (
    <tr className="group transition-colors duration-150 hover:bg-cream-50/20">
      <td className="w-[55%] px-3 py-3">
        <Link href={staffDetailHref} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-berbere-300">
          <div className="truncate text-xs font-bold text-coffee-800 hover:text-berbere-600">
            {user.full_name || (isAm ? "ያልተሰየመ ሰራተኛ" : "Unnamed staff")}
          </div>
          <div className="truncate font-mono text-[10px] text-coffee-400">{user.phone ?? (isAm ? "ስልክ የለም" : "No phone")}</div>
        </Link>
      </td>
      <td className="w-[45%] px-3 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {user.roles.map((role) => (
            <span key={role} className="rounded-md bg-berbere-50 px-1.5 py-1 text-[9px] font-black text-berbere-700">
              {ROLE_LABELS[role]?.[isAm ? 1 : 0] ?? role}
            </span>
          ))}
        </div>
        <Link href={staffDetailHref} className="mt-1 inline-flex min-h-8 items-center rounded-lg px-2 text-[10px] font-bold text-coffee-500 hover:bg-cream-100 hover:text-berbere-700">
          {isAm ? "ሚና አስተካክል" : "Manage roles"}
        </Link>
      </td>
    </tr>
  );
}

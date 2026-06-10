// src/components/layout/BottomNav.tsx
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  locale: string;
  role: string;
}

export default function BottomNav({ locale, role }: BottomNavProps) {
  const pathname = usePathname();
  const isAm = locale === "am";

  // 🎯 Clean, architecture-compliant Tab Configuration Matrix
  const tabs = [
    { name: isAm ? "ቤት" : "Home", path: `/${locale}/dashboard`, emoji: "📊", roles: ["owner", "manager", "cashier", "inventory_clerk", "waiter", "kitchen"] },
    { name: isAm ? "ክምችት" : "Stock", path: `/${locale}/inventory`, emoji: "📦", roles: ["owner", "manager", "inventory_clerk"] },
    { name: isAm ? "ሽያጭ" : "Sale", path: `/${locale}/sales`, emoji: "💰", roles: ["owner", "manager", "cashier", "waiter"] },
    { name: isAm ? "ሪፖርት" : "Reports", path: `/${locale}/reports`, emoji: "📈", roles: ["owner", "manager"] },
    // 👥 STAFF MANAGEMENT: Swaps dynamically to save structural column space
    { name: isAm ? "ሰራተኞች" : "Staff", path: `/${locale}/staff`, emoji: "👥", roles: ["owner", "manager"] },
    { name: isAm ? "ማስተካከያ" : "Settings", path: `/${locale}/settings`, emoji: "⚙️", roles: ["owner", "manager"] },
  ];

  // Dynamic system role boundary parsing (Strictly caps screen array at 5 items max for mobile safety)
  const visibleTabs = tabs.filter(tab => tab.roles.includes(role || "waiter")).slice(0, 5);
  console.log("Visible Tabs for Role:", role, visibleTabs.map(t => t.name));

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 w-full h-16 bg-white border-t border-cream-200/80 grid px-2 shadow-[0_-4px_12px_rgba(43,30,26,0.05)] z-40 select-none safe-bottom"
      style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
    >
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.path || (tab.path !== `/${locale}/dashboard` && pathname.startsWith(`${tab.path}/`));
        
        return (
          <Link
            key={tab.path}
            href={tab.path as any}
            className="flex flex-col items-center justify-center space-y-0.5 active:scale-95 active:bg-cream-50/50 transition-all duration-150 relative"
          >
            {/* Berbere Primary Red Active Line (#8B2635) */}
            {isActive && (
              <span className="absolute top-0 h-1 w-6 rounded-b-full bg-berbere-500" />
            )}
            
            <span className={`text-lg transition-transform duration-200 ${isActive ? "scale-110" : "opacity-60 grayscale-[15%]"}`}>
              {tab.emoji}
            </span>
            
            <span className={`text-[9px] tracking-tight truncate max-w-full px-1 transition-colors duration-150 ${
              isActive 
                ? "text-berbere-600 font-black" 
                : "text-coffee-400 font-bold"
            }`}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
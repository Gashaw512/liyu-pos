// src/components/layout/Sidebar.tsx
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  businessName: string;
  fullName: string;
  role: string;
  locale: string;
}

export default function Sidebar({ businessName, fullName, role, locale }: SidebarProps) {
  const pathname = usePathname();
  const isAm = locale === "am";

  // Comprehensive Desktop layout array containing secondary operational tabs
  const tabs = [
    { name: isAm ? "መነሻ ሰሌዳ" : "Dashboard", path: `/${locale}/dashboard`, emoji: "📊", roles: ["owner", "manager", "cashier", "inventory_clerk"] },
    { name: isAm ? "የክምችት ቁጥጥር" : "Inventory", path: `/${locale}/inventory`, emoji: "📦", roles: ["owner", "manager", "inventory_clerk"] },
    { name: isAm ? "የሽያጭ ማሽን" : "Sales Counter", path: `/${locale}/sales`, emoji: "💰", roles: ["owner", "manager", "cashier"] },
    { name: isAm ? "ሪፖርቶች" : "Analytics Reports", path: `/${locale}/reports`, emoji: "📈", roles: ["owner", "manager"] },
    { name: isAm ? "ፈረቃ" : "Shifts Tracking", path: `/${locale}/shifts`, emoji: "⏳", roles: ["owner", "manager", "cashier"] },
    { name: isAm ? "ሰራተኞች" : "Staff Management", path: `/${locale}/staff`, emoji: "👥", roles: ["owner", "manager"] },
    { name: isAm ? "ማስተካከያ" : "System Settings", path: `/${locale}/settings`, emoji: "⚙️", roles: ["owner", "manager"] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(role));

  return (
    <div className="flex flex-col h-full bg-coffee-900 border-r border-coffee-800 text-cream-50 p-3 xl:p-4 select-none">
      
      {/* 👑 Corporate Identity Branding Frame */}
      <div className="py-4 px-1 xl:px-2 border-b border-coffee-800/60 mb-5 text-center xl:text-left">
        <h2 className="text-xs xl:text-base font-black tracking-widest text-gold-400 uppercase truncate">
          <span className="hidden xl:inline">{businessName || "LIYU POS"}</span>
          <span className="xl:hidden">LP</span>
        </h2>
        <p className="hidden xl:block text-[10px] text-coffee-400 font-bold uppercase tracking-wider mt-1 truncate">
          {role}
        </p>
      </div>

      {/* 🚀 Scrollable Links Wrapper Fluid Stack */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
          return (
            <Link
              key={tab.path}
              href={tab.path as any}
              className={`flex items-center justify-center xl:justify-start space-x-0 xl:space-x-3 h-11 xl:h-auto px-2 xl:px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm font-bold relative ${
                isActive 
                  ? "bg-berbere-500 text-white shadow-md scale-102" 
                  : "text-coffee-300 hover:bg-coffee-800/40 hover:text-white"
              }`}
              title={tab.name}
            >
              <span className="text-xl xl:text-lg transition-transform duration-150 group-hover:scale-105">{tab.emoji}</span>
              <span className="hidden xl:inline truncate tracking-tight">{tab.name}</span>

              {/* Tablet Minimal Edge Pin Badge */}
              {isActive && (
                <span className="absolute left-1 xl:hidden h-2 w-1 rounded-full bg-gold-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Operator Info Container */}
      <div className="hidden xl:block pt-3 border-t border-coffee-800/60 text-[11px] text-coffee-400 truncate">
        👤 {fullName}
      </div>

    </div>
  );
}
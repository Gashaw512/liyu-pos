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

  // Navigation schema configured exactly to your project routing directories
  const tabs = [
    { name: isAm ? "ቤት" : "Home", path: `/${locale}/dashboard`, emoji: "📊", roles: ["owner", "manager", "cashier", "inventory_clerk"] },
    { name: isAm ? "ሽያጭ" : "POS", path: `/${locale}/sales`, emoji: "💰", roles: ["owner", "manager", "cashier"] },
    { name: isAm ? "ክምችት" : "Stock", path: `/${locale}/inventory`, roles: ["owner", "manager", "inventory_clerk"], emoji: "📦" },
    { name: isAm ? "ሪፖርት" : "Reports", path: `/${locale}/reports`, roles: ["owner", "manager"], emoji: "📈" },
    { name: isAm ? "ፈረቃ" : "Shift", path: `/${locale}/shifts`, roles: ["owner", "manager", "cashier"], emoji: "⏳" },
  ];

  // Filters accessible routes based on user roles and fits up to 5 elements beautifully on small screens
  const visibleTabs = tabs.filter(tab => tab.roles.includes(role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white border-t border-slate-200/80 grid px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-40 select-none"
         style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
        
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className="flex flex-col items-center justify-center space-y-0.5 active:scale-90 active:bg-slate-50 transition-all duration-150 relative group"
          >
            {/* Visual Highlight Dot Indicator */}
            {isActive && (
              <span className="absolute top-1 h-1 w-4 rounded-full bg-emerald-500 animate-fadeIn" />
            )}
            
            <span className={`text-xl transition-transform duration-200 ${isActive ? "scale-110 filter drop-shadow-sm" : "opacity-60 grayscale-[30%]"}`}>
              {tab.emoji}
            </span>
            
            <span className={`text-[10px] font-black tracking-tight transition-colors duration-150 ${
              isActive 
                ? "text-emerald-600 font-black scale-102" 
                : "text-slate-400 font-bold"
            }`}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
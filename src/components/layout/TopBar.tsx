// src/components/layout/TopBar.tsx
'use client'

import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface TopBarProps {
  businessName: string;
  fullName: string;
  role: string;
  locale: string;
}

export default function TopBar({ businessName, fullName, role, locale }: TopBarProps) {
  const { isOnline, pendingCount } = useOnlineStatus(); 
  const isAm = locale === "am";
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getLocalizedRole = (rawRole: string): string => {
    if (!isAm) return rawRole.toUpperCase();
    const roleMap: Record<string, string> = {
      owner: "ባለቤት",
      manager: "ስራ አስኪያጅ",
      cashier: "ካሺየር",
      waiter: "አስተናጋጅ",
      kitchen: "ወጥ ቤት",
      inventory_clerk: "ክምችት ተቆጣጣሪ"
    };
    return roleMap[rawRole.toLowerCase()] || rawRole;
  };

  const toggleLanguage = () => {
    if (!pathname) return;
    const segments = pathname.split("/");
    segments[1] = isAm ? "en" : "am";
    router.push(segments.join("/") as any);
  };

  const handleLogout = () => {
    router.push(`/${locale}/auth/login` as any);
  };

  return (
    // 🎨 WHITE & TRANSPARENT MOBILE BASELINE: Clean backdrop filter with subtle border rules
    <header className="sticky top-0 h-14 bg-white/80 backdrop-blur-md text-coffee-900 px-3 flex items-center justify-between z-50 select-none border-b border-cream-200/80 shadow-[0_2px_8px_rgba(43,30,26,0.02)]">
      
      {/* 👤 LEFT PROFILE MATRICES */}
      <div className="flex items-center space-x-2 max-w-[50%]">
        {/* Rounded dynamic text indicator tile */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream-50 border border-cream-200 text-[10px] font-black text-coffee-700">
          {role ? role.substring(0, 2).toUpperCase() : "U"}
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black tracking-wider text-berbere-600 uppercase truncate leading-none">
            {businessName || "LIYU POS"}
          </span>
          <span className="text-[11px] text-coffee-800 font-bold truncate mt-1 leading-none">
            {fullName} <span className="text-cream-300 font-medium mx-0.5">•</span> 
            <span className="text-coffee-400 font-extrabold text-[9px] inline-block">
              {getLocalizedRole(role)}
            </span>
          </span>
        </div>
      </div>

      {/* 🛠️ RIGHT CONTROLS OVERLAY */}
      <div className="flex items-center space-x-1.5">
        
        {/* 🌐 HIGH-CONTRAST INTERNET STATUS BADGE */}
        <div className={`flex h-8 items-center space-x-1 px-2 rounded-xl border transition-all duration-300 ${
          !mounted 
            ? "bg-cream-50 border-cream-100 text-coffee-300" 
            : isOnline 
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-700" 
              : "bg-berbere-50/60 border-berbere-200 text-berbere-700"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            !mounted ? "bg-cream-300" : isOnline ? "bg-emerald-500 animate-pulse" : "bg-berbere-500 animate-bounce"
          }`} />
          
          <span className="text-[9px] font-black uppercase tracking-tight leading-none">
            {!mounted ? (
              "..."
            ) : isOnline ? (
              isAm ? "መስመር ላይ" : "Online"
            ) : (
              isAm ? `${pendingCount} የቆመ` : "Offline"
            )}
          </span>
        </div>

        {/* 🇺🇸/🇪🇹 TEXT LANGUAGE TOGGLE */}
        <button
          onClick={toggleLanguage}
          type="button"
          className="h-8 px-2 flex items-center justify-center rounded-xl bg-transparent border border-cream-200 hover:bg-cream-50 text-[10px] font-black text-coffee-700 active:scale-95 transition-all duration-150"
        >
          {isAm ? "EN" : "አማርኛ"}
        </button>

        {/* 🚪 SEPARATED LOGOUT ACTION TARGET */}
        <button 
          onClick={handleLogout}
          type="button"
          title={isAm ? "ውጣ" : "Logout"}
          className="h-8 w-8 flex items-center justify-center rounded-xl bg-transparent border border-cream-200 text-coffee-400 hover:text-berbere-600 hover:bg-berbere-50/50 hover:border-berbere-100 active:scale-95 transition-all duration-150 shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>

      </div>

    </header>
  );
}
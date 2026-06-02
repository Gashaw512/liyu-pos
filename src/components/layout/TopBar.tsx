'use client'

import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface TopBarProps {
  businessName: string;
  fullName: string;
  role: string;
  locale: string;
}

export default function TopBar({ businessName, fullName, role, locale }: TopBarProps) {
  const { isOnline, pendingCount } = useOnlineStatus(); 
  const isAm = locale === "am";

  // 🛠️ HYDRATION SAFE GUARD STATE:
  const [mounted, setMounted] = useState(false);

  // Set mounted to true once the code safely reaches the browser
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 h-14 bg-slate-900 text-white px-4 flex items-center justify-between z-40 select-none shadow-md">
      <div className="flex flex-col max-w-[60%]">
        <span className="text-xs text-slate-400 font-black tracking-wider uppercase truncate">
          {businessName}
        </span>
        <span className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
          👤 {fullName} • <span className="text-emerald-400 font-bold">{role === "cashier" && isAm ? "ካሺየር" : role}</span>
        </span>
      </div>

      {/* 🛠️ Dynamic Network Status Sync Badge Container */}
      <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
        !mounted 
          ? "bg-slate-800 border-slate-700 text-slate-400" // Neutral style while checking state
          : isOnline 
            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-400" 
            : "bg-amber-950/80 border-amber-500/30 text-amber-400"
      }`}>
        <span className={`h-2 w-2 rounded-full ${
          !mounted 
            ? "bg-slate-600 animate-pulse" 
            : isOnline 
              ? "bg-emerald-400 animate-pulse" 
              : "bg-amber-400 animate-bounce"
        }`} />
        
        <span className="text-[10px] font-mono font-black uppercase tracking-tight">
          {/* 🛠️ Safe conditional logic switch block: */}
          {!mounted ? (
            isAm ? "በማረጋገጥ ላይ..." : "CHECKING..."
          ) : isOnline ? (
            isAm ? "ቀጥታ መስመር" : "ONLINE"
          ) : (
            isAm ? `${pendingCount} ያልተላከ ሽያጭ` : `${pendingCount} PENDING`
          )}
        </span>
      </div>
    </header>
  );
}
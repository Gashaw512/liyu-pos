// src/components/layout/TopBar.tsx
'use client'

import { useEffect, useState } from "react"
import { useOnlineStatus } from "../../hooks/useOnlineStatus"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Wifi, WifiOff, Clock, Landmark } from "lucide-react"

interface TopBarProps {
  businessName: string
  fullName: string
  role: string
  locale: string
}

export default function TopBar({
  businessName,
  fullName,
  role,
  locale
}: TopBarProps) {

  const router = useRouter()
  const pathname = usePathname()

  const { isOnline, pendingCount } = useOnlineStatus()

  const isAm = locale === "am"
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState("")

  // Real-time system clock synchronization 
  useEffect(() => {
    setMounted(true)
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString(isAm ? "am-ET" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [isAm])

  const getRole = (value: string) => {
    if (!isAm) return value?.toUpperCase()

    const map: any = {
      owner: "ባለቤት",
      manager: "ስራ አስኪያጅ",
      cashier: "ካሺየር",
      waiter: "አስተናጋጅ",
      kitchen: "ወጥ ቤት",
      inventory_clerk: "ክምችት"
    }

    return map[value?.toLowerCase()] || value
  }

  const toggleLanguage = () => {
    if (!pathname) return
    const parts = pathname.split("/")
    parts[1] = isAm ? "en" : "am"
    router.push(parts.join("/") as any)
  }

  const logout = () => {
    router.push(`/${locale}/login` as any)
  }

  return (
    <header className="
      /* ERP EDGE-TO-EDGE GEOMETRY: Stretches full width, nested inside the shell header bracket wrapper */
      absolute top-0 left-0 right-0 w-full
      h-14 z-50
      bg-white
      border-b border-cream-200
      shadow-sm
      flex items-center justify-between
      px-3 sm:px-6
    ">

      {/* LEFT: BUSINESS IDENTITY & USER PROFILE CARD */}
      <div className="flex items-center gap-2.5 min-w-0">
        
        {/* User Role Avatar Token */}
        <div className="
          w-9 h-9
          rounded-xl
          bg-cream-100
          border border-cream-200
          flex items-center justify-center
          text-xs font-black text-coffee-800
          shrink-0
          shadow-inner
        ">
          {(role?.slice(0, 2) || "U").toUpperCase()}
        </div>

        {/* Descriptive Branding Metadata Block */}
        <div className="min-w-0 leading-tight">
          <div className="
            text-[10px] sm:text-[11px]
            font-black uppercase tracking-wider
            text-berbere-600
            flex items-center gap-1
            truncate
          ">
            <Landmark size={10} className="shrink-0 text-berbere-500 hidden sm:inline" />
            <span className="truncate">{businessName || "LIYU POS"}</span>
          </div>

          <div className="
            flex items-center gap-1.5
            text-[11px] sm:text-xs font-bold
            text-coffee-800
            truncate
            mt-0.5
          ">
            <span className="truncate max-w-[90px] sm:max-w-none">{fullName}</span>
            <span className="text-cream-300 font-normal">•</span>
            <span className="text-[9px] sm:text-[10px] text-white bg-coffee-800 font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight shrink-0">
              {getRole(role)}
            </span>
          </div>
        </div>

      </div>

      {/* CENTER: TELEMETRY SYSTEM REAL-TIME DATA (Hidden on small mobile devices) */}
      <div className="hidden md:flex items-center gap-4 text-xs font-bold text-coffee-600 bg-cream-50 px-4 py-1.5 rounded-xl border border-cream-200/60">
        <div className="flex items-center gap-1.5 font-mono text-coffee-800">
          <Clock size={13} className="text-coffee-500" />
          <span className="w-20 tabular-nums">{mounted ? currentTime : "--:--:--"}</span>
        </div>
        <span className="text-cream-300">|</span>
        <div className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
          {isAm ? "ርዕስ መቆጣጠሪያ" : "ERP Terminal Ready"}
        </div>
      </div>

      {/* RIGHT: CONNECTIVITY DIAGNOSTICS & SYSTEM CONTROLS */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Real-time Hardware Sync Status Badge */}
        <div className={`
          h-8 px-2.5
          rounded-xl
          flex items-center gap-1.5
          border
          text-[10px] font-black
          transition-all duration-300
          ${
            !mounted
              ? "bg-cream-50 border-cream-200 text-coffee-300"
              : isOnline
                ? "bg-green-50 border-green-200 text-green-700 shadow-sm shadow-green-100"
                : "bg-berbere-50 border-berbere-200 text-berbere-700 shadow-sm shadow-berbere-100 animate-pulse"
          }
        `}>
          {mounted && isOnline ? (
            <Wifi size={12} className="stroke-[2.5]" />
          ) : (
            <WifiOff size={12} className="stroke-[2.5]" />
          )}

          <span className="hidden xs:inline">
            {!mounted
              ? "..."
              : isOnline
                ? (isAm ? "መስመር ላይ" : "Online")
                : `${pendingCount} ${isAm ? "ቆሟል" : "Pending"}`
            }
          </span>
        </div>

        {/* Localization Switcher Button */}
        <button
          onClick={toggleLanguage}
          aria-label="Toggle Language"
          className="
            h-8 px-2.5
            rounded-xl
            border border-cream-200
            bg-white
            text-[10px] font-black text-coffee-700
            hover:bg-cream-50 hover:border-cream-300
            active:scale-95 transition-all
            shadow-sm
          "
        >
          {isAm ? "EN" : "አማ"}
        </button>

        {/* Secure Session Terminate Button */}
        <button
          onClick={logout}
          aria-label="Terminate Session"
          className="
            w-8 h-8
            rounded-xl
            border border-cream-200
            bg-white
            flex items-center justify-center
            text-coffee-400
            hover:text-berbere-600 hover:border-berbere-200 hover:bg-berbere-50/30
            active:scale-95 transition-all
            shadow-sm
          "
        >
          <LogOut size={14} className="stroke-[2.5]" />
        </button>

      </div>
    </header>
  )
}

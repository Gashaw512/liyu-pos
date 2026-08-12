// src/components/layout/BottomNav.tsx
'use client'

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useErp } from "./AppShell" 
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Route } from "next"

interface BottomNavProps {
  locale: string
  role: string
}

export default function BottomNav({ locale, role }: BottomNavProps) {
  const pathname = usePathname()
  const isAm = locale === "am"
  const { isCollapsed, setIsCollapsed } = useErp()
  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check viewport width against your exact 1024px custom xl breakpoint line natively
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  const tabs = [
    {
      name: isAm ? "መነሻ" : "Home",
      path: `/${locale}/dashboard`,
      icon: Home,
      roles: ["owner", "manager", "cashier", "inventory_clerk", "waiter", "kitchen"]
    },
    {
      name: isAm ? "ምርት" : "Products",
      path: `/${locale}/inventory`,
      icon: Package,
      roles: ["owner", "manager", "inventory_clerk"]
    },
    {
      name: isAm ? "ሽያጭ" : "Sales",
      path: `/${locale}/sales`,
      icon: ShoppingCart,
      roles: ["owner", "manager", "cashier", "waiter"]
    },
    {
      name: isAm ? "ሪፖርት" : "Reports",
      path: `/${locale}/reports`,
      icon: BarChart3,
      roles: ["owner", "manager"]
    },
    {
      name: isAm ? "አስተዳደር" : "Manage",
      path: `/${locale}/management`,
      icon: Settings,
      roles: ["owner", "manager"]
    }
  ]

  const visibleTabs = tabs.filter(tab => tab.roles.includes(role || "waiter")).slice(0, 5)

  if (!mounted) return null

  // If layout engine registers mobile screen viewport sizes
  if (!isDesktop) {
    const gridColsMap: Record<number, string> = {
      1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5"
    }
    const mobileGridClass = gridColsMap[visibleTabs.length] || "grid-cols-5"

    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 h-16 z-40 bg-white border-t border-cream-200 shadow-[0_-10px_30px_rgba(43,30,26,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className={`h-full w-full grid ${mobileGridClass}`}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = pathname === tab.path || (tab.path !== `/${locale}/dashboard` && pathname.startsWith(tab.path))

            return (
              <Link
                key={tab.path}
                href={tab.path as Route}
                className={`flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-all duration-150 ${
                  active ? "text-berbere-500 font-black" : "text-coffee-400 font-bold"
                }`}
              >
                <div className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                  active ? "bg-berbere-50 text-berbere-500" : "bg-transparent text-coffee-400"
                }`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className="text-[10px] tracking-tight truncate max-w-[68px] leading-none">
                  {tab.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // FORCE INLINE DISPLAY FOR DESKTOP (Bypasses compilation vulnerabilities entirely)
  return (
    <aside 
      style={{ display: "flex" }}
      className={`fixed top-14 bottom-0 left-0 z-40 bg-white border-r border-cream-200 pt-5 px-3 flex-col gap-2 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* COLLAPSE TRIGGER */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        type="button"
        className="flex items-center justify-center h-10 w-full mb-4 px-3 rounded-xl text-coffee-400 hover:text-berbere-500 hover:bg-berbere-50/50 transition-all duration-200 active:scale-95 cursor-pointer group"
      >
        <div className="flex items-center justify-between w-full">
          {!isCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400 select-none group-hover:text-berbere-600 transition-colors">
              {isAm ? "ምናሌ ማሳጠሪያ" : "Minimize Menu"}
            </span>
          )}
          <div className={`transition-transform duration-300 ${isCollapsed ? "mx-auto rotate-180" : ""}`}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </div>
        </div>
      </button>

      {/* NAVIGATION LINKS */}
      <div className="flex flex-col gap-1.5 w-full flex-1">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          const active = pathname === tab.path || (tab.path !== `/${locale}/dashboard` && pathname.startsWith(tab.path))

          return (
            <Link
              key={tab.path}
              href={tab.path as Route}
              className={`flex items-center h-12 rounded-xl transition-all duration-200 select-none w-full px-4 gap-3 border group relative overflow-hidden active:scale-[0.98] ${
                active 
                  ? "bg-berbere-50 border-berbere-100 text-berbere-500 font-black shadow-sm" 
                  : "bg-transparent border-transparent text-coffee-500 hover:bg-cream-50/80 hover:text-coffee-800 font-bold"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-berbere-500" />
              )}

              <Icon 
                size={20} 
                strokeWidth={active ? 2.5 : 2} 
                className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  active ? "text-berbere-500" : "text-coffee-400 group-hover:text-coffee-700"
                }`} 
              />

              {!isCollapsed && (
                <span className="text-sm tracking-normal truncate text-inherit">
                  {tab.name}
                </span>
              )}

              {isCollapsed && (
                <div className="absolute left-16 px-2.5 py-1.5 bg-coffee-800 text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 invisible translate-x-2 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                  {tab.name}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
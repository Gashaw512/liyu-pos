'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useErp } from "./AppShell"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DesktopSidebarProps {
  visibleTabs: any[]
}

export default function DesktopSidebar({ visibleTabs }: DesktopSidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed, locale } = useErp()
  const isAm = locale === "am"

  return (
    <aside
      className={`
        hidden lg:flex flex-col shrink-0 h-full bg-white border-r border-cream-200
        transition-all duration-300 ease-in-out select-none
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      <div className="flex flex-col h-full pt-4 px-3 gap-1.5">
        
        {/* COLLAPSE TOGGLE BUTTON */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="
            flex items-center justify-center h-10 w-full mb-4 px-3 rounded-xl
            text-coffee-400 hover:text-coffee-800 hover:bg-cream-50/80
            transition-all duration-200 active:scale-95
          "
        >
          <div className="flex items-center justify-between w-full">
            {!isCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400 whitespace-nowrap">
                {isAm ? "ምናሌ ማሳጠሪያ" : "Minimize Menu"}
              </span>
            )}
            <div className={isCollapsed ? "mx-auto" : ""}>
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </div>
          </div>
        </button>

        {/* VERTICAL NAVIGATION LINKS LOOP */}
        <div className="flex flex-col gap-1.5 w-full">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = pathname === tab.path || (tab.path !== `/${locale}/dashboard` && pathname.startsWith(tab.path))

            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`
                  flex flex-row items-center justify-start w-full px-4 py-3.5 h-12 rounded-xl
                  transition-all duration-150 active:scale-[0.97] gap-3
                  ${active 
                    ? "bg-berbere-50 text-berbere-600 font-black" 
                    : "text-coffee-500 hover:bg-cream-50/80 hover:text-coffee-800 font-bold"
                  }
                `}
              >
                <div className="flex items-center justify-center shrink-0">
                  <Icon size={20} strokeWidth={active ? 3 : 2} />
                </div>

                <span className={`text-xs font-black truncate ${isCollapsed ? "hidden" : "block"}`}>
                  {tab.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface BottomNavProps {
  locale: string
  role: string
}

export default function BottomNav({
  locale,
  role
}: BottomNavProps) {
  const pathname = usePathname()
  const isAm = locale === "am"

  // Professional local toggle state tracking for desk layout width control
  const [isCollapsed, setIsCollapsed] = useState(false)

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

  const visibleTabs = tabs
    .filter(tab => tab.roles.includes(role || "waiter"))
    .slice(0, 5)

  return (
    <nav
      className={`
        /* MOBILE VIEWPORT BASE CONFIGURATION */
        fixed
        bottom-0
        left-0
        right-0
        h-16
        z-40
        bg-white
        border-t
        border-cream-200
        shadow-[0_-10px_30px_rgba(43,30,26,0.08)]

        /* DESKTOP SIDEBAR CONVERSION FRAMEWORK */
        lg:fixed
        lg:top-14
        lg:bottom-0
        lg:left-0
        lg:right-auto
        lg:h-auto
        lg:border-t-0
        lg:border-r
        lg:shadow-none
        
        /* Smooth operational expansion physics animation */
        transition-all
        duration-300
        ease-in-out
        
        ${isCollapsed ? "lg:w-20" : "lg:w-64"}
      `}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div
        className="
          h-full
          w-full
          grid
          grid-cols-5
          
          /* DESKTOP MECHANICAL LAYER RESETS */
          lg:flex
          lg:flex-col
          lg:grid-cols-none
          lg:pt-4
          lg:px-3
          lg:gap-1.5
        "
      >
        {/* INTERACTIVE SIDEBAR COLLAPSE TOGGLE TRIGGER BAR (Hidden on Small Phones) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="
            hidden
            lg:flex
            items-center
            justify-center
            h-10
            w-full
            mb-2
            px-3
            rounded-xl
            text-coffee-400
            hover:text-coffee-800
            hover:bg-cream-50/80
            transition-all
            duration-200
            active:scale-95
          "
        >
          <div className="flex items-center justify-between w-full">
            {!isCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
                {isAm ? "ምናሌ ማሳጠሪያ" : "Minimize Menu"}
              </span>
            )}
            <div className={isCollapsed ? "mx-auto" : ""}>
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </div>
          </div>
        </button>

        {visibleTabs.map(tab => {
          const Icon = tab.icon

          const active =
            pathname === tab.path ||
            (tab.path !== `/${locale}/dashboard` && pathname.startsWith(tab.path))

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`
                relative
                flex
                flex-col
                items-center
                justify-center
                gap-1
                transition-all
                duration-150
                active:scale-[0.97]
                select-none

                /* DESKTOP ROW TRANSFORMS */
                lg:flex-row
                lg:justify-start
                lg:gap-3
                lg:w-full
                lg:px-4
                lg:py-3
                lg:h-11
                lg:rounded-xl
                
                ${active 
                  ? "lg:bg-berbere-50 text-berbere-600" 
                  : "text-coffee-500 hover:bg-cream-50/80 hover:text-coffee-800"
                }
              `}
            >
              {/* ACTIVE TRACK BOX LAYER */}
              <div
                className={`
                  w-12
                  h-7
                  rounded-full
                  flex
                  items-center
                  justify-center
                  transition-all
                  ${active ? "bg-berbere-50 text-berbere-600" : "bg-transparent text-coffee-400"}
                  
                  /* DESKTOP TRACK RECOVERY */
                  lg:w-auto
                  lg:h-auto
                  lg:rounded-none
                  lg:bg-transparent
                  lg:text-inherit
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 3 : 2}
                  className="transition-colors text-inherit"
                />
              </div>

              {/* NON-TECHNICAL TEXT LABELS */}
              <span
                className={`
                  text-[10px]
                  font-black
                  tracking-tight
                  truncate
                  max-w-[68px]
                  leading-none

                  /* DESKTOP TYPE OPTIMIZATIONS */
                  lg:text-xs
                  lg:font-black
                  lg:max-w-none
                  lg:leading-normal
                  text-inherit

                  /* Visibility rule hooked directly into the sidebar minimize tracking toggle logic */
                  ${isCollapsed ? "lg:hidden" : "lg:block"}
                `}
              >
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

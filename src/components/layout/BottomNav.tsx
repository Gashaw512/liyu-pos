
// src/components/layout/BottomNav.tsx

'use client'

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Route } from 'next'
import {
  BarChart3,
  ChevronLeft,
  ChevronUp,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Clock3,
} from 'lucide-react'

import { useErp } from './AppShell'

interface BottomNavProps {
  locale: string
  role: string
}

interface NavItem {
  key: string
  name: string
  path: string
  icon: React.ElementType
  roles: string[]
}

export default function BottomNav({
  locale,
  role,
}: BottomNavProps) {
  const pathname = usePathname()
  const isAm = locale === 'am'

  const {
    roles,
    isCollapsed,
    setIsCollapsed,
  } = useErp()

  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const moreRef = useRef<HTMLDivElement>(null)

  /*
   * ============================================================
   * RESPONSIVE STATE
   * ============================================================
   */

  useEffect(() => {
    setMounted(true)

    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkWidth()

    window.addEventListener('resize', checkWidth)

    return () => {
      window.removeEventListener('resize', checkWidth)
    }
  }, [])

  /*
   * ============================================================
   * NAVIGATION DEFINITION
   * ============================================================
   *
   * These are the actual application destinations.
   *
   * Actions such as:
   * - New Sale
   * - Receive Stock
   * - Stock Count
   * - Add Expense
   *
   * belong inside their respective pages.
   *
   * Navigation only takes the user to those areas.
   */

  const tabs = useMemo<NavItem[]>(
    () => [
      {
        key: 'dashboard',
        name: isAm ? 'መነሻ' : 'Home',
        path: `/${locale}/dashboard`,
        icon: Home,
        roles: [
          'owner',
          'manager',
          'cashier',
          'inventory_clerk',
          'waiter',
          'kitchen',
        ],
      },

      {
        key: 'sales',
        name: isAm ? 'ሽያጭ' : 'Sales',
        path: `/${locale}/sales`,
        icon: ShoppingCart,
        roles: [
          'owner',
          'manager',
          'cashier',
          'waiter',
        ],
      },

      {
        key: 'inventory',
        name: isAm ? 'ዕቃ' : 'Inventory',
        path: `/${locale}/inventory`,
        icon: Package,
        roles: [
          'owner',
          'manager',
          'inventory_clerk',
        ],
      },

      {
        key: 'expenses',
        name: isAm ? 'ወጪ' : 'Expenses',
        path: `/${locale}/dashboard/expenses`,
        icon: ReceiptText,
        roles: [
          'owner',
          'manager',
        ],
      },

      {
        key: 'reports',
        name: isAm ? 'ሪፖርት' : 'Reports',
        path: `/${locale}/reports`,
        icon: BarChart3,
        roles: [
          'owner',
          'manager',
        ],
      },

      {
        key: 'management',
        name: isAm ? 'አስተዳደር' : 'Manage',
        path: `/${locale}/management`,
        icon: Settings,
        roles: [
          'owner',
          'manager',
        ],
      },
      {
        key: 'shifts',
        name: isAm ? 'ፈረቃ' : 'Shifts',
        path: `/${locale}/shifts`,
        icon: Clock3,
        roles: ['owner', 'manager', 'cashier'],
      },
    ],
    [isAm, locale, role],
  )

  /*
   * ============================================================
   * ROLE FILTERING
   * ============================================================
   *
   * Only pages explicitly allowed for the current role appear.
   */

  const visibleTabs = useMemo(() => {
    const currentRoles = roles.length ? roles : [role || 'waiter']

    return tabs
      .filter((tab) => tab.roles.some((allowedRole) => currentRoles.includes(allowedRole)))
      .map((tab) => tab.key === 'sales' && !isAm
        ? {
            ...tab,
            name: role === 'waiter'
              ? 'Tables & Orders'
              : role === 'cashier'
                ? 'Bills & Sales'
                : 'Sales',
          }
        : tab)
  }, [tabs, role, roles])

  /*
   * ============================================================
   * MOBILE NAVIGATION
   * ============================================================
   *
   * We reserve four slots for primary navigation.
   *
   * Anything else goes into More.
   *
   * Example owner/manager:
   *
   * Home | Sales | Inventory | Expenses | More
   *
   * More:
   * Reports
   * Manage
   */

  const assignedRoles = roles.length ? roles : [role || 'waiter']
  const cashierFocused =
    assignedRoles.includes('cashier') &&
    !assignedRoles.some((assignedRole) => ['owner', 'manager'].includes(assignedRole))
  const primaryKeys = cashierFocused
    ? ['sales', 'shifts', 'dashboard']
    : ['dashboard', 'sales', 'inventory', 'expenses']

  const mobilePrimaryTabs = useMemo(() => {
    return primaryKeys
      .map((key) =>
        visibleTabs.find(
          (tab) => tab.key === key,
        ),
      )
      .filter(
        (tab): tab is NavItem => Boolean(tab),
      )
  }, [visibleTabs, primaryKeys])

  const mobileMoreTabs = useMemo(() => {
    return visibleTabs.filter(
      (tab) =>
        !primaryKeys.includes(tab.key),
    )
  }, [visibleTabs, primaryKeys])

  const hasMoreItems =
    mobileMoreTabs.length > 0

  /*
   * ============================================================
   * MORE MENU STATE
   * ============================================================
   */

  useEffect(() => {
    if (!moreOpen) {
      return
    }

    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        moreRef.current &&
        !moreRef.current.contains(
          event.target as Node,
        )
      ) {
        setMoreOpen(false)
      }
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setMoreOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    )

    document.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      )

      document.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [moreOpen])

  /*
   * Close More when switching to desktop.
   */

  useEffect(() => {
    if (isDesktop) {
      setMoreOpen(false)
    }
  }, [isDesktop])

  /*
   * ============================================================
   * ACTIVE STATE
   * ============================================================
   */

  const isActive = (tab: NavItem) => {
    if (tab.key === 'dashboard') {
      return pathname === tab.path
    }

    return (
      pathname === tab.path ||
      pathname.startsWith(
        `${tab.path}/`,
      )
    )
  }

  const moreIsActive = mobileMoreTabs.some(
    (tab) => isActive(tab),
  )

  /*
   * ============================================================
   * MOUNT GUARD
   * ============================================================
   */

  if (!mounted) {
    return null
  }

  /*
   * ============================================================
   * MOBILE NAVIGATION
   * ============================================================
   */

  if (!isDesktop) {
    const mobileItemCount =
      mobilePrimaryTabs.length +
      (hasMoreItems ? 1 : 0)

    const gridColsMap: Record<
      number,
      string
    > = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
    }

    const mobileGridClass =
      gridColsMap[mobileItemCount] ||
      'grid-cols-5'

    return (
      <nav
        aria-label="Primary navigation"
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-40
          h-16
          bg-white
          border-t
          border-cream-200
          shadow-[0_-8px_24px_rgba(43,30,26,0.07)]
        "
        style={{
          paddingBottom:
            'env(safe-area-inset-bottom)',
        }}
      >
        <div
          className={`
            relative
            grid
            ${mobileGridClass}
            h-full
            w-full
          `}
        >
          {/* --------------------------------------------------
              PRIMARY MOBILE LINKS
          -------------------------------------------------- */}

          {mobilePrimaryTabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab)

            return (
              <Link
                key={tab.key}
                href={tab.path as Route}
                aria-current={
                  active
                    ? 'page'
                    : undefined
                }
                className={`
                  relative
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  select-none
                  transition-colors
                  duration-150
                  active:scale-95
                  ${
                    active
                      ? 'text-berbere-600'
                      : 'text-coffee-400 hover:text-coffee-600'
                  }
                `}
              >
                {/* Active top indicator */}

                {active && (
                  <span
                    className="
                      absolute
                      top-0
                      left-1/2
                      -translate-x-1/2
                      h-0.5
                      w-8
                      rounded-full
                      bg-berbere-500
                    "
                  />
                )}

                <div
                  className={`
                    flex
                    items-center
                    justify-center
                    w-10
                    h-7
                    rounded-full
                    transition-all
                    duration-150
                    ${
                      active
                        ? 'bg-berbere-50'
                        : 'bg-transparent'
                    }
                  `}
                >
                  <Icon
                    size={19}
                    strokeWidth={
                      active ? 2.5 : 2
                    }
                  />
                </div>

                <span
                  className={`
                    max-w-[76px]
                    truncate
                    text-[10px]
                    leading-none
                    tracking-tight
                    ${
                      active
                        ? 'font-black'
                        : 'font-semibold'
                    }
                  `}
                >
                  {tab.name}
                </span>
              </Link>
            )
          })}

          {/* --------------------------------------------------
              MORE
          -------------------------------------------------- */}

          {hasMoreItems && (
            <div
              ref={moreRef}
              className="relative h-full"
            >
              <button
                type="button"
                onClick={() =>
                  setMoreOpen(
                    (current) => !current,
                  )
                }
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`
                  relative
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  w-full
                  h-full
                  select-none
                  transition-colors
                  duration-150
                  active:scale-95
                  ${
                    moreIsActive || moreOpen
                      ? 'text-berbere-600'
                      : 'text-coffee-400 hover:text-coffee-600'
                  }
                `}
              >
                {(moreIsActive ||
                  moreOpen) && (
                  <span
                    className="
                      absolute
                      top-0
                      left-1/2
                      -translate-x-1/2
                      h-0.5
                      w-8
                      rounded-full
                      bg-berbere-500
                    "
                  />
                )}

                <div
                  className={`
                    flex
                    items-center
                    justify-center
                    w-10
                    h-7
                    rounded-full
                    transition-all
                    duration-150
                    ${
                      moreIsActive ||
                      moreOpen
                        ? 'bg-berbere-50'
                        : 'bg-transparent'
                    }
                  `}
                >
                  <ChevronUp
                    size={19}
                    strokeWidth={
                      moreIsActive ||
                      moreOpen
                        ? 2.5
                        : 2
                    }
                    className={`
                      transition-transform
                      duration-200
                      ${
                        moreOpen
                          ? 'rotate-180'
                          : ''
                      }
                    `}
                  />
                </div>

                <span
                  className={`
                    text-[10px]
                    leading-none
                    tracking-tight
                    ${
                      moreIsActive ||
                      moreOpen
                        ? 'font-black'
                        : 'font-semibold'
                    }
                  `}
                >
                  {isAm ? 'ተጨማሪ' : 'More'}
                </span>
              </button>

              {/* ------------------------------------------------
                  MORE POPOVER
              ------------------------------------------------ */}

              {moreOpen && (
                <div
                  role="menu"
                  className="
                    absolute
                    right-2
                    bottom-[calc(100%+10px)]
                    min-w-[190px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-cream-200
                    bg-white
                    p-2
                    shadow-[0_16px_40px_rgba(43,30,26,0.16)]
                  "
                >
                  <div
                    className="
                      px-3
                      py-2
                      mb-1
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.14em]
                        text-coffee-300
                      "
                    >
                      {isAm
                        ? 'ተጨማሪ'
                        : 'More'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {mobileMoreTabs.map(
                      (tab) => {
                        const Icon = tab.icon
                        const active =
                          isActive(tab)

                        return (
                          <Link
                            key={tab.key}
                            href={
                              tab.path as Route
                            }
                            role="menuitem"
                            onClick={() =>
                              setMoreOpen(
                                false,
                              )
                            }
                            className={`
                              flex
                              items-center
                              gap-3
                              w-full
                              rounded-xl
                              px-3
                              py-3
                              transition-colors
                              duration-150
                              ${
                                active
                                  ? 'bg-berbere-50 text-berbere-600'
                                  : 'text-coffee-600 hover:bg-cream-50 hover:text-coffee-900'
                              }
                            `}
                          >
                            <Icon
                              size={18}
                              strokeWidth={
                                active
                                  ? 2.5
                                  : 2
                              }
                            />

                            <span
                              className={`
                                text-sm
                                ${
                                  active
                                    ? 'font-black'
                                    : 'font-semibold'
                                }
                              `}
                            >
                              {tab.name}
                            </span>
                          </Link>
                        )
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    )
  }

  /*
   * ============================================================
   * DESKTOP SIDEBAR
   * ============================================================
   *
   * Desktop has enough space, so every authorized destination
   * remains directly visible.
   */

  return (
    <aside
      aria-label="Primary navigation"
      className={`
        fixed
        top-14
        bottom-0
        left-0
        z-40
        flex
        flex-col
        bg-white
        border-r
        border-cream-200
        pt-4
        px-3
        transition-[width]
        duration-300
        ease-in-out
        ${
          isCollapsed
            ? 'w-20'
            : 'w-64'
        }
      `}
    >
      {/* -------------------------------------------------------
          SIDEBAR HEADER
      ------------------------------------------------------- */}

      <button
        type="button"
        onClick={() =>
          setIsCollapsed(
            !isCollapsed,
          )
        }
        aria-label={
          isCollapsed
            ? 'Expand navigation'
            : 'Collapse navigation'
        }
        className="
          group
          flex
          items-center
          justify-center
          w-full
          h-10
          mb-4
          rounded-xl
          text-coffee-400
          hover:text-berbere-600
          hover:bg-cream-50
          transition-colors
          duration-200
          active:scale-[0.98]
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            w-full
            px-3
          "
        >
          {!isCollapsed && (
            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-coffee-400
                group-hover:text-berbere-600
                transition-colors
              "
            >
              {isAm
                ? 'ምናሌ'
                : 'Navigation'}
            </span>
          )}

          <ChevronLeft
            size={18}
            strokeWidth={2.5}
            className={`
              transition-transform
              duration-300
              ${
                isCollapsed
                  ? 'mx-auto rotate-180'
                  : ''
              }
            `}
          />
        </div>
      </button>

      {/* -------------------------------------------------------
          DESKTOP NAVIGATION
      ------------------------------------------------------- */}

      <nav
        aria-label="Primary navigation"
        className="
          flex
          flex-col
          gap-1.5
          w-full
          flex-1
        "
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab)

          return (
            <Link
              key={tab.key}
              href={tab.path as Route}
              aria-current={
                active
                  ? 'page'
                  : undefined
              }
              className={`
                group
                relative
                flex
                items-center
                h-12
                w-full
                rounded-xl
                border
                px-4
                gap-3
                select-none
                overflow-visible
                transition-all
                duration-200
                active:scale-[0.98]
                ${
                  active
                    ? `
                      bg-berbere-50
                      border-berbere-100
                      text-berbere-600
                      shadow-sm
                    `
                    : `
                      bg-transparent
                      border-transparent
                      text-coffee-500
                      hover:bg-cream-50
                      hover:text-coffee-800
                    `
                }
              `}
            >
              {/* Active rail */}

              {active && (
                <span
                  className="
                    absolute
                    left-0
                    top-3
                    bottom-3
                    w-1
                    rounded-r-full
                    bg-berbere-500
                  "
                />
              )}

              {/* Icon */}

              <Icon
                size={20}
                strokeWidth={
                  active ? 2.5 : 2
                }
                className={`
                  shrink-0
                  transition-transform
                  duration-200
                  group-hover:scale-105
                  ${
                    active
                      ? 'text-berbere-600'
                      : 'text-coffee-400 group-hover:text-coffee-700'
                  }
                `}
              />

              {/* Label */}

              {!isCollapsed && (
                <span
                  className="
                    text-sm
                    font-semibold
                    tracking-normal
                    truncate
                  "
                >
                  {tab.name}
                </span>
              )}

              {/* Collapsed tooltip */}

              {isCollapsed && (
                <span
                  className="
                    pointer-events-none
                    absolute
                    left-[calc(100%+10px)]
                    top-1/2
                    -translate-y-1/2
                    whitespace-nowrap
                    rounded-lg
                    bg-coffee-800
                    px-3
                    py-2
                    text-[11px]
                    font-bold
                    text-white
                    shadow-xl
                    opacity-0
                    invisible
                    translate-x-1
                    group-hover:opacity-100
                    group-hover:visible
                    group-hover:translate-x-0
                    transition-all
                    duration-150
                    z-50
                  "
                >
                  {tab.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* -------------------------------------------------------
          SIDEBAR FOOTER
      ------------------------------------------------------- */}

      {!isCollapsed && (
        <div
          className="
            px-3
            pb-4
            pt-3
            border-t
            border-cream-100
          "
        >
          <p
            className="
              text-[10px]
              font-medium
              leading-relaxed
              text-coffee-300
            "
          >
            {isAm
              ? 'የንግድ አስተዳደር'
              : 'Business management'}
          </p>
        </div>
      )}
    </aside>
  )
}

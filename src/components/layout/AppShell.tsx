// src/components/layout/AppShell.tsx
'use client'

import React, {
  ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react'
import { usePathname } from 'next/navigation'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import SafeAreaWrapper from './SafeAreaWrapper'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  locale: string
  role: string
  fullName: string
  businessName: string
  noScroll?: boolean
}

interface ErpStateContextType {
  locale: string
  role: string
  fullName: string
  businessName: string
  isSystemLocked: boolean
  setSystemLocked: (locked: boolean) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const ErpContext = createContext<ErpStateContextType | undefined>(
  undefined,
)

export function useErp() {
  const context = useContext(ErpContext)

  if (!context) {
    throw new Error(
      'useErp must be wrapped within an ERP Context Provider Container',
    )
  }

  return context
}

class ErpErrorBoundary extends React.Component<
  { children: ReactNode; isAm: boolean },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; isAm: boolean }) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(
    error: Error,
    errorInfo: React.ErrorInfo,
  ) {
    console.error(
      'ERP Critical Component Crash Trace:',
      error,
      errorInfo,
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 flex min-h-[50vh] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-berbere-200 bg-cream-50 p-6 text-center">
          <AlertCircle className="mb-3 h-12 w-12 animate-pulse text-berbere-600" />

          <h2 className="mb-1 text-lg font-black text-coffee-900">
            {this.props.isAm
              ? 'ስህተት ተከስቷል'
              : 'Application Error Detected'}
          </h2>

          <p className="mb-4 max-w-md text-xs leading-normal text-coffee-500">
            {this.state.error?.message ||
              'An isolated UI failure crashed this module workspace dashboard panel view wrapper layer safely.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-9 items-center gap-2 rounded-xl bg-coffee-900 px-4 text-xs font-black text-white transition active:scale-95"
          >
            <RotateCcw size={14} />

            <span>
              {this.props.isAm
                ? 'እንደገና ይጫኑ'
                : 'Reload Core Workspace'}
            </span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function AppShell({
  children,
  locale,
  role,
  fullName,
  businessName,
  noScroll = false,
}: AppShellProps) {
  const pathname = usePathname()

  const isAm = locale === 'am'
  const { isOnline } = useOnlineStatus()

  const [isSystemLocked, setSystemLocked] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  /*
   * Sales manages its own scrolling.
   *
   * Other pages continue using the AppShell
   * workspace as their scroll container.
   */
  const isPOSPage =
    pathname === `/${locale}/sales` ||
    pathname.startsWith(`/${locale}/sales/`)

  const useInternalScroll = noScroll || isPOSPage

  useEffect(() => {
    setMounted(true)

    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkViewport()

    window.addEventListener('resize', checkViewport)

    return () => {
      window.removeEventListener('resize', checkViewport)
    }
  }, [])

  return (
    <ErpContext.Provider
      value={{
        locale,
        role,
        fullName,
        businessName,
        isSystemLocked,
        setSystemLocked,
        isCollapsed,
        setIsCollapsed,
      }}
    >
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-cream-100 font-sans text-coffee-700 antialiased select-none">
        {/* =====================================================
            NETWORK STATUS
        ====================================================== */}

        {mounted && !isOnline && (
          <div
            role="alert"
            className="
              flex
              w-full
              shrink-0
              items-center
              justify-center
              gap-2
              bg-berbere-600
              px-3
              py-1.5
              text-center
              text-[11px]
              font-black
              tracking-wide
              text-white
              shadow-inner
              animate-slide-down
            "
          >
            <span className="h-2 w-2 animate-ping rounded-full bg-white" />

            <span>
              {isAm
                ? 'ግንኙነት ተቋርጧል! የሽያጭ መረጃዎች በአገር ውስጥ (Offline) እየተቀመጡ ነው።'
                : 'Offline Mode Active! Transactions are currently caching safely inside local atomic browser state.'}
            </span>
          </div>
        )}

        {/* =====================================================
            GLOBAL TOP BAR
        ====================================================== */}

        <div className="relative z-50 h-14 w-full shrink-0 shadow-sm">
          <TopBar
            businessName={businessName}
            fullName={fullName}
            role={role}
            locale={locale}
          />
        </div>

        {/* =====================================================
            BODY
        ====================================================== */}

        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row">
          <BottomNav
            locale={locale}
            role={role}
          />

          {/* ===================================================
              MAIN WORKSPACE
          ==================================================== */}

          <div
            className={[
              'relative min-h-0 min-w-0 flex-1 bg-cream-50/40',
              useInternalScroll
                ? 'overflow-hidden'
                : 'overflow-x-hidden overflow-y-auto scrolling-touch',
              'transition-all duration-300 ease-in-out',
            ].join(' ')}
            style={{
              marginLeft:
                mounted && isDesktop
                  ? isCollapsed
                    ? '4rem'
                    : '14rem'
                  : '0rem',

              paddingBottom:
                mounted && !isDesktop && !useInternalScroll
                  ? 'calc(4rem + env(safe-area-inset-bottom))'
                  : '0rem',
            }}
          >
            <SafeAreaWrapper>
              <main
                className={[
                  'mx-auto w-full max-w-7xl min-w-0',
                  useInternalScroll
                    ? 'h-full min-h-0'
                    : 'transition-opacity duration-200 px-3 py-4 sm:px-4 lg:pb-8',
                ].join(' ')}
              >
                <ErpErrorBoundary isAm={isAm}>
                  {children}
                </ErpErrorBoundary>
              </main>
            </SafeAreaWrapper>
          </div>
        </div>
      </div>
    </ErpContext.Provider>
  )
}
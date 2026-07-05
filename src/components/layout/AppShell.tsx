// src/components/layout/AppShell.tsx
'use client'

import React, { ReactNode, createContext, useContext, useState, useEffect } from "react"
import TopBar from "./TopBar"
import BottomNav from "./BottomNav"
import SafeAreaWrapper from "./SafeAreaWrapper"
import { useOnlineStatus } from "../../hooks/useOnlineStatus"
import { AlertCircle, RotateCcw } from "lucide-react"

interface AppShellProps {
  children: ReactNode
  locale: string
  role: string
  fullName: string
  businessName: string
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

const ErpContext = createContext<ErpStateContextType | undefined>(undefined)

export function useErp() {
  const context = useContext(ErpContext)
  if (!context) throw new Error("useErp must be wrapped within an ERP Context Provider Container")
  return context
}

class ErpErrorBoundary extends React.Component<
  { children: ReactNode; isAm: boolean },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; isAm: boolean }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ERP Critical Component Crash Trace:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 text-center bg-cream-50 border-2 border-dashed border-berbere-200 rounded-2xl my-4">
          <AlertCircle className="w-12 h-12 text-berbere-600 mb-3 animate-pulse" />
          <h2 className="text-lg font-black text-coffee-900 mb-1">
            {this.props.isAm ? "ስህተት ተከስቷል" : "Application Error Detected"}
          </h2>
          <p className="text-xs text-coffee-500 max-w-md mb-4 leading-normal">
            {this.state.error?.message || "An isolated UI failure crashed this module workspace dashboard panel view wrapper layer safely."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-9 px-4 rounded-xl bg-coffee-900 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition"
          >
            <RotateCcw size={14} />
            <span>{this.props.isAm ? "እንደገና ይጫኑ" : "Reload Core Workspace"}</span>
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
}: AppShellProps) {
  const isAm = locale === "am"
  const { isOnline } = useOnlineStatus()
  const [isSystemLocked, setSystemLocked] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Natively monitor exact breakpoint changes matching the theme layout context
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkViewport()
    window.addEventListener("resize", checkViewport)
    return () => window.removeEventListener("resize", checkViewport)
  }, [])

  return (
    <ErpContext.Provider value={{ locale, role, fullName, businessName, isSystemLocked, setSystemLocked, isCollapsed, setIsCollapsed }}>
      <div className="h-[100dvh] w-full bg-cream-100 text-coffee-700 font-sans antialiased flex flex-col overflow-hidden select-none">
        
        {/* NETWORK STATUS ALERTS */}
        {mounted && !isOnline && (
          <div role="alert" className="w-full bg-berbere-600 text-white text-[11px] font-black text-center py-1.5 px-3 tracking-wide animate-slide-down shrink-0 flex items-center justify-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>
              {isAm 
                ? "ግንኙነት ተቋርጧል! የሽያጭ መረጃዎች በአገር ውስጥ (Offline) እየተቀመጡ ነው።" 
                : "Offline Mode Active! Transactions are currently caching safely inside local atomic browser state."
              }
            </span>
          </div>
        )}

        {/* 1. FULL WIDTH GLOBAL TOP BAR */}
        <div className="w-full h-14 shrink-0 relative z-50 shadow-sm">
          <TopBar
            businessName={businessName}
            fullName={fullName}
            role={role}
            locale={locale}
          />
        </div>

        {/* 2. BODY SPLIT LAYER */}
        <div className="flex-1 w-full flex flex-col lg:flex-row relative overflow-hidden">
          
          {/* BOTTOM / SIDE RESPONSIVE NAV */}
          <BottomNav
            locale={locale}
            role={role}
          />

          {/* MAIN WORKSPACE CONTENT CONTAINER */}
          <div
            className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden scrolling-touch bg-cream-50/40 transition-all duration-300 ease-in-out"
            style={{
              // Only inject layout push-margins if layout state registers as a desktop client context
              marginLeft: mounted && isDesktop ? (isCollapsed ? "4rem" : "14rem") : "0rem",
              // Safe padding space dynamic adjustment for bottom mobile action bars
              paddingBottom: mounted && !isDesktop ? "calc(4rem + env(safe-area-inset-bottom))" : "2rem"
            }}
          >
            <SafeAreaWrapper>
              <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 lg:pb-8 transition-opacity duration-200">
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
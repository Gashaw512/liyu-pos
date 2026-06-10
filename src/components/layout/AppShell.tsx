// src/components/layout/AppShell.tsx
'use client'

import { ReactNode } from "react";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import SafeAreaWrapper from "./SafeAreaWrapper";

interface AppShellProps {
  children: ReactNode;
  locale: string;
  role: string;
  fullName: string;
  businessName: string;
}

export default function AppShell({ 
  children, 
  locale, 
  role, 
  fullName, 
  businessName 
}: AppShellProps) {
  return (
    /* 
      🔒 FIXED VIEWPORT FRAME ROOT:
      Forces the application container to exactly match the screen space.
      Using h-[100dvh] (Dynamic Viewport Height) prevents mobile browser search bars 
      from breaking the bottom navigation layout tracking.
    */
    <div className="h-screen h-[100dvh] w-full bg-cream-100 font-sans text-coffee-700 antialiased flex overflow-hidden select-none">
      
      {/* 🖥️ LEFT SIDEBAR NAVIGATION VIEWPORT
          - hidden strictly on narrow phone dimensions
          - lg:flex -> Displays instantly on all tablets (768px+) matching your design token threshold
          - xl:w-64 -> Fully expands structural options on standard desktop screens (1024px+)
      */}
      <aside className="hidden lg:flex w-20 xl:w-64 shrink-0 bg-coffee-900 border-r border-coffee-800 text-white h-full transition-all duration-300 flex-col">
        <Sidebar 
          businessName={businessName} 
          fullName={fullName} 
          role={role} 
          locale={locale} 
        />
      </aside>

      {/* 📱💻 MAIN INNER APP CONTAINER FRAME */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-cream-100">
        
        {/* 📱 STATIC TOP BAR BRANDING HEADER */}
        <div className="w-full shrink-0 z-40">
          <TopBar 
            businessName={businessName} 
            fullName={fullName} 
            role={role} 
            locale={locale} 
          />
        </div>

        {/* 🚀 ISOLATED SCROLLABLE CONTENT VIEWPORT
            Instead of scrolling the whole screen, only this midsection scrolls vertically.
            The TopBar and BottomNav stay pinned perfectly in place forever!
        */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scrolling-touch">
          <SafeAreaWrapper>
            <main className="w-full px-4 pt-4 pb-24 lg:pb-6 max-w-7xl mx-auto transition-all duration-300">
              {children}
            </main>
          </SafeAreaWrapper>
        </div>

        {/* 🎯 STATIC BOTTOM NAVIGATION BAR
            - block -> Anchored tightly to the device bottom for small phone frames
            - lg:hidden -> Gracefully drops away from view parameters the millisecond the Left Sidebar mounts
        */}
        <div className="block lg:hidden shrink-0 z-40">
          <BottomNav locale={locale} role={role} />
        </div>

      </div>
    </div>
  );
}
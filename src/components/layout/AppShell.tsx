// AppShell.tsx
'use client'

import { ReactNode } from "react";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
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
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col shadow-2xl relative border-x border-slate-200/60 text-slate-800 antialiased font-sans">
      
      {/* 📱 Mobile Top Branding Bar with System Statuses */}
      <TopBar 
        businessName={businessName} 
        fullName={fullName} 
        role={role} 
        locale={locale} 
      />

      {/* 🚀 Dynamic UI Workspace Viewport */}
      <SafeAreaWrapper>
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-24">
          {children}
        </main>
      </SafeAreaWrapper>

      {/* 🎯 Sticky Tactile Bottom Tab Mobile Bar */}
      <BottomNav locale={locale} role={role} />

    </div>
  );
}
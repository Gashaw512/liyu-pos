// src/components/layout/SafeAreaWrapper.tsx
'use client'

import { ReactNode } from "react";

export default function SafeAreaWrapper({ children }: { children: ReactNode }) {
  return (
    <div 
      className="
        w-full 
        min-h-full
        flex 
        flex-col
        isolate
      "
      style={{
        // Native safe area support without limiting screen layout heights
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {children}
    </div>
  );
}
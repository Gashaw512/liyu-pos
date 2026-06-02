'use client'

import { ReactNode } from "react";

export default function SafeAreaWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pt-safe pb-safe-bottom overflow-hidden">
      {children}
    </div>
  );
}
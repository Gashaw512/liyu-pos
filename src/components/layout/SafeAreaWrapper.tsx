// src/components/layout/SafeAreaWrapper.tsx
'use client'

import { ReactNode } from 'react'

interface SafeAreaWrapperProps {
  children: ReactNode
}

export default function SafeAreaWrapper({
  children,
}: SafeAreaWrapperProps) {
  return (
    <div
      className="
        flex
        h-full
        min-h-0
        w-full
        flex-col
        isolate
      "
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  )
}
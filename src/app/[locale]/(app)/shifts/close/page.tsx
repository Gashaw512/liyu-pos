// src/app/[locale]/(app)/shifts/close/page.tsx
'use client'

import React from "react"
import { useParams } from "next/navigation"

export default function CloseShiftPage() {
  const params = useParams()
  const isAm = params?.locale === "am"

  return (
    <div className="p-6 max-w-md mx-auto text-center space-y-4 font-['DM_Sans',sans-serif]">
      <div className="text-4xl">🕒</div>
      <h1 className="font-black text-lg text-coffee-950">
        {isAm ? "ፈጣን የፈረቃ መዝጊያ" : "Close Shift Management"}
      </h1>
      <p className="text-xs text-coffee-500">
        {isAm ? "የፈረቃ መዝጊያ ሞጁል በቅርቡ ዝግጁ ይሆናል።" : "The shift settlement and cash drawer reconciliation wizard is being optimized."}
      </p>
    </div>
  )
}

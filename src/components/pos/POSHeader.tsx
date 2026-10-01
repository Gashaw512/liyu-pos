'use client'

import { useState, type ReactNode } from 'react'
import {
  BarChart3,
  Coins,
  Loader2,
  LogOut,
  X,
  Save,
  ShoppingBag,
  Utensils,
} from 'lucide-react'

import type { POSTable } from './types'

interface POSHeaderProps {
  isAm: boolean
  selectedTable: POSTable | null
  totalItems: number
  totalBill: number
  cartSummary: string
  onCloseShift: () => Promise<void>
  closingShift: boolean
  cartHasItems: boolean
  billOpen: boolean
  onToggleBill: () => void
  onCheckout: () => void
  hasUnsavedTableOrder: boolean
  savingTab: boolean
  onSaveOrder: () => Promise<void>
  todayReport: ReactNode
}

const controlClass =
  'inline-flex h-10 shrink-0 items-center justify-center rounded-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

export default function POSHeader({
  isAm,
  selectedTable,
  totalItems,
  totalBill,
  cartSummary,
  onCloseShift,
  closingShift,
  cartHasItems,
  billOpen,
  onToggleBill,
  onCheckout,
  hasUnsavedTableOrder,
  savingTab,
  onSaveOrder,
  todayReport,
}: POSHeaderProps) {
  const [showTodayReport, setShowTodayReport] = useState(false)
  const orderPlace = selectedTable?.name ?? (isAm ? 'ቀጥታ ሽያጭ' : 'Walk-in')

  return (
    <div className="relative">
    <header className="sticky top-0 z-40 w-full shrink-0 border-b border-cream-300 bg-cream-50/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-1.5 px-2 sm:gap-2 sm:px-3 lg:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-coffee-500" aria-hidden="true">
            <Utensils className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-xs font-black text-coffee-900 sm:text-sm" title={orderPlace}>
            {orderPlace}
          </span>
        </div>

        {hasUnsavedTableOrder && (
          <button
            type="button"
            onClick={() => void onSaveOrder()}
            disabled={savingTab}
            className={`${controlClass} w-10 border border-cream-300 bg-white text-coffee-700 hover:bg-cream-100`}
            aria-label={isAm ? 'ትዕዛዙን አስቀምጥ' : 'Save table order'}
            title={isAm ? 'ትዕዛዙን አስቀምጥ' : 'Save table order'}
          >
            {savingTab
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (billOpen) onToggleBill()
            setShowTodayReport((open) => !open)
          }}
          aria-expanded={showTodayReport}
          aria-label={isAm ? 'የዛሬ ሽያጭ ሪፖርት' : "Today's sales report"}
          title={isAm ? 'የዛሬ ሽያጭ ሪፖርት' : "Today's sales report"}
          className={`${controlClass} gap-1 border border-cream-300 bg-white px-2 text-xs font-black text-coffee-700 hover:bg-cream-100`}
        >
          <BarChart3 className="h-3.5 w-3.5 text-berbere-500" aria-hidden="true" />
          <span>{isAm ? 'ዛሬ' : 'Today'}</span>
        </button>

        {cartHasItems && (
          <button
            type="button"
            onClick={() => {
              setShowTodayReport(false)
              onCheckout()
            }}
            className={`${controlClass} gap-1.5 bg-berbere-500 px-2.5 text-[11px] font-black text-white shadow-sm hover:bg-berbere-600 sm:px-3`}
            aria-label={`${isAm ? 'ክፍያ' : 'Pay'} ${totalBill.toLocaleString()} ETB`}
            title={`${isAm ? 'ክፍያ' : 'Pay'} ${totalBill.toLocaleString()} ETB`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{isAm ? 'ክፍያ' : 'Pay'}</span>
            <span className="max-w-[48px] truncate font-mono text-[10px] sm:max-w-[70px] sm:text-[11px]">{totalBill.toLocaleString()}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => void onCloseShift()}
          disabled={closingShift}
          className={`${controlClass} w-10 border border-cream-300 bg-white text-danger hover:bg-cream-100`}
          aria-label={isAm ? 'ፈረቃ ዝጋ' : 'Close shift'}
          title={isAm ? 'ፈረቃ ዝጋ' : 'Close shift'}
        >
          {closingShift
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    </header>
    {cartHasItems && (
      <div className="flex h-10 items-center gap-2 border-b border-cream-200 bg-white px-2 sm:px-3">
        <ShoppingBag className="h-4 w-4 shrink-0 text-berbere-500" aria-hidden="true" />
        <span
          className="shrink-0 rounded-full bg-cream-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-coffee-700"
          title={isAm ? `ጠቅላላ ${totalItems} ዕቃዎች` : `${totalItems} total items`}
        >
          {totalItems}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-coffee-700">
          {cartSummary}
        </span>
        <span className="shrink-0 font-mono text-xs font-black text-coffee-900">
          {totalBill.toLocaleString()} ETB
        </span>
        <button
          type="button"
          onClick={onToggleBill}
          aria-expanded={billOpen}
          className="flex h-9 shrink-0 items-center rounded-lg px-2 text-xs font-black text-berbere-600 hover:bg-berbere-50"
        >
          {isAm ? 'ትዕዛዝ' : 'Order'}
        </button>
      </div>
    )}
    {showTodayReport && (
      <div className="absolute right-2 top-full z-[60] max-h-[calc(100dvh-4rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-cream-300 bg-cream-50 p-2 shadow-elevated">
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-black text-coffee-700">
            {isAm ? 'የዛሬ ሽያጭ' : "Today's sales"}
          </span>
          <button
            type="button"
            onClick={() => setShowTodayReport(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-coffee-500 hover:bg-cream-200"
            aria-label={isAm ? 'ዝጋ' : 'Close report'}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {todayReport}
      </div>
    )}
    </div>
  )
}

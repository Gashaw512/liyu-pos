'use client'

import {
  ChevronDown,
  ChevronUp,
  Coins,
  Loader2,
  LogOut,
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
  onCloseShift: () => Promise<void>
  closingShift: boolean
  cartHasItems: boolean
  billOpen: boolean
  onToggleBill: () => void
  onCheckout: () => void
  hasUnsavedTableOrder: boolean
  savingTab: boolean
  onSaveOrder: () => Promise<void>
}

const controlClass =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

export default function POSHeader({
  isAm,
  selectedTable,
  totalItems,
  totalBill,
  onCloseShift,
  closingShift,
  cartHasItems,
  billOpen,
  onToggleBill,
  onCheckout,
  hasUnsavedTableOrder,
  savingTab,
  onSaveOrder,
}: POSHeaderProps) {
  const orderPlace = selectedTable?.name ?? (isAm ? 'ቀጥታ ሽያጭ' : 'Walk-in')

  return (
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
            className={`${controlClass} w-9 border border-cream-300 bg-white text-coffee-700 hover:bg-cream-100`}
            aria-label={isAm ? 'ትዕዛዙን አስቀምጥ' : 'Save table order'}
            title={isAm ? 'ትዕዛዙን አስቀምጥ' : 'Save table order'}
          >
            {savingTab
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
          </button>
        )}

        {cartHasItems && (
          <button
            type="button"
            onClick={onToggleBill}
            aria-expanded={billOpen}
            aria-label={isAm ? 'ትዕዛዙን ይመልከቱ' : 'View current order'}
            title={isAm ? 'ትዕዛዙን ይመልከቱ' : 'View current order'}
            className={`${controlClass} min-w-10 gap-1 bg-cream-200 px-2 text-xs font-black text-coffee-800 hover:bg-cream-300`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{totalItems}</span>
            {billOpen
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {cartHasItems && (
          <button
            type="button"
            onClick={onCheckout}
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
          className={`${controlClass} w-9 border border-cream-300 bg-white text-danger hover:bg-cream-100`}
          aria-label={isAm ? 'ፈረቃ ዝጋ' : 'Close shift'}
          title={isAm ? 'ፈረቃ ዝጋ' : 'Close shift'}
        >
          {closingShift
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}

'use client'

import {
  Coins,
  LogOut,
  ShoppingBag,
  Utensils,
  Loader2,
} from 'lucide-react'

import type { POSShift, POSTable } from './types'

interface POSHeaderProps {
  isAm: boolean
  activeShift: POSShift
  selectedTable: POSTable | null
  totalItems: number
  totalBill: number
  onCloseShift: () => Promise<void>
  closingShift: boolean
}

export default function POSHeader({
  isAm,
  activeShift,
  selectedTable,
  totalItems,
  totalBill,
  onCloseShift,
  closingShift,
}: POSHeaderProps) {
  return (
    <div className="shrink-0">
      {/* Shift bar */}
      <div className="flex items-center justify-between bg-coffee-900 px-3 py-2 text-xs text-cream-200">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />

          <span className="font-black">
            {isAm ? 'ፈረቃ ተከፍቷል' : 'SHIFT ACTIVE'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden xs:inline rounded-md bg-coffee-800 px-2 py-1 font-mono text-[10px] text-gold-300">
            {activeShift.real_database_id || 'LOCAL'}
          </span>

          <button
            type="button"
            onClick={onCloseShift}
            disabled={closingShift}
            className="flex h-7 items-center gap-1 rounded-lg bg-danger-bg px-2.5 font-black text-danger active:scale-95 disabled:opacity-50"
          >
            {closingShift ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}

            <span>{isAm ? 'ዝጋ' : 'Close'}</span>
          </button>
        </div>
      </div>

      {/* POS summary */}
      <div className="grid grid-cols-2 gap-2 border-b border-cream-300 bg-cream-50 p-2.5">
        <div className="flex min-w-0 items-center justify-between rounded-xl border border-cream-200 bg-cream-100 px-3 py-2">
          <div className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-wider text-coffee-400">
              {isAm ? 'አካውንት' : 'Account'}
            </span>

            <span className="block truncate text-sm font-black text-coffee-800">
              {selectedTable
                ? selectedTable.name
                : isAm
                  ? 'ቀጥታ መሸጫ'
                  : 'Walk-In'}
            </span>
          </div>

          <Utensils className="h-4 w-4 shrink-0 text-berbere-500" />
        </div>

        <div className="flex min-w-0 items-center justify-between rounded-xl border border-cream-200 bg-cream-100 px-3 py-2">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-coffee-400">
              {isAm ? 'ጠቅላላ' : 'Basket'}
            </span>

            <span className="block font-mono text-sm font-black text-berbere-500">
              {totalItems} {isAm ? 'ዕቃ' : 'items'}
            </span>
          </div>

          <ShoppingBag className="h-4 w-4 text-gold-500" />
        </div>
      </div>

      {/* Current amount strip */}
      <div className="flex items-center justify-between bg-coffee-800 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-cream-300">
          <Coins className="h-3.5 w-3.5 text-gold-400" />

          {isAm ? 'የአሁኑ ሂሳብ' : 'Current Bill'}
        </div>

        <span className="font-mono text-base font-black text-gold-300">
          {totalBill.toLocaleString()} ETB
        </span>
      </div>
    </div>
  )
}
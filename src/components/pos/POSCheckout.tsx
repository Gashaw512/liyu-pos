'use client'

import {
  ArrowLeft,
  ShoppingBag,
  Coins,
} from 'lucide-react'

import PaymentSelector from './PaymentSelector'

import type {
  POSCartItem,
  POSTable,
  PaymentSplit,
} from './types'

interface POSCheckoutProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  manualTip: string
  onManualTipChange: (value: string) => void
  onBack: () => void
  onConfirmPayment: (splitPayments: PaymentSplit) => Promise<void>
  isAm: boolean
}

export default function POSCheckout({
  cart,
  totalBill,
  selectedTable,
  manualTip,
  onManualTipChange,
  onBack,
  onConfirmPayment,
  isAm,
}: POSCheckoutProps) {
  return (
    <div className="space-y-3">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 text-xs font-black text-coffee-700 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />

        {isAm ? 'ተመለስ' : 'Back'}
      </button>

      {/* Summary */}
      <div className="rounded-2xl bg-coffee-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gold-400" />

            <span className="text-xs font-bold text-cream-300">
              {isAm ? 'ትዕዛዝ' : 'ORDER'}
            </span>
          </div>

          {selectedTable && (
            <span className="rounded-lg bg-gold-400 px-2 py-1 text-[10px] font-black text-coffee-900">
              {selectedTable.name}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm font-bold text-cream-300">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}{' '}
            {isAm ? 'ዕቃ' : 'items'}
          </span>

          <span className="font-mono text-2xl font-black text-gold-300">
            {totalBill.toLocaleString()}
            <span className="ml-1 text-xs">ETB</span>
          </span>
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-2xl border border-cream-300 bg-cream-50 p-3">
        <label className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-coffee-500">
          <Coins className="h-4 w-4 text-gold-500" />

          {isAm ? 'ጉርሻ' : 'Manual Tip'}
        </label>

        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.01"
            value={manualTip}
            onChange={(e) => onManualTipChange(e.target.value)}
            placeholder="0.00"
            className="h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3 pr-14 font-mono font-bold text-coffee-800 outline-none focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
          />

          <span className="absolute right-3 top-3 text-xs font-bold text-coffee-400">
            ETB
          </span>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-2xl border border-cream-300 bg-cream-50 p-3">
        <PaymentSelector
          totalBill={totalBill}
          onConfirmPayment={onConfirmPayment}
          isAm={isAm}
        />
      </div>
    </div>
  )
}
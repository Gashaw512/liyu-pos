'use client'

import POSCart from './POSCart'

import type {
  POSCartItem,
  POSTable,
} from './types'

interface POSBillDropdownProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  savingTab: boolean

  onIncrease: (
    id: string,
    amount?: number,
  ) => void

  onDecrease: (
    id: string,
  ) => void

  onRestoreItem: (item: POSCartItem) => void

  onClearItem: (
    id: string,
  ) => void

  onSaveTab: () => Promise<void>

  onCheckout: () => void

  onClearCart: () => void

  onClose: () => void

  isAm: boolean
  canCheckout?: boolean
}

export default function POSBillDropdown({
  cart,
  totalBill,
  selectedTable,
  savingTab,
  onIncrease,
  onDecrease,
  onRestoreItem,
  onClearItem,
  onSaveTab,
  onCheckout,
  onClearCart,
  onClose,
  isAm,
  canCheckout = true,
}: POSBillDropdownProps) {
  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-20 bg-black/5"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* DROPDOWN */}
      <div
        className="
          absolute
          inset-x-0
          top-full
          z-30
          flex
          max-h-[72dvh]
          flex-col
          overflow-hidden
          border-x
          border-b
          border-cream-300
          bg-cream-50
          shadow-[0_14px_28px_rgba(65,45,30,0.14)]
          lg:inset-x-auto
          lg:right-3
          lg:w-[380px]
          lg:rounded-b-2xl
        "
      >
        <POSCart
          cart={cart}
          totalBill={totalBill}
          selectedTable={selectedTable}
          savingTab={savingTab}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          onRestoreItem={onRestoreItem}
          onClearItem={onClearItem}
          onSaveTab={onSaveTab}
          onCheckout={onCheckout}
          onClearCart={onClearCart}
          onClose={onClose}
          isAm={isAm}
          hideHeader
          canCheckout={canCheckout}
        />
      </div>
    </>
  )
}

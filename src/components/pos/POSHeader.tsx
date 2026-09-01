
'use client'

import {
  ChevronDown,
  ChevronUp,
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
  cartHasItems: boolean
  billOpen: boolean
  onToggleBill: () => void
}

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
}: POSHeaderProps) {
  const orderPlace =
    selectedTable?.name ??
    (isAm ? 'ቀጥታ ሽያጭ' : 'Walk-In')

  return (
    <header
      className="
        sticky top-0 z-40
        w-full shrink-0
        border-b border-cream-300
        bg-cream-50/95
        backdrop-blur-md
      "
    >
      <div
        className="
          mx-auto flex
          h-14
          w-full
          items-center
          gap-2
          px-2.5
          sm:px-4
          lg:px-5
        "
      >
        {/* ======================================================
            ORDER LOCATION
        ====================================================== */}

        <div
          className="
            flex min-w-0 flex-1
            items-center gap-2
          "
        >
          <div
            className="
              flex h-8 w-8 shrink-0
              items-center justify-center
              rounded-lg
              bg-berbere-50
              text-berbere-500
            "
          >
            <Utensils className="h-4 w-4" />
          </div>

          <div className="min-w-0 leading-none">
            <div
              className="
                truncate
                text-[8px]
                font-bold
                uppercase
                tracking-wider
                text-coffee-400
              "
            >
              {isAm ? 'ትዕዛዝ' : 'ORDER'}
            </div>

            <div
              className="
                mt-1 truncate
                text-xs
                font-black
                text-coffee-800
              "
            >
              {orderPlace}
            </div>
          </div>
        </div>

        {/* ======================================================
            ITEMS
        ====================================================== */}

        <div
          className="
            flex shrink-0
            items-center gap-1.5
            rounded-lg
            bg-cream-100
            px-2.5
            py-1.5
          "
          title={isAm ? 'የትዕዛዝ እቃዎች' : 'Items in order'}
        >
          <ShoppingBag className="h-3.5 w-3.5 text-gold-600" />

          <span
            className="
              font-mono
              text-xs
              font-black
              text-coffee-800
            "
          >
            {totalItems}
          </span>

          <span
            className="
              hidden
              text-[9px]
              font-bold
              text-coffee-400
              sm:inline
            "
          >
            {isAm ? 'እቃ' : 'items'}
          </span>
        </div>

        {/* ======================================================
            TOTAL
        ====================================================== */}

        <div
          className="
            shrink-0
            text-right
          "
        >
          <div
            className="
              whitespace-nowrap
              font-mono
              text-base
              font-black
              leading-none
              text-berbere-500
              sm:text-lg
            "
          >
            {totalBill.toLocaleString()}
          </div>

          <div
            className="
              mt-0.5
              text-[7px]
              font-black
              tracking-widest
              text-coffee-400
            "
          >
            ETB
          </div>
        </div>

        {/* ======================================================
            VIEW ORDER
        ====================================================== */}

        <button
          type="button"
          onClick={onToggleBill}
          disabled={!cartHasItems}
          aria-expanded={billOpen}
          aria-label={
            isAm
              ? 'የትዕዛዝ ዝርዝር ይመልከቱ'
              : 'View order'
          }
          className={[
            'flex h-9 shrink-0 items-center justify-center gap-1.5',
            'rounded-lg px-2.5',
            'text-[9px] font-black',
            'transition active:scale-[0.97]',
            cartHasItems
              ? 'bg-berbere-500 text-white shadow-sm hover:bg-berbere-600'
              : 'cursor-default bg-cream-200 text-coffee-400',
          ].join(' ')}
        >
          <ShoppingBag className="h-3.5 w-3.5" />

          <span className="hidden sm:inline">
            {billOpen
              ? isAm
                ? 'ዝጋ'
                : 'Hide'
              : isAm
                ? 'ትዕዛዝ'
                : 'Order'}
          </span>

          {cartHasItems &&
            (billOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            ))}
        </button>

        {/* ======================================================
            CLOSE SHIFT
        ====================================================== */}

        <button
          type="button"
          onClick={onCloseShift}
          disabled={closingShift}
          aria-label={
            isAm
              ? 'ፈረቃ ዝጋ'
              : 'Close shift'
          }
          className="
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-lg
            border border-cream-300
            bg-cream-50
            text-danger
            transition
            hover:bg-cream-100
            active:scale-[0.97]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {closingShift ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </header>
  )
}


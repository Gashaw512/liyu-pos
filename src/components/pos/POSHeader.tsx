
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

  const isWalkIn = !selectedTable

  return (
    <header
      className="
        sticky top-0 z-40
        w-full shrink-0
        border-b border-cream-300
        bg-cream-50/95
        shadow-sm
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
        {/* ==========================================================
            SALES AREA
            The most important information on the screen.
        ========================================================== */}

        <div
          className="
            flex
            min-w-0
            flex-1
            items-center
            gap-2
          "
        >
          {/* SALES ICON */}

          <div
            className={[
              `
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
              `,
              isWalkIn
                ? 'bg-cream-200 text-coffee-500'
                : 'bg-berbere-50 text-berbere-500',
            ].join(' ')}
            aria-hidden="true"
          >
            <Utensils className="h-4 w-4" />
          </div>

          {/* LOCATION */}

          <div className="min-w-0 leading-none">
            <div
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[0.12em]
                text-coffee-400
              "
            >
              {isAm ? 'የሽያጭ ቦታ' : 'SALES AREA'}
            </div>

            <div
              className="
                mt-1
                flex
                min-w-0
                items-center
                gap-1.5
              "
            >
              <span
                className="
                  truncate
                  text-sm
                  font-black
                  text-coffee-900
                  sm:text-base
                "
              >
                {orderPlace}
              </span>

              {/* Small status indicator */}

              <span
                className={[
                  `
                    h-1.5
                    w-1.5
                    shrink-0
                    rounded-full
                  `,
                  isWalkIn
                    ? 'bg-coffee-300'
                    : 'bg-berbere-500',
                ].join(' ')}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* ==========================================================
            ITEMS
        ========================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-1.5
            rounded-xl
            border
            border-cream-200
            bg-cream-100
            px-2
            py-1.5
            sm:px-2.5
          "
          title={
            isAm
              ? 'የትዕዛዙ እቃዎች ብዛት'
              : 'Number of items in this order'
          }
        >
          <ShoppingBag
            className="
              h-3.5
              w-3.5
              shrink-0
              text-gold-600
            "
            aria-hidden="true"
          />

          <span
            className="
              font-mono
              text-xs
              font-black
              text-coffee-900
              sm:text-sm
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

        {/* ==========================================================
            TOTAL
        ========================================================== */}

        <div
          className="
            shrink-0
            text-right
          "
          title={
            isAm
              ? 'የአሁኑ ትዕዛዝ ጠቅላላ'
              : 'Current order total'
          }
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

        {/* ==========================================================
            ORDER BUTTON
            Clear action for viewing the current bill.
        ========================================================== */}

        <button
          type="button"
          onClick={onToggleBill}
          disabled={!cartHasItems}
          aria-expanded={billOpen}
          aria-label={
            isAm
              ? 'የአሁኑን ትዕዛዝ ይመልከቱ'
              : 'View current order'
          }
          title={
            isAm
              ? 'የአሁኑን ትዕዛዝ ይመልከቱ'
              : 'View current order'
          }
          className={[
            `
              flex
              h-9
              shrink-0
              items-center
              justify-center
              gap-1.5
              rounded-xl
              px-2.5
              text-[9px]
              font-black
              transition-all
              active:scale-[0.97]
              sm:px-3
            `,
            cartHasItems
              ? `
                bg-berbere-500
                text-white
                shadow-sm
                hover:bg-berbere-600
              `
              : `
                cursor-default
                bg-cream-200
                text-coffee-400
              `,
          ].join(' ')}
        >
          <ShoppingBag
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />

          <span className="hidden sm:inline">
            {billOpen
              ? isAm
                ? 'ዝጋ'
                : 'Close'
              : isAm
                ? 'ትዕዛዝ'
                : 'Order'}
          </span>

          {cartHasItems &&
            (billOpen ? (
              <ChevronUp
                className="h-3 w-3"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="h-3 w-3"
                aria-hidden="true"
              />
            ))}
        </button>

        {/* ==========================================================
            CLOSE SHIFT
        ========================================================== */}

        <button
          type="button"
          onClick={onCloseShift}
          disabled={closingShift}
          aria-label={
            isAm
              ? 'ፈረቃ ዝጋ'
              : 'Close shift'
          }
          title={
            isAm
              ? 'የስራ ፈረቃ ዝጋ'
              : 'Close shift'
          }
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-cream-300
            bg-cream-50
            text-danger
            transition-all
            hover:bg-cream-100
            active:scale-[0.97]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {closingShift ? (
            <Loader2
              className="
                h-3.5
                w-3.5
                animate-spin
              "
            />
          ) : (
            <LogOut
              className="h-3.5 w-3.5"
            />
          )}
        </button>
      </div>
    </header>
  )
}


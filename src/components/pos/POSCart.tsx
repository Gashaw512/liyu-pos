'use client'

import {
  Delete,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Save,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'

import type { POSCartItem, POSTable } from './types'

interface POSCartProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  savingTab: boolean

  onIncrease: (id: string, amount?: number) => void
  onDecrease: (id: string) => void
  onClearItem: (id: string) => void

  onSaveTab: () => Promise<void>
  onCheckout: () => void

  /**
   * Optional close action for mobile/header bill drawer.
   * Does not affect checkout or sale logic.
   */
  onClose?: () => void

  isAm: boolean
  hideHeader?: boolean
}

export default function POSCart({
  cart,
  totalBill,
  selectedTable,
  savingTab,
  onIncrease,
  onDecrease,
  onClearItem,
  onSaveTab,
  onCheckout,
  onClose,
  isAm,
  hideHeader = false,
}: POSCartProps) {
  const [activeItem, setActiveItem] =
    useState<POSCartItem | null>(null)

  const [typedValue, setTypedValue] = useState('')

  if (cart.length === 0) {
    return null
  }

  const totalItems = cart.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0,
  )

  const orderLocation =
    selectedTable?.name ??
    (isAm ? 'ቀጥታ ሽያጭ' : 'Walk-In')

  // ============================================================
  // QUANTITY EDITOR
  // ============================================================

  const openQuantityEditor = (
    item: POSCartItem,
  ) => {
    setActiveItem(item)
    setTypedValue(
      String(item.quantity),
    )
  }

  const addDigit = (digit: string) => {
    setTypedValue((current) => {
      if (current === '0') {
        return digit
      }

      if (current.length >= 6) {
        return current
      }

      return current + digit
    })
  }

  const removeDigit = () => {
    setTypedValue((current) =>
      current.length > 1
        ? current.slice(0, -1)
        : '0',
    )
  }

  const closeQuantityEditor = () => {
    setActiveItem(null)
    setTypedValue('')
  }

  const confirmQuantity = () => {
    if (!activeItem) {
      return
    }

    const newQuantity =
      Number.parseInt(
        typedValue,
        10,
      )

    if (
      Number.isNaN(newQuantity) ||
      newQuantity <= 0
    ) {
      onClearItem(activeItem.id)
      closeQuantityEditor()
      return
    }

    const currentQuantity =
      Number(
        activeItem.quantity || 0,
      )

    const difference =
      newQuantity -
      currentQuantity

    if (difference > 0) {
      onIncrease(
        activeItem.id,
        difference,
      )
    }

    if (difference < 0) {
      for (
        let i = 0;
        i < Math.abs(difference);
        i++
      ) {
        onDecrease(
          activeItem.id,
        )
      }
    }

    closeQuantityEditor()
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <section
        className="
          flex min-h-0 w-full flex-col
          overflow-hidden
          rounded-xl
          border border-cream-300
          bg-cream-50
        "
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        {!hideHeader && (
          <header
            className="
              flex shrink-0 items-center
              justify-between
              gap-2
              border-b border-cream-200
              px-3 py-2.5
            "
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="
                  flex h-7 w-7 shrink-0
                  items-center justify-center
                  rounded-lg
                  bg-berbere-100
                "
              >
                <ShoppingCart
                  className="
                    h-3.5 w-3.5
                    text-berbere-600
                  "
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2
                    className="
                      truncate
                      text-[11px]
                      font-black
                      text-coffee-800
                    "
                  >
                    {isAm
                      ? 'ትዕዛዝ'
                      : 'Order'}
                  </h2>

                  <span
                    className="
                      min-w-5
                      rounded-full
                      bg-cream-200
                      px-1.5 py-0.5
                      text-center
                      font-mono
                      text-[8px]
                      font-black
                      text-coffee-700
                    "
                  >
                    {totalItems}
                  </span>
                </div>

                <p
                  className="
                    truncate
                    text-[8px]
                    font-medium
                    text-coffee-400
                  "
                >
                  {orderLocation}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="text-right">
                <span
                  className="
                    font-mono
                    text-sm
                    font-black
                    text-berbere-600
                  "
                >
                  {totalBill.toLocaleString()}
                </span>

                <span
                  className="
                    ml-1
                    text-[8px]
                    font-bold
                    text-coffee-400
                  "
                >
                  ETB
                </span>
              </div>

              {/* CLOSE CART / BILL */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={
                    isAm
                      ? 'ትዕዛዝ ዝጋ'
                      : 'Close order'
                  }
                  className="
                    flex h-7 w-7
                    items-center justify-center
                    rounded-lg
                    text-coffee-400
                    transition
                    hover:bg-cream-200
                    hover:text-coffee-700
                    active:scale-95
                  "
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>
        )}

        {/* ======================================================
            ITEMS
        ====================================================== */}

        <div
          className="
            min-h-0 flex-1
            overflow-y-auto
            px-2.5 py-2
            subtle-scrollbar
          "
        >
          <div
            className="
              mb-1.5 flex
              items-center justify-between
              px-0.5
            "
          >
            <span
              className="
                text-[8px]
                font-black
                uppercase
                tracking-wider
                text-coffee-400
              "
            >
              {isAm
                ? 'እቃዎች'
                : 'Items'}
            </span>

            <span
              className="
                text-[8px]
                font-medium
                text-coffee-400
              "
            >
              {isAm
                ? 'ቁጥር ለመቀየር ይጫኑ'
                : 'Tap number to edit'}
            </span>
          </div>

          <div className="space-y-1.5">
            {cart.map((item) => {
              const quantity =
                Number(
                  item.quantity || 0,
                )

              const price =
                Number(
                  item.price || 0,
                )

              const lineTotal =
                price * quantity

              return (
                <div
                  key={item.id}
                  className="
                    rounded-lg
                    border border-cream-200
                    bg-white
                    px-2 py-2
                  "
                >
                  <div className="flex items-center gap-2">
                    {/* PRODUCT */}

                    <div className="min-w-0 flex-1">
                      <p
                        className="
                          truncate
                          text-[11px]
                          font-black
                          text-coffee-800
                        "
                      >
                        {item.name}
                      </p>

                      <p
                        className="
                          mt-0.5
                          font-mono
                          text-[8px]
                          text-coffee-400
                        "
                      >
                        {price.toLocaleString()} ETB
                      </p>
                    </div>

                    {/* QUANTITY */}

                    <div
                      className="
                        flex shrink-0
                        items-center
                        rounded-lg
                        border border-cream-300
                        bg-cream-100
                        p-0.5
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onDecrease(
                            item.id,
                          )
                        }
                        aria-label={
                          isAm
                            ? 'ቀንስ'
                            : 'Reduce'
                        }
                        className="
                          flex h-8 w-8
                          items-center
                          justify-center
                          rounded-md
                          bg-white
                          text-coffee-700
                          transition
                          hover:bg-cream-50
                          active:scale-90
                        "
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openQuantityEditor(
                            item,
                          )
                        }
                        aria-label={
                          isAm
                            ? 'ብዛት ቀይር'
                            : 'Change quantity'
                        }
                        className="
                          flex h-8 min-w-9
                          items-center
                          justify-center
                          rounded-md
                          px-1.5
                          font-mono
                          text-xs
                          font-black
                          text-berbere-600
                          transition
                          hover:bg-cream-200
                          active:scale-95
                        "
                      >
                        {quantity}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onIncrease(
                            item.id,
                          )
                        }
                        aria-label={
                          isAm
                            ? 'ጨምር'
                            : 'Add'
                        }
                        className="
                          flex h-8 w-8
                          items-center
                          justify-center
                          rounded-md
                          bg-white
                          text-coffee-700
                          transition
                          hover:bg-cream-50
                          active:scale-90
                        "
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* LINE TOTAL */}

                    <div
                      className="
                        w-[64px]
                        shrink-0
                        text-right
                      "
                    >
                      <p
                        className="
                          font-mono
                          text-[11px]
                          font-black
                          text-coffee-800
                        "
                      >
                        {lineTotal.toLocaleString()}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          onClearItem(
                            item.id,
                          )
                        }
                        aria-label={
                          isAm
                            ? 'እቃ አስወግድ'
                            : 'Remove item'
                        }
                        className="
                          mt-0.5
                          inline-flex
                          items-center
                          gap-0.5
                          text-[8px]
                          font-bold
                          text-danger
                          transition
                          hover:opacity-70
                          active:scale-95
                        "
                      >
                        <Trash2 className="h-2.5 w-2.5" />

                        {isAm
                          ? 'አስወግድ'
                          : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ======================================================
            ACTION FOOTER
        ====================================================== */}

        <footer
          className="
            shrink-0
            border-t border-cream-200
            bg-cream-50
            p-2.5
          "
        >
          {/* TOTAL */}

          <div
            className="
              mb-2
              flex items-center
              justify-between
              px-1
            "
          >
            <div className="flex items-center gap-1.5">
              <span
                className="
                  text-[9px]
                  font-black
                  text-coffee-500
                "
              >
                {isAm
                  ? 'ጠቅላላ'
                  : 'Total'}
              </span>

              <span
                className="
                  text-[8px]
                  font-medium
                  text-coffee-400
                "
              >
                · {totalItems}{' '}
                {isAm
                  ? 'እቃ'
                  : totalItems === 1
                    ? 'item'
                    : 'items'}
              </span>
            </div>

            <span
              className="
                font-mono
                text-base
                font-black
                text-berbere-600
              "
            >
              {totalBill.toLocaleString()} ETB
            </span>
          </div>

          {/* ====================================================
              ACTIONS

              Save = secondary
              Pay  = primary
          ==================================================== */}

          <div
            className="
              grid grid-cols-[auto_1fr]
              gap-1.5
            "
          >
            {/* SAVE ORDER */}

            <button
              type="button"
              disabled={
                !selectedTable ||
                savingTab
              }
              onClick={() => {
                void onSaveTab()
              }}
              title={
                selectedTable
                  ? isAm
                    ? 'ትዕዛዙን በጠረጴዛው ላይ አስቀምጥ'
                    : `Save order for ${selectedTable.name}`
                  : isAm
                    ? 'መጀመሪያ ጠረጴዛ ይምረጡ'
                    : 'Select a table first'
              }
              className="
                flex h-11
                min-w-[82px]
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border border-cream-300
                bg-cream-100
                px-3
                text-coffee-700
                transition
                hover:border-cream-400
                hover:bg-cream-200
                active:scale-[0.97]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {savingTab ? (
                <Loader2
                  className="
                    h-4 w-4
                    animate-spin
                  "
                />
              ) : (
                <Save className="h-4 w-4" />
              )}

              <span
                className="
                  text-[10px]
                  font-black
                "
              >
                {isAm
                  ? 'አስቀምጥ'
                  : 'Save'}
              </span>
            </button>

            {/* PAY & FINISH */}

            <button
              type="button"
              onClick={onCheckout}
              className="
                flex h-11
                min-w-0
                items-center
                justify-between
                gap-2
                rounded-lg
                bg-berbere-500
                px-3
                text-white
                shadow-sm
                transition
                hover:bg-berbere-600
                active:scale-[0.97]
              "
            >
              <span
                className="
                  flex min-w-0
                  items-center
                  gap-1.5
                "
              >
                <Receipt className="h-4 w-4 shrink-0" />

                <span
                  className="
                    truncate
                    text-[10px]
                    font-black
                  "
                >
                  {isAm
                    ? 'ክፍያ ፈጽም'
                    : 'Pay & Finish'}
                </span>
              </span>

              <span
                className="
                  shrink-0
                  font-mono
                  text-[10px]
                  font-black
                  text-white
                "
              >
                {totalBill.toLocaleString()}
              </span>
            </button>
          </div>
        </footer>
      </section>

      {/* ========================================================
          QUANTITY EDITOR
      ======================================================== */}

      {activeItem && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-coffee-900/45
            p-4
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            isAm
              ? 'ብዛት ማስተካከያ'
              : 'Change quantity'
          }
        >
          <div
            className="
              w-full max-w-[280px]
              overflow-hidden
              rounded-2xl
              border border-cream-300
              bg-cream-50
              shadow-2xl
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                border-b border-cream-200
                bg-cream-100
                px-4 py-3
                text-center
              "
            >
              <p
                className="
                  text-[8px]
                  font-black
                  uppercase
                  tracking-wider
                  text-berbere-600
                "
              >
                {isAm
                  ? 'ብዛት'
                  : 'Quantity'}
              </p>

              <h3
                className="
                  mt-0.5
                  truncate
                  text-xs
                  font-black
                  text-coffee-800
                "
              >
                {activeItem.name}
              </h3>

              <div
                className="
                  mt-2
                  rounded-xl
                  border border-cream-300
                  bg-white
                  py-2.5
                  font-mono
                  text-2xl
                  font-black
                  text-berbere-600
                "
              >
                {typedValue || '0'}
              </div>
            </div>

            {/* NUMBER PAD */}

            <div
              className="
                grid grid-cols-3
                gap-1.5
                bg-cream-100
                p-3
              "
            >
              {[
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
              ].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() =>
                    addDigit(digit)
                  }
                  className="
                    h-10
                    rounded-lg
                    border border-cream-200
                    bg-white
                    font-mono
                    text-base
                    font-black
                    text-coffee-800
                    transition
                    hover:bg-cream-50
                    active:scale-95
                  "
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  addDigit('0')
                }
                className="
                  col-span-2
                  h-10
                  rounded-lg
                  border border-cream-200
                  bg-white
                  font-mono
                  text-base
                  font-black
                  text-coffee-800
                  transition
                  hover:bg-cream-50
                  active:scale-95
                "
              >
                0
              </button>

              <button
                type="button"
                onClick={
                  removeDigit
                }
                aria-label={
                  isAm
                    ? 'ቁጥር ሰርዝ'
                    : 'Delete number'
                }
                className="
                  flex h-10
                  items-center
                  justify-center
                  rounded-lg
                  border border-danger/20
                  bg-danger/10
                  text-danger
                  transition
                  hover:bg-danger/20
                  active:scale-95
                "
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>

            {/* ACTIONS */}

            <div
              className="
                grid grid-cols-2
                gap-1.5
                border-t border-cream-200
                bg-cream-50
                p-2.5
              "
            >
              <button
                type="button"
                onClick={
                  closeQuantityEditor
                }
                className="
                  h-10
                  rounded-lg
                  bg-cream-200
                  text-[10px]
                  font-black
                  text-coffee-700
                  transition
                  hover:bg-cream-300
                  active:scale-95
                "
              >
                {isAm
                  ? 'ተወው'
                  : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={
                  confirmQuantity
                }
                className="
                  h-10
                  rounded-lg
                  bg-success
                  text-[10px]
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:brightness-105
                  active:scale-95
                "
              >
                {isAm
                  ? 'አረጋግጥ'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Check,
  Smartphone,
  Building2,
  Split,
} from 'lucide-react'

interface PaymentSplit {
  cash: number
  telebirr: number
  cbeBirr: number
  awash: number
}

interface PaymentMethod {
  id: keyof PaymentSplit
  name: string
  nameAm: string
  icon: 'cash' | 'mobile' | 'bank'
  enabled: boolean
}

/*
 * ============================================================
 * TEMPORARY PAYMENT CONFIGURATION
 * ============================================================
 *
 * Later this should come from:
 *
 *   owner settings
 *        ↓
 *   database
 *        ↓
 *   IndexedDB cache
 *        ↓
 *   POS
 *
 * For now we keep dummy configuration here.
 */

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Cash',
    nameAm: 'ጥሬ ገንዘብ',
    icon: 'cash',
    enabled: true,
  },
  {
    id: 'telebirr',
    name: 'Telebirr',
    nameAm: 'ቴሌብር',
    icon: 'mobile',
    enabled: true,
  },
  {
    id: 'cbeBirr',
    name: 'CBE Birr',
    nameAm: 'CBE Birr',
    icon: 'mobile',
    enabled: true,
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    nameAm: 'አዋሽ ባንክ',
    icon: 'bank',
    enabled: true,
  },
]

interface PaymentSelectorProps {
  totalBill: number

  onConfirmPayment: (
    split: PaymentSplit,
  ) => void | Promise<void>

  isAm: boolean
}

export default function PaymentSelector({
  totalBill,
  onConfirmPayment,
  isAm,
}: PaymentSelectorProps) {

  const enabledMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter(
        (method) => method.enabled,
      ),
    [],
  )

  const [amounts, setAmounts] = useState<
    Record<string, number>
  >({})

  const [selectedMethod, setSelectedMethod] =
    useState<keyof PaymentSplit>('cash')

  /*
   * Default = all cash
   */
  useEffect(() => {
    const initial: Record<string, number> = {}

    enabledMethods.forEach((method) => {
      initial[method.id] =
        method.id === 'cash'
          ? totalBill
          : 0
    })

    setAmounts(initial)

    setSelectedMethod(
      enabledMethods[0]?.id ?? 'cash',
    )
  }, [totalBill, enabledMethods])

  const paidAmount = useMemo(
    () =>
      Object.values(amounts).reduce(
        (sum, amount) =>
          sum + Number(amount || 0),
        0,
      ),
    [amounts],
  )

  const remainingAmount =
    totalBill - paidAmount

  const isBalanced =
    Math.abs(remainingAmount) < 0.01

  /*
   * ============================================================
   * SET SINGLE PAYMENT
   * ============================================================
   */

  const selectSingleMethod = (
    methodId: keyof PaymentSplit,
  ) => {
    const next: Record<string, number> = {}

    enabledMethods.forEach((method) => {
      next[method.id] =
        method.id === methodId
          ? totalBill
          : 0
    })

    setAmounts(next)
    setSelectedMethod(methodId)
  }

  /*
   * ============================================================
   * CHANGE PAYMENT AMOUNT
   * ============================================================
   *
   * Automatically puts the remaining amount
   * into the other enabled method.
   */

  const handleAmountChange = (
    methodId: keyof PaymentSplit,
    value: string,
  ) => {
    const amount = Math.max(
      0,
      Math.min(
        Number(value) || 0,
        totalBill,
      ),
    )

    const remaining =
      totalBill - amount

    const next: Record<string, number> = {
      ...amounts,
      [methodId]: amount,
    }

    /*
     * Put remaining amount into the
     * first other enabled payment method.
     */
    const otherMethod =
      enabledMethods.find(
        (method) =>
          method.id !== methodId,
      )

    if (otherMethod) {
      next[otherMethod.id] =
        Math.max(0, remaining)
    }

    /*
     * Clear any other methods when
     * two-method split is being used.
     */
    enabledMethods.forEach((method) => {
      if (
        method.id !== methodId &&
        method.id !== otherMethod?.id
      ) {
        next[method.id] = 0
      }
    })

    setSelectedMethod(methodId)
    setAmounts(next)
  }

  /*
   * ============================================================
   * 50 / 50 SPLIT
   * ============================================================
   */

  const handleSplit = () => {
    const activeMethods =
      enabledMethods.slice(0, 2)

    if (activeMethods.length < 2) {
      return
    }

    const first = Math.floor(
      (totalBill / 2) * 100,
    ) / 100

    const second =
      totalBill - first

    const next: Record<string, number> = {}

    enabledMethods.forEach(
      (method, index) => {
        if (index === 0) {
          next[method.id] = first
        } else if (index === 1) {
          next[method.id] = second
        } else {
          next[method.id] = 0
        }
      },
    )

    setAmounts(next)
  }

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const submitPayment = async () => {
    if (!isBalanced) {
      window.alert(
        isAm
          ? 'የክፍያ ድምር ከጠቅላላ ሂሳቡ ጋር እኩል መሆን አለበት።'
          : 'Payment amount must match the bill total.',
      )

      return
    }

    await onConfirmPayment({
      cash: Number(amounts.cash || 0),
      telebirr: Number(
        amounts.telebirr || 0,
      ),
      cbeBirr: Number(
        amounts.cbeBirr || 0,
      ),
      awash: Number(
        amounts.awash || 0,
      ),
    })
  }

  /*
   * ============================================================
   * ICON
   * ============================================================
   */

  const getIcon = (
    icon: PaymentMethod['icon'],
  ) => {
    if (icon === 'cash') {
      return Banknote
    }

    if (icon === 'mobile') {
      return Smartphone
    }

    return Building2
  }

  return (
    <div className="space-y-3">

      {/* Amount due */}
      <div
        className="
          flex items-center justify-between
          rounded-lg
          bg-cream-100
          px-3 py-2
        "
      >
        <span
          className="
            text-[10px]
            font-black
            uppercase
            tracking-wide
            text-coffee-400
          "
        >
          {isAm
            ? 'የሚከፈል'
            : 'Amount Due'}
        </span>

        <span
          className="
            font-mono
            text-lg
            font-black
            text-berbere-600
          "
        >
          {totalBill.toLocaleString()}
          <span className="ml-1 text-[9px]">
            ETB
          </span>
        </span>
      </div>

      {/* Payment methods */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span
            className="
              text-[10px]
              font-black
              uppercase
              tracking-wide
              text-coffee-500
            "
          >
            {isAm
              ? 'የክፍያ ዘዴ'
              : 'Payment Method'}
          </span>

          <span className="text-[9px] font-bold text-coffee-400">
            {enabledMethods.length} options
          </span>
        </div>

        <div
          className="
            grid
            grid-cols-2
            gap-2
            sm:grid-cols-4
          "
        >
          {enabledMethods.map(
            (method) => {
              const Icon =
                getIcon(method.icon)

              const isSelected =
                selectedMethod ===
                  method.id &&
                Number(
                  amounts[method.id] || 0,
                ) > 0

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() =>
                    selectSingleMethod(
                      method.id,
                    )
                  }
                  className={[
                    'relative flex min-h-[58px]',
                    'items-center gap-2',
                    'rounded-lg border px-2.5',
                    'transition-all',
                    'active:scale-[0.98]',
                    isSelected
                      ? 'border-berbere-400 bg-berbere-50 text-berbere-700'
                      : 'border-cream-300 bg-cream-50 text-coffee-600 hover:border-berbere-200',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span
                      className="
                        absolute right-1.5 top-1.5
                        flex h-4 w-4
                        items-center justify-center
                        rounded-full
                        bg-berbere-500
                        text-white
                      "
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}

                  <div
                    className={[
                      'flex h-8 w-8 shrink-0',
                      'items-center justify-center',
                      'rounded-md',
                      isSelected
                        ? 'bg-berbere-500 text-white'
                        : 'bg-cream-100 text-coffee-500',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <span className="truncate text-left text-[10px] font-black">
                    {isAm
                      ? method.nameAm
                      : method.name}
                  </span>
                </button>
              )
            },
          )}
        </div>
      </div>

      {/* Quick split */}
      {enabledMethods.length >= 2 && (
        <button
          type="button"
          onClick={handleSplit}
          className="
            flex h-9 w-full
            items-center justify-center gap-2
            rounded-lg
            border border-cream-300
            bg-cream-100
            text-[10px]
            font-black
            text-coffee-600
            transition
            hover:border-gold-400
            hover:bg-gold-50
            active:scale-[0.98]
          "
        >
          <Split className="h-3.5 w-3.5 text-gold-600" />

          {isAm
            ? '50/50 ክፍል'
            : 'Split 50 / 50'}
        </button>
      )}

      {/* Amount inputs */}
      <div className="space-y-2">
        {enabledMethods
          .filter(
            (method) =>
              Number(
                amounts[method.id] || 0,
              ) > 0 ||
              method.id === selectedMethod,
          )
          .map((method) => {
            const Icon =
              getIcon(method.icon)

            return (
              <div
                key={method.id}
                className="
                  rounded-lg
                  border border-cream-300
                  bg-cream-50
                  px-2.5 py-2
                "
              >
                <label
                  htmlFor={`payment-${method.id}`}
                  className="
                    mb-1 flex items-center gap-1.5
                  "
                >
                  <Icon className="h-3.5 w-3.5 text-coffee-500" />

                  <span
                    className="
                      text-[10px]
                      font-black
                      text-coffee-600
                    "
                  >
                    {isAm
                      ? method.nameAm
                      : method.name}
                  </span>

                  <span
                    className="
                      ml-auto
                      text-[9px]
                      font-bold
                      text-coffee-400
                    "
                  >
                    ETB
                  </span>
                </label>

                <input
                  id={`payment-${method.id}`}
                  type="number"
                  min="0"
                  max={totalBill}
                  step="0.01"
                  inputMode="decimal"
                  value={
                    amounts[method.id] || ''
                  }
                  onChange={(event) =>
                    handleAmountChange(
                      method.id,
                      event.target.value,
                    )
                  }
                  className="
                    h-10 w-full
                    rounded-md
                    border border-cream-300
                    bg-cream-100
                    px-3
                    font-mono
                    text-sm
                    font-black
                    text-coffee-700
                    outline-none
                    transition
                    focus:border-berbere-300
                    focus:bg-cream-50
                    focus:ring-2
                    focus:ring-berbere-100
                  "
                />
              </div>
            )
          })}
      </div>

      {/* Payment status */}
      <div
        className={[
          'flex items-center justify-between',
          'rounded-lg px-3 py-2',
          isBalanced
            ? 'border border-success/20 bg-success-bg'
            : 'border border-cream-300 bg-cream-100',
        ].join(' ')}
      >
        <span
          className="
            text-[10px]
            font-black
            uppercase
            tracking-wide
            text-coffee-500
          "
        >
          {isBalanced
            ? isAm
              ? 'ዝግጁ'
              : 'Ready'
            : isAm
              ? 'ቀሪ'
              : 'Remaining'}
        </span>

        <span
          className={[
            'font-mono text-sm font-black',
            isBalanced
              ? 'text-success'
              : 'text-coffee-600',
          ].join(' ')}
        >
          {Math.abs(
            remainingAmount,
          ).toLocaleString()}

          <span className="ml-1 text-[9px]">
            ETB
          </span>
        </span>
      </div>

      {/* Complete */}
      <button
        type="button"
        onClick={submitPayment}
        disabled={!isBalanced}
        className="
          flex h-12 w-full
          items-center justify-center gap-2
          rounded-lg
          bg-berbere-500
          px-4
          text-sm font-black
          text-cream-50
          shadow-card
          transition-all
          hover:bg-berbere-600
          active:scale-[0.98]
          disabled:cursor-not-allowed
          disabled:bg-cream-300
          disabled:text-coffee-400
          disabled:shadow-none
        "
      >
        <Check className="h-4 w-4 text-gold-300" />

        <span>
          {isAm
            ? 'ክፍያውን ጨርስ'
            : 'Complete Payment'}
        </span>

        <span className="font-mono text-[10px] text-gold-200">
          {totalBill.toLocaleString()} ETB
        </span>
      </button>

    </div>
  )
}



'use client'

import { useMemo, useState } from 'react'
import {
  Banknote,
  Building2,
  Check,
  Loader2,
  Smartphone,
  Split,
  X,
} from 'lucide-react'
import { calculateCashSettlement } from '@/lib/calculations/cashSettlement'
import type { PaymentSplit } from './types'

interface PaymentOption {
  id: keyof PaymentSplit
  name: string
  nameAm: string
  icon: 'cash' | 'mobile' | 'bank'
  enabled: boolean
}

/*
 * ============================================================
 * PAYMENT METHODS
 * ============================================================
 *
 * Temporary configuration.
 *
 * Later:
 *
 * Owner settings
 *      ↓
 * Database
 *      ↓
 * IndexedDB
 *      ↓
 * POS
 */

const PAYMENT_METHODS: PaymentOption[] = [
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
    id: 'cbe_birr',
    name: 'CBE Birr',
    nameAm: 'CBE Birr',
    icon: 'mobile',
    enabled: true,
  },
  {
    id: 'awash_bank',
    name: 'Awash Bank',
    nameAm: 'አዋሽ ባንክ',
    icon: 'bank',
    enabled: true,
  },
  {
    id: 'bank_transfer',
    name: 'Bank transfer',
    nameAm: 'የባንክ ዝውውር',
    icon: 'bank',
    enabled: true,
  },
  {
    id: 'credit',
    name: 'Credit',
    nameAm: 'ዱቤ',
    icon: 'bank',
    enabled: true,
  },
  {
    id: 'room_charge',
    name: 'Room charge',
    nameAm: 'ወደ ክፍል ሂሳብ',
    icon: 'bank',
    enabled: true,
  },
]

interface PaymentSelectorProps {
  totalBill: number
  onConfirmPayment: (
    split: PaymentSplit,
    roomNumber?: string,
    debtor?: { name: string; phone: string },
  ) => void | Promise<void>
  isAm: boolean
  isSubmitting?: boolean
  roomChargeEnabled?: boolean
}

type PaymentKey = keyof PaymentSplit

type PaymentAmounts = Record<
  PaymentKey,
  number
>

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const EMPTY_AMOUNTS: PaymentAmounts = {
  cash: 0,
  telebirr: 0,
  cbe_birr: 0,
  awash_bank: 0,
  bank_transfer: 0,
  credit: 0,
  room_charge: 0,
}

const roundMoney = (
  value: number,
) => {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100
}

const clamp = (
  value: number,
  min: number,
  max: number,
) => {
  return Math.min(
    Math.max(value, min),
    max,
  )
}

export default function PaymentSelector({
  totalBill,
  onConfirmPayment,
  isAm,
  isSubmitting = false,
  roomChargeEnabled = false,
}: PaymentSelectorProps) {
  /*
   * ============================================================
   * ENABLED PAYMENT METHODS
   * ============================================================
   */

  const enabledMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((method) =>
        method.enabled && (method.id !== 'room_charge' || roomChargeEnabled),
      ),
    [roomChargeEnabled],
  )

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [amounts, setAmounts] =
    useState<PaymentAmounts>(() => ({
      ...EMPTY_AMOUNTS,
      cash: roundMoney(totalBill),
    }))

  /*
   * IMPORTANT:
   *
   * Array<keyof PaymentSplit>
   *
   * is intentional.
   *
   * Do NOT use:
   *
   * keyof PaymentSplit[]
   */

  const [activeMethods, setActiveMethods] =
    useState<PaymentKey[]>(['cash'])
  const [cashReceivedOverride, setCashReceivedOverride] = useState<string | null>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [roomError, setRoomError] = useState('')
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')

  /*
   * ============================================================
   * ACTIVE PAYMENT METHODS
   * ============================================================
   */

  const activePaymentMethods =
    enabledMethods.filter((method) =>
      activeMethods.includes(method.id),
    )

  /*
   * ============================================================
   * PAID / REMAINING
   * ============================================================
   */

  const paidAmount = useMemo(() => {
    return roundMoney(
      Object.values(amounts).reduce(
        (sum, amount) =>
          sum + Number(amount || 0),
        0,
      ),
    )
  }, [amounts])

  /*
   * Never expose a negative remaining
   * amount to the cashier.
   */

  const remainingAmount = Math.max(
    0,
    roundMoney(
      totalBill - paidAmount,
    ),
  )

  const isBalanced =
    remainingAmount <= 0.009

  const cashReceived = cashReceivedOverride === null
    ? Number(amounts.cash || 0)
    : Math.max(0, Number(cashReceivedOverride) || 0)
  const cashSettlement = calculateCashSettlement(Number(amounts.cash || 0), cashReceived)
  const cashShortfall = cashSettlement.remaining
  const changeDue = cashSettlement.change
  const canSubmit = isBalanced && cashSettlement.isCovered
  const isRoomCharge = activeMethods.includes('room_charge')
  const canConfirmPayment = canSubmit && (!isRoomCharge || roomNumber.trim().length > 0)
    && (Number(amounts.credit || 0) <= 0 || (debtorName.trim().length > 1 && debtorPhone.trim().length >= 7))
  const visibleRemaining = Math.max(remainingAmount, cashShortfall)
  const settlementStatus = cashShortfall > 0.009
    ? 'remaining'
    : changeDue > 0.009
      ? 'change'
      : isBalanced
        ? 'complete'
        : 'remaining'

  /*
   * ============================================================
   * GET ICON
   * ============================================================
   */

  const getIcon = (
    icon: PaymentOption['icon'],
  ) => {
    switch (icon) {
      case 'cash':
        return Banknote

      case 'mobile':
        return Smartphone

      default:
        return Building2
    }
  }

  /*
   * ============================================================
   * ADD PAYMENT METHOD
   * ============================================================
   *
   * When a cashier activates another method:
   *
   * Existing:
   *
   * Cash = 1000
   *
   * Tap Telebirr.
   *
   * Telebirr automatically receives the
   * remaining amount.
   *
   * Existing Cash stays unchanged.
   *
   * If Cash was 600:
   *
   * Cash     = 600
   * Telebirr = 400
   */

  const addPaymentMethod = (
    methodId: PaymentKey,
  ) => {
    if (activeMethods.includes(methodId)) {
      return
    }

    setActiveMethods((current) => [
      ...(methodId === 'room_charge' || current.includes('room_charge') ? [] : current),
      methodId,
    ])
    setCashReceivedOverride(null)

    setAmounts((current) => {
      const currentPaid = roundMoney(
        Object.values(current).reduce(
          (sum, amount) =>
            sum + Number(amount || 0),
          0,
        ),
      )

      const remaining = Math.max(
        0,
        roundMoney(
          totalBill - currentPaid,
        ),
      )

      if (methodId === 'room_charge') {
        return { ...EMPTY_AMOUNTS, room_charge: roundMoney(totalBill) }
      }
      if (activeMethods.includes('room_charge')) {
        return { ...EMPTY_AMOUNTS, [methodId]: roundMoney(totalBill) }
      }
      return { ...current, [methodId]: remaining }
    })
  }

  /*
   * ============================================================
   * REMOVE PAYMENT METHOD
   * ============================================================
   *
   * Its amount is cleared.
   *
   * The cleared amount becomes part of
   * the remaining bill automatically.
   */

  const removePaymentMethod = (
    methodId: PaymentKey,
  ) => {
    if (activeMethods.length <= 1) {
      return
    }

    setActiveMethods((current) =>
      current.filter(
        (id) => id !== methodId,
      ),
    )
    setCashReceivedOverride(null)

    setAmounts((current) => ({
      ...current,
      [methodId]: 0,
    }))
  }

  /*
   * ============================================================
   * CHANGE PAYMENT AMOUNT
   * ============================================================
   *
   * This is the important smart-payment
   * behavior.
   *
   * Example:
   *
   * Bill = 1000
   *
   * Cash     = 1000
   * Telebirr = 0
   *
   * Cash is changed to 700.
   *
   * Telebirr automatically becomes 300.
   *
   * Another example:
   *
   * Cash     = 600
   * Telebirr = 300
   * CBE      = 100
   *
   * Change CBE to 200.
   *
   * The component automatically takes
   * the extra 100 from another active
   * payment method.
   */

  const handleAmountChange = (
    methodId: PaymentKey,
    value: string,
  ) => {
    /*
     * Empty field temporarily becomes zero.
     */

    if (value === '') {
      setAmounts((current) => {
        const next = {
          ...current,
          [methodId]: 0,
        }

        rebalanceAmounts(
          next,
          methodId,
        )

        return next
      })

      return
    }

    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
      return
    }

    const requestedAmount =
      clamp(
        roundMoney(parsed),
        0,
        totalBill,
      )

    setAmounts((current) => {
      const previousAmount =
        current[methodId]

      const difference =
        roundMoney(
          requestedAmount -
            previousAmount,
        )

      const next = {
        ...current,
        [methodId]:
          requestedAmount,
      }

      /*
       * If the user increased this
       * payment, take the difference
       * from other active methods.
       */

      if (difference > 0) {
        let amountToTake = difference

        const otherMethods =
          activeMethods.filter(
            (id) => id !== methodId,
          )

        for (const otherId of otherMethods) {
          if (amountToTake <= 0) {
            break
          }

          const available =
            next[otherId]

          const deduction =
            Math.min(
              available,
              amountToTake,
            )

          next[otherId] =
            roundMoney(
              available - deduction,
            )

          amountToTake =
            roundMoney(
              amountToTake -
                deduction,
            )
        }
      }

      /*
       * If the user decreased this
       * payment, put the freed amount
       * into the next active payment.
       */

      if (difference < 0) {
        const amountToDistribute =
          Math.abs(difference)

        const otherMethods =
          activeMethods.filter(
            (id) => id !== methodId,
          )

        const targetId =
          otherMethods[0]

        if (targetId) {
          next[targetId] =
            roundMoney(
              next[targetId] +
                amountToDistribute,
            )
        }
      }

      /*
       * Final safety normalization.
       */

      rebalanceAmounts(
        next,
        methodId,
      )

      return next
    })
  }

  /*
   * ============================================================
   * REBALANCE
   * ============================================================
   *
   * Makes sure payment allocation never
   * exceeds the bill.
   *
   * It does NOT create an "Overpaid"
   * state.
   */

  const rebalanceAmounts = (
    next: PaymentAmounts,
    changedMethod: PaymentKey,
  ) => {
    const total = roundMoney(
      Object.values(next).reduce(
        (sum, amount) =>
          sum + Number(amount || 0),
        0,
      ),
    )

    if (total <= totalBill) {
      return
    }

    let excess =
      roundMoney(
        total - totalBill,
      )

    /*
     * Take excess from payment methods
     * other than the one the cashier is
     * currently editing.
     */

    const otherMethods =
      activeMethods.filter(
        (id) => id !== changedMethod,
      )

    for (const methodId of otherMethods) {
      if (excess <= 0) {
        break
      }

      const available =
        next[methodId]

      const deduction =
        Math.min(
          available,
          excess,
        )

      next[methodId] =
        roundMoney(
          available - deduction,
        )

      excess =
        roundMoney(
          excess - deduction,
        )
    }

    /*
     * Final fallback:
     *
     * If there is still excess, reduce
     * the edited method itself.
     */

    if (excess > 0) {
      next[changedMethod] =
        roundMoney(
          Math.max(
            0,
            next[changedMethod] -
              excess,
          ),
        )
    }
  }

  /*
   * ============================================================
   * 50 / 50 SPLIT
   * ============================================================
   *
   * Uses the first two enabled methods.
   */

  const handleSplit = () => {
    const methods =
      enabledMethods.filter((method) => method.id !== 'room_charge').slice(0, 2)

    if (methods.length < 2) {
      return
    }

    const first =
      roundMoney(
        Math.floor(
          (totalBill / 2) * 100,
        ) / 100,
      )

    const second =
      roundMoney(
        totalBill - first,
      )

    setActiveMethods([
      methods[0].id,
      methods[1].id,
    ])

    setCashReceivedOverride(null)
    setAmounts({
      ...EMPTY_AMOUNTS,
      [methods[0].id]: first,
      [methods[1].id]: second,
    })
  }

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const submitPayment = async () => {
    /*
     * The button is already disabled when
     * the bill is not fully covered.
     *
     * This is an extra safety check.
     */

    if (!canConfirmPayment || isSubmitting) {
      return
    }

    if (isRoomCharge) {
      setRoomError('')
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setRoomError(isAm ? 'የክፍል ሂሳብን ለማረጋገጥ ኢንተርኔት ያስፈልጋል።' : 'Internet is required to verify a room folio.')
        return
      }
      try {
        const response = await fetch('/api/billing/charge-to-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ validateOnly: true, roomNumber: roomNumber.trim() }),
        })
        const result = await response.json() as { error?: string }
        if (!response.ok) throw new Error(result.error ?? 'This room has no active guest folio.')
      } catch (cause) {
        setRoomError(cause instanceof Error && cause.message !== 'Failed to fetch'
          ? cause.message
          : isAm ? 'ክፍሉን ማረጋገጥ አልተቻለም። ቁጥሩን እና ኢንተርኔትን ያረጋግጡ።' : 'Could not verify the room. Check the number and internet connection.')
        return
      }
    }

    await onConfirmPayment({
      cash: roundMoney(Number(amounts.cash || 0)),
      telebirr: roundMoney(Number(amounts.telebirr || 0)),
      cbe_birr: roundMoney(Number(amounts.cbe_birr || 0)),
      awash_bank: roundMoney(Number(amounts.awash_bank || 0)),
      bank_transfer: roundMoney(Number(amounts.bank_transfer || 0)),
      credit: roundMoney(Number(amounts.credit || 0)),
      room_charge: roundMoney(Number(amounts.room_charge || 0)),
    }, isRoomCharge ? roomNumber.trim() : undefined,
    Number(amounts.credit || 0) > 0
      ? { name: debtorName.trim(), phone: debtorPhone.trim() }
      : undefined)
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="space-y-2.5">

      {/* ====================================================== */}
      {/* AMOUNT DUE */}
      {/* ====================================================== */}

      <div
        className="
          flex items-center justify-between
          rounded-lg
          bg-cream-100
          px-3 py-2
        "
      >
        <div>
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-wider
              text-coffee-400
            "
          >
            {isAm
              ? 'የሚከፈል'
              : 'Amount Due'}
          </p>

          <p
            className="
              text-[9px]
              text-coffee-400
            "
          >
            {activePaymentMethods.length}{' '}
            {isAm
              ? 'የክፍያ ዘዴ'
              : activePaymentMethods.length === 1
                ? 'payment method'
                : 'payment methods'}
          </p>
        </div>

        <div className="text-right">
          <span
            className="
              font-mono
              text-lg
              font-black
              text-berbere-600
            "
          >
            {totalBill.toLocaleString()}
          </span>

          <span
            className="
              ml-1
              text-[9px]
              font-black
              text-coffee-400
            "
          >
            ETB
          </span>
        </div>
      </div>

      {/* ====================================================== */}
      {/* PAYMENT METHODS */}
      {/* ====================================================== */}

      <div>
        <div
          className="
            mb-1.5
            flex
            items-center
            justify-between
          "
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
            {isAm
              ? 'የክፍያ ዘዴ'
              : 'Payment Method'}
          </span>

          {enabledMethods.length >= 2 && (
            <button
              type="button"
              onClick={handleSplit}
              className="
                inline-flex
                items-center
                gap-1
                rounded-md
                px-1.5 py-1
                text-[9px]
                font-black
                text-gold-600
                transition
                hover:bg-gold-50
                active:scale-[0.97]
              "
            >
              <Split className="h-3 w-3" />

              {isAm
                ? '50/50'
                : '50 / 50'}
            </button>
          )}
        </div>

        <div
          className="
            grid
            grid-cols-2
            gap-1.5
            sm:grid-cols-4
          "
        >
          {enabledMethods.map(
            (method) => {
              const Icon =
                getIcon(method.icon)

              const isActive =
                activeMethods.includes(
                  method.id,
                )

              return (
                <button
                  key={method.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    if (isActive) {
                      removePaymentMethod(
                        method.id,
                      )
                    } else {
                      addPaymentMethod(
                        method.id,
                      )
                    }
                  }}
                  className={[
                    'relative flex h-11',
                    'items-center gap-2',
                    'rounded-lg border px-2',
                    'transition-all',
                    'active:scale-[0.98]',
                    isActive
                      ? 'border-berbere-400 bg-berbere-50 text-berbere-700'
                      : 'border-cream-300 bg-cream-50 text-coffee-600 hover:border-berbere-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-7 w-7 shrink-0',
                      'items-center justify-center',
                      'rounded-md',
                      isActive
                        ? 'bg-berbere-500 text-white'
                        : 'bg-cream-100 text-coffee-500',
                    ].join(' ')}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  <span
                    className="
                      min-w-0
                      truncate
                      text-left
                      text-[10px]
                      font-black
                    "
                  >
                    {isAm
                      ? method.nameAm
                      : method.name}
                  </span>

                  {isActive && (
                    <span
                      className="
                        absolute
                        right-1.5
                        top-1.5
                        flex
                        h-3.5
                        w-3.5
                        items-center
                        justify-center
                        rounded-full
                        bg-berbere-500
                        text-white
                      "
                    >
                      <Check className="h-2 w-2" />
                    </span>
                  )}
                </button>
              )
            },
          )}
        </div>
      </div>

      {/* ====================================================== */}
      {/* PAYMENT AMOUNTS */}
      {/* ====================================================== */}

      <div className="space-y-1.5">
        {activePaymentMethods.map(
          (method) => {
            const Icon =
              getIcon(method.icon)

            const amount =
              Number(
                amounts[method.id] || 0,
              )

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
                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                >
                  <span
                    className="
                      flex
                      h-6
                      w-6
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      bg-cream-100
                    "
                  >
                    <Icon
                      className="
                        h-3.5
                        w-3.5
                        text-coffee-500
                      "
                    />
                  </span>

                  <label
                    htmlFor={`payment-${method.id}`}
                    className="
                      min-w-0
                      truncate
                      text-[10px]
                      font-black
                      text-coffee-700
                    "
                  >
                    {isAm
                      ? method.nameAm
                      : method.name}
                  </label>

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

                  {activePaymentMethods.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removePaymentMethod(
                          method.id,
                        )
                      }
                      aria-label={
                        isAm
                          ? `ከ${method.nameAm} ክፍያ ያስወግዱ`
                          : `Remove ${method.name}`
                      }
                      className="
                        ml-1
                        flex
                        h-6
                        w-6
                        items-center
                        justify-center
                        rounded-md
                        text-coffee-400
                        transition
                        hover:bg-cream-100
                        hover:text-berbere-500
                        active:scale-[0.95]
                      "
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative mt-1.5">
                  <input
                    id={`payment-${method.id}`}
                    type="number"
                    min="0"
                    max={totalBill}
                    step="0.01"
                    inputMode="decimal"
                    value={
                      amount === 0
                        ? ''
                        : amount
                    }
                    readOnly={method.id === 'room_charge'}
                    onChange={(event) =>
                      handleAmountChange(
                        method.id,
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                    className="
                      h-11
                      w-full
                      rounded-md
                      border border-cream-300
                      bg-cream-100
                      px-2.5
                      pr-12
                      font-mono
                      text-sm
                      font-black
                      text-coffee-700
                      outline-none
                      transition
                      placeholder:text-coffee-300
                      focus:border-berbere-300
                      focus:bg-cream-50
                      focus:ring-2
                      focus:ring-berbere-100
                    "
                  />

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-2
                      top-1/2
                      -translate-y-1/2
                      text-[9px]
                      font-black
                      text-coffee-400
                    "
                  >
                    ETB
                  </span>
                </div>
              </div>
            )
          },
        )}
      </div>

      {Number(amounts.credit || 0) > 0 && (
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-gold-200 bg-gold-50 p-2 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-coffee-600">
            {isAm ? 'የተበዳሪ ሙሉ ስም' : 'Customer / debtor name'}
            <input value={debtorName} onChange={(event) => setDebtorName(event.target.value)} autoComplete="name" required className="mt-1 h-10 w-full rounded-md border border-cream-300 bg-white px-2 text-sm text-coffee-700" />
          </label>
          <label className="text-[10px] font-bold text-coffee-600">
            {isAm ? 'ስልክ ቁጥር' : 'Phone number'}
            <input value={debtorPhone} onChange={(event) => setDebtorPhone(event.target.value)} inputMode="tel" autoComplete="tel" required className="mt-1 h-10 w-full rounded-md border border-cream-300 bg-white px-2 text-sm text-coffee-700" />
          </label>
          <p className="text-[10px] text-coffee-500 sm:col-span-2">
            {isAm ? 'ያልተከፈለው የደንበኛ ቀሪ ሂሳብ ይመዘገባል።' : 'The unpaid amount will be recorded against this customer.'}
          </p>
        </div>
      )}

      {isRoomCharge && (
        <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2">
          <label htmlFor="room-number" className="mb-1 block text-xs font-black text-coffee-700">
            {isAm ? 'የክፍል ቁጥር' : 'Guest room number'}
          </label>
          <input
            id="room-number"
            type="text"
            value={roomNumber}
            onChange={(event) => setRoomNumber(event.target.value)}
            maxLength={30}
            autoComplete="off"
            placeholder={isAm ? 'ለምሳሌ 101' : 'e.g. 101'}
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg border border-cream-300 bg-cream-100 px-3 text-sm font-bold text-coffee-800 outline-none focus:border-berbere-300 focus:ring-2 focus:ring-berbere-100"
          />
          {roomError && <p role="alert" className="mt-1 text-[10px] font-bold text-danger">{roomError}</p>}
          <p className="mt-1 text-[10px] text-coffee-400">
            {isAm ? 'ይህ ክፍያ በእንግዳው ክፍል ሂሳብ ላይ ይጨመራል። ለማረጋገጥ ኢንተርኔት ያስፈልጋል።' : 'The bill goes to the guest folio. An internet connection is needed to verify it.'}
          </p>
        </div>
      )}

      {activeMethods.includes('cash') && (
        <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2">
          <label htmlFor="cash-received" className="mb-1 block text-xs font-black text-coffee-700">
            {isAm ? 'የተቀበሉት ጥሬ ገንዘብ' : 'Cash received'}
          </label>
          <div className="relative">
            <input
              id="cash-received"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashReceivedOverride ?? (amounts.cash > 0 ? String(amounts.cash) : '')}
              onChange={(event) => setCashReceivedOverride(event.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-cream-300 bg-cream-100 px-3 pr-12 font-mono text-base font-black text-coffee-800 outline-none transition focus:border-berbere-300 focus:bg-cream-50 focus:ring-2 focus:ring-berbere-100 disabled:opacity-60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-coffee-400">ETB</span>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* REMAINING BALANCE */}
      {/* ====================================================== */}

      <div
        aria-live="polite"
        className={[
          'flex items-center justify-between',
          'rounded-lg px-3 py-2',
          settlementStatus === 'complete'
            ? 'bg-success-bg'
            : 'bg-cream-100',
        ].join(' ')}
      >
        <span
          className="
            text-[9px]
            font-black
            uppercase
            tracking-wide
            text-coffee-500
          "
        >
          {settlementStatus === 'change'
            ? isAm ? 'ቀይር' : 'Change'
            : settlementStatus === 'complete'
              ? isAm ? 'ክፍያ ሙሉ' : 'Paid in full'
              : isAm ? 'ቀሪ ክፍያ' : 'Remaining'}
        </span>

        <span
          className={[
            'font-mono',
            'text-sm',
            'font-black',
            settlementStatus === 'complete'
              ? 'text-success'
              : settlementStatus === 'change'
                ? 'text-success'
                : 'text-coffee-600',
          ].join(' ')}
        >
          {(settlementStatus === 'change' ? changeDue : visibleRemaining).toLocaleString()}

          <span className="ml-1 text-[9px]">
            ETB
          </span>
        </span>
      </div>

      {/* ====================================================== */}
      {/* COMPLETE PAYMENT */}
      {/* ====================================================== */}

      <button
        type="button"
        onClick={submitPayment}
        disabled={!canConfirmPayment || isSubmitting}
        className="
          flex
          h-11
          w-full
          items-center
          justify-center
          gap-2
          rounded-lg
          bg-berbere-500
          px-3
          text-sm
          font-black
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
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-gold-300" />
        )}

        <span>
          {isSubmitting
            ? isAm ? 'በማስቀመጥ ላይ...' : 'Saving sale...'
            : isAm
            ? 'ክፍያውን ጨርስ'
            : 'Complete Payment'}
        </span>

        <span
          className="
            font-mono
            text-[10px]
            text-gold-200
          "
        >
          {totalBill.toLocaleString()} ETB
        </span>
      </button>
    </div>
  )
}

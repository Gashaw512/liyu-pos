
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Building2,
  Check,
  Smartphone,
  Split,
  X,
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
  cbeBirr: 0,
  awash: 0,
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
}: PaymentSelectorProps) {
  /*
   * ============================================================
   * ENABLED PAYMENT METHODS
   * ============================================================
   */

  const enabledMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter(
        (method) => method.enabled,
      ),
    [],
  )

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [amounts, setAmounts] =
    useState<PaymentAmounts>(
      EMPTY_AMOUNTS,
    )

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

  /*
   * ============================================================
   * INITIAL PAYMENT
   * ============================================================
   *
   * Every new bill starts as 100% Cash.
   */

  useEffect(() => {
    const firstMethod =
      enabledMethods[0]?.id

    if (!firstMethod) {
      setAmounts(EMPTY_AMOUNTS)
      setActiveMethods([])
      return
    }

    setAmounts({
      cash:
        firstMethod === 'cash'
          ? roundMoney(totalBill)
          : 0,

      telebirr:
        firstMethod === 'telebirr'
          ? roundMoney(totalBill)
          : 0,

      cbeBirr:
        firstMethod === 'cbeBirr'
          ? roundMoney(totalBill)
          : 0,

      awash:
        firstMethod === 'awash'
          ? roundMoney(totalBill)
          : 0,
    })

    setActiveMethods([firstMethod])
  }, [totalBill, enabledMethods])

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

  /*
   * ============================================================
   * GET ICON
   * ============================================================
   */

  const getIcon = (
    icon: PaymentMethod['icon'],
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
      ...current,
      methodId,
    ])

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

      return {
        ...current,
        [methodId]: remaining,
      }
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
      enabledMethods.slice(0, 2)

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

    setAmounts({
      cash:
        methods[0].id === 'cash'
          ? first
          : methods[1].id === 'cash'
            ? second
            : 0,

      telebirr:
        methods[0].id === 'telebirr'
          ? first
          : methods[1].id === 'telebirr'
            ? second
            : 0,

      cbeBirr:
        methods[0].id === 'cbeBirr'
          ? first
          : methods[1].id === 'cbeBirr'
            ? second
            : 0,

      awash:
        methods[0].id === 'awash'
          ? first
          : methods[1].id === 'awash'
            ? second
            : 0,
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

    if (!isBalanced) {
      return
    }

    await onConfirmPayment({
      cash: roundMoney(
        Number(amounts.cash || 0),
      ),

      telebirr: roundMoney(
        Number(amounts.telebirr || 0),
      ),

      cbeBirr: roundMoney(
        Number(amounts.cbeBirr || 0),
      ),

      awash: roundMoney(
        Number(amounts.awash || 0),
      ),
    })
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
                    onChange={(event) =>
                      handleAmountChange(
                        method.id,
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                    className="
                      h-9
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

      {/* ====================================================== */}
      {/* REMAINING BALANCE */}
      {/* ====================================================== */}

      <div
        className={[
          'flex items-center justify-between',
          'rounded-lg px-3 py-2',
          isBalanced
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
          {isBalanced
            ? isAm
              ? 'ክፍያ ሙሉ'
              : 'Payment complete'
            : isAm
              ? 'ቀሪ ክፍያ'
              : 'Remaining'}
        </span>

        <span
          className={[
            'font-mono',
            'text-sm',
            'font-black',
            isBalanced
              ? 'text-success'
              : 'text-coffee-600',
          ].join(' ')}
        >
          {remainingAmount.toLocaleString()}

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
        disabled={!isBalanced}
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
        <Check
          className="
            h-4
            w-4
            text-gold-300
          "
        />

        <span>
          {isAm
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

'use client'

import {
  useState,
} from 'react'

import {
  Save,
  X,
} from 'lucide-react'

import type { Expense } from './expenseTypes'

interface ExpenseActionResult {
  success: boolean
  error?: string
}

type ExpenseAction = (
  formData: FormData,
) => Promise<ExpenseActionResult>

interface ExpenseEditModalProps {
  expense: Expense | null
  onClose: () => void
  action: ExpenseAction
  isAm: boolean
}

const CATEGORIES = [
  {
    value: 'Rent',
    en: 'Rent',
    am: 'ኪራይ',
  },
  {
    value: 'Utilities',
    en: 'Utilities',
    am: 'መብራት / ውሃ',
  },
  {
    value: 'Salary',
    en: 'Salary',
    am: 'ደመወዝ',
  },
  {
    value: 'Transport',
    en: 'Transport',
    am: 'መጓጓዣ',
  },
  {
    value: 'Supplies',
    en: 'Supplies',
    am: 'አቅርቦት',
  },
  {
    value: 'Maintenance',
    en: 'Maintenance',
    am: 'ጥገና',
  },
  {
    value: 'Marketing',
    en: 'Marketing',
    am: 'ማስታወቂያ',
  },
  {
    value: 'Other',
    en: 'Other',
    am: 'ሌላ',
  },
]

const PAYMENT_METHODS = [
  {
    value: 'cash',
    en: 'Cash',
    am: 'ጥሬ ገንዘብ',
  },
  {
    value: 'telebirr',
    en: 'Telebirr',
    am: 'ቴሌብር',
  },
  {
    value: 'cbe_birr',
    en: 'CBE Birr',
    am: 'CBE ብር',
  },
  {
    value: 'bank_transfer',
    en: 'Bank Transfer',
    am: 'የባንክ ማስተላለፍ',
  },
  {
    value: 'other',
    en: 'Other',
    am: 'ሌላ',
  },
]

export default function ExpenseEditModal({
  expense,
  onClose,
  action,
  isAm,
}: ExpenseEditModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // ============================================================
  // DON'T RENDER WITHOUT AN EXPENSE
  // ============================================================

  if (!expense) {
    return null
  }

  // ============================================================
  // TRANSLATION
  // ============================================================

  const t = (en: string, am: string) =>
    isAm ? am : en

  // ============================================================
  // EXPENSE DATE
  // ============================================================

  const expenseDate = expense.expense_date
    ? String(expense.expense_date).slice(0, 10)
    : ''

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (isSaving) {
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const formData = new FormData(
        event.currentTarget,
      )

      const result = await action(formData)

      if (!result.success) {
        setError(
          result.error ??
            t(
              'Failed to update expense.',
              'ወጪውን ማስተካከል አልተቻለም።',
            ),
        )

        return
      }

      // ========================================================
      // SUCCESS
      // ========================================================

      onClose()
    } catch (error) {
      console.error(
        '[EXPENSE EDIT] Failed to update expense:',
        error,
      )

      setError(
        t(
          'Something went wrong. Please try again.',
          'አንድ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        overflow-y-auto
        bg-black/40
        p-4
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="
          w-full
          max-w-lg
          rounded-2xl
          bg-white
          p-5
          shadow-xl
        "
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-coffee-900">
              {t(
                'Edit Expense',
                'ወጪ አርትዕ',
              )}
            </h2>

            <p className="mt-1 text-xs text-coffee-400">
              {t(
                'Update the expense details below.',
                'የወጪውን መረጃ ከታች ያስተካክሉ።',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-coffee-400
              hover:bg-coffee-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            aria-label={t(
              'Close',
              'ዝጋ',
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <input
            type="hidden"
            name="expense_id"
            value={expense.id}
          />

          {/* ====================================================
              ERROR
          ==================================================== */}

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-3
                py-2.5
                text-xs
                font-semibold
                text-red-700
              "
            >
              {error}
            </div>
          )}

          {/* ====================================================
              CATEGORY
          ==================================================== */}

          <div>
            <label
              htmlFor="edit-category"
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.08em]
                text-coffee-500
              "
            >
              {t(
                'Category',
                'የወጪ አይነት',
              )}
            </label>

            <select
              id="edit-category"
              name="category"
              required
              defaultValue={
                expense.category ?? ''
              }
              disabled={isSaving}
              className="
                mt-1.5
                w-full
                rounded-xl
                border
                border-coffee-200
                bg-white
                px-3
                py-2.5
                text-sm
                font-semibold
                text-coffee-900
                outline-none
                focus:border-berbere-400
                disabled:cursor-not-allowed
                disabled:bg-coffee-50
              "
            >
              {CATEGORIES.map((category) => (
                <option
                  key={category.value}
                  value={category.value}
                >
                  {isAm
                    ? category.am
                    : category.en}
                </option>
              ))}
            </select>
          </div>

          {/* ====================================================
              AMOUNT
          ==================================================== */}

          <div>
            <label
              htmlFor="edit-amount"
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.08em]
                text-coffee-500
              "
            >
              {t(
                'Amount',
                'መጠን',
              )}
            </label>

            <div
              className="
                mt-1.5
                flex
                overflow-hidden
                rounded-xl
                border
                border-coffee-200
                bg-white
                focus-within:border-berbere-400
              "
            >
              <input
                id="edit-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                inputMode="decimal"
                defaultValue={Number(
                  expense.amount ?? 0,
                ).toFixed(2)}
                disabled={isSaving}
                className="
                  w-full
                  bg-transparent
                  px-3
                  py-2.5
                  text-sm
                  font-bold
                  text-coffee-900
                  outline-none
                  disabled:bg-coffee-50
                "
              />

              <span
                className="
                  flex
                  items-center
                  border-l
                  border-coffee-100
                  px-3
                  text-[10px]
                  font-black
                  text-coffee-400
                "
              >
                ETB
              </span>
            </div>
          </div>

          {/* ====================================================
              PAYMENT METHOD
          ==================================================== */}

          <div>
            <label
              htmlFor="edit-payment-method"
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.08em]
                text-coffee-500
              "
            >
              {t(
                'Payment',
                'ክፍያ',
              )}
            </label>

            <select
              id="edit-payment-method"
              name="payment_method"
              defaultValue={
                expense.payment_method ||
                'cash'
              }
              disabled={isSaving}
              className="
                mt-1.5
                w-full
                rounded-xl
                border
                border-coffee-200
                bg-white
                px-3
                py-2.5
                text-sm
                font-semibold
                text-coffee-900
                outline-none
                focus:border-berbere-400
                disabled:cursor-not-allowed
                disabled:bg-coffee-50
              "
            >
              {PAYMENT_METHODS.map((method) => (
                <option
                  key={method.value}
                  value={method.value}
                >
                  {isAm
                    ? method.am
                    : method.en}
                </option>
              ))}
            </select>
          </div>

          {/* ====================================================
              DATE
          ==================================================== */}

          <div>
            <label
              htmlFor="edit-expense-date"
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.08em]
                text-coffee-500
              "
            >
              {t(
                'Date',
                'ቀን',
              )}
            </label>

            <input
              id="edit-expense-date"
              name="expense_date"
              type="date"
              required
              defaultValue={expenseDate}
              disabled={isSaving}
              className="
                mt-1.5
                w-full
                rounded-xl
                border
                border-coffee-200
                bg-white
                px-3
                py-2.5
                text-sm
                font-semibold
                text-coffee-900
                outline-none
                focus:border-berbere-400
                disabled:cursor-not-allowed
                disabled:bg-coffee-50
              "
            />
          </div>

          {/* ====================================================
              DESCRIPTION
          ==================================================== */}

          <div>
            <label
              htmlFor="edit-description"
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.08em]
                text-coffee-500
              "
            >
              {t(
                'Description',
                'ማብራሪያ',
              )}
            </label>

            <input
              id="edit-description"
              name="description"
              type="text"
              maxLength={500}
              defaultValue={
                expense.description || ''
              }
              placeholder={t(
                'Example: Cleaning materials',
                'ምሳሌ፦ የጽዳት እቃዎች',
              )}
              disabled={isSaving}
              className="
                mt-1.5
                w-full
                rounded-xl
                border
                border-coffee-200
                bg-white
                px-3
                py-2.5
                text-sm
                font-medium
                text-coffee-900
                outline-none
                placeholder:text-coffee-300
                focus:border-berbere-400
                disabled:cursor-not-allowed
                disabled:bg-coffee-50
              "
            />
          </div>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="
                flex-1
                rounded-xl
                border
                border-coffee-200
                px-4
                py-2.5
                text-sm
                font-black
                text-coffee-700
                hover:bg-coffee-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {t(
                'Cancel',
                'ሰርዝ',
              )}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="
                flex
                flex-1
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-berbere-600
                px-4
                py-2.5
                text-sm
                font-black
                text-white
                transition
                hover:bg-berbere-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <Save className="h-4 w-4" />

              {isSaving
                ? t(
                    'Saving...',
                    'በማስቀመጥ ላይ...',
                  )
                : t(
                    'Save Changes',
                    'ለውጥ አስቀምጥ',
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
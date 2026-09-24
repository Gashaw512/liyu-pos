'use client'

import {
  useState,
} from 'react'

import {
  Plus,
} from 'lucide-react'

interface ExpenseActionResult {
  success: boolean
  error?: string
}

type ExpenseAction = (
  formData: FormData,
) => Promise<ExpenseActionResult>

interface ExpenseFormProps {
  action: ExpenseAction
  today: string
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
    am: 'ማስተዋወቂያ',
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

export default function ExpenseForm({
  action,
  today,
  isAm,
}: ExpenseFormProps) {
  const [isSaving, setIsSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState(false)

  const t = (
    en: string,
    am: string,
  ) => isAm ? am : en

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
    setSuccess(false)
    setIsSaving(true)

    try {
      const form = event.currentTarget

      const formData = new FormData(form)

      const result = await action(formData)

      if (!result.success) {
        setError(
          result.error ??
            t(
              'Failed to record expense.',
              'ወጪውን መመዝገብ አልተቻለም።',
            ),
        )

        return
      }

      // ========================================================
      // SUCCESS
      // ========================================================

      setSuccess(true)

      // Reset the form after successful save.
      form.reset()

      // Restore the default date.
      const dateInput =
        form.elements.namedItem(
          'expense_date',
        ) as HTMLInputElement | null

      if (dateInput) {
        dateInput.value = today
      }

      // Hide success message after a short time.
      window.setTimeout(() => {
        setSuccess(false)
      }, 2500)
    } catch (error) {
      console.error(
        '[EXPENSE FORM] Failed to create expense:',
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
    <section
      className="
        rounded-2xl
        border
        border-coffee-100
        bg-white
        p-5
        shadow-sm
      "
    >
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex items-center gap-3">
        <div
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-xl
            bg-berbere-50
          "
        >
          <Plus className="h-4 w-4 text-berbere-600" />
        </div>

        <div>
          <h2 className="text-sm font-black text-coffee-900">
            {t(
              'Record Expense',
              'ወጪ መዝግብ',
            )}
          </h2>

          <p className="mt-0.5 text-[10px] text-coffee-400">
            {t(
              'Enter the money spent by your business.',
              'ንግድዎ ያወጣውን ገንዘብ ይመዝግቡ።',
            )}
          </p>
        </div>
      </div>

      {/* ========================================================
          FORM
      ======================================================== */}

      <form
        onSubmit={handleSubmit}
        className="
          mt-5
          grid
          gap-4
          md:grid-cols-2
          lg:grid-cols-4
        "
      >
        {/* ======================================================
            ERROR / SUCCESS
        ====================================================== */}

        {(error || success) && (
          <div className="md:col-span-2 lg:col-span-4">
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

            {success && (
              <div
                className="
                  rounded-xl
                  border
                  border-green-200
                  bg-green-50
                  px-3
                  py-2.5
                  text-xs
                  font-semibold
                  text-green-700
                "
              >
                {t(
                  'Expense recorded successfully.',
                  'ወጪው በተሳካ ሁኔታ ተመዝግቧል።',
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            CATEGORY
        ====================================================== */}

        <div>
          <label
            htmlFor="category"
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
            id="category"
            name="category"
            required
            defaultValue=""
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
            <option value="" disabled>
              {t(
                'Select category',
                'የወጪ አይነት ይምረጡ',
              )}
            </option>

            {CATEGORIES.map(category => (
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

        {/* ======================================================
            AMOUNT
        ====================================================== */}

        <div>
          <label
            htmlFor="amount"
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
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              inputMode="decimal"
              placeholder="0.00"
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

        {/* ======================================================
            PAYMENT METHOD
        ====================================================== */}

        <div>
          <label
            htmlFor="payment_method"
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
            id="payment_method"
            name="payment_method"
            defaultValue="cash"
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
            {PAYMENT_METHODS.map(method => (
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

        {/* ======================================================
            DATE
        ====================================================== */}

        <div>
          <label
            htmlFor="expense_date"
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
            id="expense_date"
            name="expense_date"
            type="date"
            required
            defaultValue={today}
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

        {/* ======================================================
            DESCRIPTION
        ====================================================== */}

        <div className="md:col-span-2 lg:col-span-3">
          <label
            htmlFor="description"
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
            id="description"
            name="description"
            type="text"
            maxLength={500}
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

        {/* ======================================================
            SUBMIT BUTTON
        ====================================================== */}

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSaving}
            className="
              flex
              w-full
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
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <Plus className="h-4 w-4" />

            {isSaving
              ? t(
                  'Saving...',
                  'በመመዝገብ ላይ...',
                )
              : t(
                  'Record Expense',
                  'ወጪ መዝግብ',
                )}
          </button>
        </div>
      </form>
    </section>
  )
}

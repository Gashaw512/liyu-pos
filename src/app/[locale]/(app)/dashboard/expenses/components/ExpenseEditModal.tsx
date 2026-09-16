'use client'

import {
  X,
} from 'lucide-react'

import type { Expense } from './expenseTypes'

interface ExpenseEditModalProps {
  expense: Expense | null
  onClose: () => void
  isAm: boolean
}

export default function ExpenseEditModal({
  expense,
  onClose,
  isAm,
}: ExpenseEditModalProps) {
  if (!expense) {
    return null
  }

  const t = (en: string, am: string) =>
    isAm ? am : en

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/40
        p-4
      "
      onMouseDown={onClose}
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
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
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
                'Editing will be enabled in Step 2.',
                'ማስተካከያ በደረጃ 2 ይከፈታል።',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-coffee-400
              hover:bg-coffee-50
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-coffee-50 p-3">
            <p className="text-xs font-bold text-coffee-900">
              {expense.category}
            </p>

            <p className="mt-1 text-xs text-coffee-500">
              {expense.description ||
                t(
                  'No description',
                  'ማብራሪያ የለም',
                )}
            </p>

            <p className="mt-2 text-sm font-black text-red-700">
              {Number(
                expense.amount ?? 0,
              ).toLocaleString(
                isAm
                  ? 'am-ET'
                  : 'en-ET',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}{' '}
              ETB
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            mt-5
            w-full
            rounded-xl
            border
            border-coffee-200
            px-4
            py-2.5
            text-sm
            font-black
            text-coffee-700
            hover:bg-coffee-50
          "
        >
          {t('Close', 'ዝጋ')}
        </button>
      </div>
    </div>
  )
}
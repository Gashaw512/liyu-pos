'use client'

import {
  Search,
  X,
} from 'lucide-react'

interface ExpenseFiltersProps {
  search: string
  category: string
  payment: string
  date: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onPaymentChange: (value: string) => void
  onDateChange: (value: string) => void
  onClear: () => void
  isAm: boolean
}

const categories = [
  'Rent',
  'Utilities',
  'Salary',
  'Transport',
  'Supplies',
  'Maintenance',
  'Marketing',
  'Other',
]

const payments = [
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
    am: 'ባንክ',
  },
  {
    value: 'other',
    en: 'Other',
    am: 'ሌላ',
  },
]

export default function ExpenseFilters({
  search,
  category,
  payment,
  date,
  onSearchChange,
  onCategoryChange,
  onPaymentChange,
  onDateChange,
  onClear,
  isAm,
}: ExpenseFiltersProps) {
  const t = (en: string, am: string) =>
    isAm ? am : en

  const hasFilters =
    search ||
    category ||
    payment ||
    date

  return (
    <div className="border-b border-coffee-100 bg-coffee-50/40 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              h-4
              w-4
              -translate-y-1/2
              text-coffee-300
            "
          />

          <input
            value={search}
            onChange={e =>
              onSearchChange(e.target.value)
            }
            placeholder={t(
              'Search expenses...',
              'ወጪ ይፈልጉ...',
            )}
            className="
              w-full
              rounded-xl
              border
              border-coffee-200
              bg-white
              py-2.5
              pl-9
              pr-3
              text-sm
              text-coffee-900
              outline-none
              focus:border-berbere-400
            "
          />
        </div>

        <select
          value={category}
          onChange={e =>
            onCategoryChange(e.target.value)
          }
          className="
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
          "
        >
          <option value="">
            {t('All categories', 'ሁሉም አይነቶች')}
          </option>

          {categories.map(item => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <select
          value={payment}
          onChange={e =>
            onPaymentChange(e.target.value)
          }
          className="
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
          "
        >
          <option value="">
            {t('All payments', 'ሁሉም ክፍያዎች')}
          </option>

          {payments.map(item => (
            <option
              key={item.value}
              value={item.value}
            >
              {isAm ? item.am : item.en}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e =>
              onDateChange(e.target.value)
            }
            className="
              min-w-0
              flex-1
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
            "
          />

          {hasFilters ? (
            <button
              type="button"
              onClick={onClear}
              title={t('Clear filters', 'ማጣሪያ አጥፋ')}
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-coffee-200
                bg-white
                text-coffee-400
                transition
                hover:bg-red-50
                hover:text-red-600
              "
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
'use client'

import {
  CalendarDays,
  Receipt,
  Wallet,
} from 'lucide-react'

interface ExpenseSummaryProps {
  todayExpenses: number
  monthExpenses: number
  totalExpenses: number
//   formatMoney: (value: number) => string
  isAm: boolean
}

export default function ExpenseSummary({
  todayExpenses,
  monthExpenses,
  totalExpenses,
  // formatMoney,
  isAm,
}: ExpenseSummaryProps) {
  const t = (en: string, am: string) =>
    isAm ? am : en

  const cards = [
    {
      label: t("Today's Expenses", 'የዛሬ ወጪ'),
      value: todayExpenses,
      icon: CalendarDays,
      valueClass: 'text-red-700',
      iconClass: 'bg-red-50 text-red-600',
    },
    {
      label: t("This Month", 'የዚህ ወር'),
      value: monthExpenses,
      icon: Receipt,
      valueClass: 'text-coffee-900',
      iconClass: 'bg-coffee-50 text-coffee-700',
    },
    {
      label: t('All Active Expenses', 'ሁሉም ወጪዎች'),
      value: totalExpenses,
      icon: Wallet,
      valueClass: 'text-coffee-900',
      iconClass: 'bg-berbere-50 text-berbere-700',
    },
  ]


const formatMoney = (value: number) =>
  value.toLocaleString(
    isAm ? 'am-ET' : 'en-ET',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )


  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {cards.map(card => {
        const Icon = card.icon

        return (
          <div
            key={card.label}
            className="
              rounded-2xl
              border
              border-coffee-100
              bg-white
              p-4
              shadow-sm
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-coffee-400
                  "
                >
                  {card.label}
                </p>

                <p
                  className={`
                    mt-2
                    text-xl
                    font-black
                    ${card.valueClass}
                  `}
                >
                  {formatMoney(card.value)}
                </p>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    font-medium
                    text-coffee-400
                  "
                >
                  ETB
                </p>
              </div>

              <div
                className={`
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  ${card.iconClass}
                `}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}

'use client'

import {
  Edit3,
  Receipt,
} from 'lucide-react'

import type { Expense } from './expenseTypes'
import ExpenseDeleteButton from './ExpenseDeleteButton'

interface ExpenseTableProps {
  expenses: Expense[]
  deleteAction: (
    formData: FormData,
  ) => void | Promise<void>
  onEdit: (expense: Expense) => void
  isAm: boolean
}

export default function ExpenseTable({
  expenses,
  deleteAction,
  onEdit,
  isAm,
}: ExpenseTableProps) {
  // ============================================================
  // TRANSLATION
  // ============================================================

  const t = (en: string, am: string) =>
    isAm ? am : en

  // ============================================================
  // PAYMENT LABEL
  // ============================================================

  const paymentLabel = (
    payment: string | null | undefined,
  ) => {
    switch (payment) {
      case 'telebirr':
        return 'Telebirr'

      case 'cbe_birr':
        return 'CBE Birr'

      case 'bank_transfer':
        return t(
          'Bank Transfer',
          'የባንክ ማስተላለፍ',
        )

      case 'other':
        return t(
          'Other',
          'ሌላ',
        )

      case 'cash':
      default:
        return t(
          'Cash',
          'ጥሬ ገንዘብ',
        )
    }
  }

  // ============================================================
  // MONEY FORMATTER
  // ============================================================

  const formatMoney = (value: number) =>
    value.toLocaleString(
      isAm ? 'am-ET' : 'en-ET',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )

  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (!expenses || expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
        <Receipt className="h-9 w-9 text-coffee-200" />

        <p className="mt-3 text-sm font-black text-coffee-700">
          {t(
            'No expenses found',
            'ምንም ወጪ አልተገኘም',
          )}
        </p>

        <p className="mt-1 text-xs text-coffee-400">
          {t(
            'Try changing your filters.',
            'ማጣሪያዎችን ይቀይሩ።',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* ========================================================
          DESKTOP TABLE
      ======================================================== */}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-coffee-100 bg-coffee-50/50">
              <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Date', 'ቀን')}
              </th>

              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Category', 'አይነት')}
              </th>

              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Description', 'ማብራሪያ')}
              </th>

              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Payment', 'ክፍያ')}
              </th>

              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Amount', 'መጠን')}
              </th>

              <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                {t('Action', 'ተግባር')}
              </th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="
                  border-b
                  border-coffee-100
                  transition
                  hover:bg-coffee-50/60
                "
              >
                {/* DATE */}

                <td className="px-5 py-4 text-xs font-semibold text-coffee-600">
                  {expense.expense_date || '—'}
                </td>

                {/* CATEGORY */}

                <td className="px-4 py-4">
                  <span className="inline-flex rounded-lg bg-berbere-50 px-2.5 py-1 text-xs font-bold text-berbere-700">
                    {expense.category || '—'}
                  </span>
                </td>

                {/* DESCRIPTION */}

                <td className="max-w-[240px] px-4 py-4">
                  <p className="truncate text-xs font-medium text-coffee-700">
                    {expense.description ||
                      t(
                        'No description',
                        'ማብራሪያ የለም',
                      )}
                  </p>
                </td>

                {/* PAYMENT */}

                <td className="px-4 py-4 text-xs font-semibold text-coffee-600">
                  {paymentLabel(
                    expense.payment_method,
                  )}
                </td>

                {/* AMOUNT */}

                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-black text-red-700">
                    {formatMoney(
                      Number(
                        expense.amount ?? 0,
                      ),
                    )}{' '}
                    ETB
                  </span>
                </td>

                {/* ACTIONS */}

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onEdit(expense)
                      }
                      title={t(
                        'Edit expense',
                        'ወጪ አርትዕ',
                      )}
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-xl
                        text-coffee-300
                        transition
                        hover:bg-coffee-100
                        hover:text-coffee-700
                      "
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <ExpenseDeleteButton
                      expenseId={expense.id}
                      action={deleteAction}
                      isAm={isAm}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MOBILE LIST
      ======================================================== */}

      <div className="mt-4 divide-y divide-coffee-100 border-t border-coffee-100 md:hidden">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-berbere-50 px-2.5 py-1 text-[11px] font-bold text-berbere-700">
                    {expense.category || '—'}
                  </span>

                  <span className="text-[10px] font-medium text-coffee-400">
                    {expense.expense_date || '—'}
                  </span>
                </div>

                <p className="mt-2 truncate text-xs font-medium text-coffee-600">
                  {expense.description ||
                    t(
                      'No description',
                      'ማብራሪያ የለም',
                    )}
                </p>

                <p className="mt-1 text-[10px] font-medium text-coffee-400">
                  {paymentLabel(
                    expense.payment_method,
                  )}
                </p>
              </div>

              <p className="shrink-0 text-sm font-black text-red-700">
                {formatMoney(
                  Number(
                    expense.amount ?? 0,
                  ),
                )}{' '}
                ETB
              </p>
            </div>

            <div className="mt-3 flex justify-end gap-1">
              <button
                type="button"
                onClick={() =>
                  onEdit(expense)
                }
                className="
                  flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-xl
                  px-3
                  text-xs
                  font-bold
                  text-coffee-500
                  hover:bg-coffee-50
                "
              >
                <Edit3 className="h-3.5 w-3.5" />

                {t(
                  'Edit',
                  'አርትዕ',
                )}
              </button>

              <ExpenseDeleteButton
                expenseId={expense.id}
                action={deleteAction}
                isAm={isAm}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}













// for mobile view, we can use a card layout instead of a table layout. Each expense will be displayed in a card with the category, date, description, payment method, and amount. The edit and delete buttons will be placed at the bottom of each card for easy access.






// 'use client'

// import {
//   Edit3,
//   Receipt,
// } from 'lucide-react'

// import type { Expense } from './expenseTypes'
// import ExpenseDeleteButton from './ExpenseDeleteButton'

// interface ExpenseTableProps {
//   expenses: Expense[]
//   deleteAction: (
//     formData: FormData,
//   ) => void | Promise<void>
//   onEdit: (expense: Expense) => void
//   isAm: boolean
// }

// export default function ExpenseTable({
//   expenses,
//   deleteAction,
//   onEdit,
//   isAm,
// }: ExpenseTableProps) {
//   // ============================================================
//   // TRANSLATION
//   // ============================================================

//   const t = (en: string, am: string) =>
//     isAm ? am : en

//   // ============================================================
//   // PAYMENT LABEL
//   // ============================================================

//   const paymentLabel = (
//     payment: string | null | undefined,
//   ) => {
//     switch (payment) {
//       case 'telebirr':
//         return 'Telebirr'

//       case 'cbe_birr':
//         return 'CBE Birr'

//       case 'bank_transfer':
//         return t(
//           'Bank Transfer',
//           'የባንክ ማስተላለፍ',
//         )

//       case 'other':
//         return t(
//           'Other',
//           'ሌላ',
//         )

//       case 'cash':
//       default:
//         return t(
//           'Cash',
//           'ጥሬ ገንዘብ',
//         )
//     }
//   }

//   // ============================================================
//   // MONEY FORMATTER
//   // ============================================================

//   const formatMoney = (value: number) =>
//     value.toLocaleString(
//       isAm ? 'am-ET' : 'en-ET',
//       {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//       },
//     )

//   // ============================================================
//   // EMPTY STATE
//   // ============================================================

//   if (!expenses || expenses.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
//         <Receipt className="h-9 w-9 text-coffee-200" />

//         <p className="mt-3 text-sm font-black text-coffee-700">
//           {t(
//             'No expenses found',
//             'ምንም ወጪ አልተገኘም',
//           )}
//         </p>

//         <p className="mt-1 text-xs text-coffee-400">
//           {t(
//             'Try changing your filters.',
//             'ማጣሪያዎችን ይቀይሩ።',
//           )}
//         </p>
//       </div>
//     )
//   }

//   // ============================================================
//   // RESPONSIVE EXPENSE LIST
//   // ============================================================

//   return (
//     <div className="w-full">

//       {expenses.map((expense) => {
//         const amount = Number(
//           expense.amount ?? 0,
//         )

//         return (
//           <div
//             key={expense.id}
//             className="
//               w-full
//               border-b
//               border-coffee-100
//               px-3
//               py-3
//               sm:px-4
//               sm:py-4
//             "
//           >

//             {/* ==================================================
//                 MAIN ROW
//             ================================================== */}

//             <div className="flex w-full items-start gap-3">

//               {/* LEFT SIDE */}
//               <div className="min-w-0 flex-1">

//                 {/* Category + Date */}
//                 <div className="flex min-w-0 items-center gap-2">

//                   <span
//                     className="
//                       max-w-[55%]
//                       truncate
//                       rounded-lg
//                       bg-berbere-50
//                       px-2
//                       py-1
//                       text-[10px]
//                       font-bold
//                       text-berbere-700
//                       sm:text-xs
//                     "
//                   >
//                     {expense.category || '—'}
//                   </span>

//                   <span
//                     className="
//                       shrink-0
//                       text-[10px]
//                       font-medium
//                       text-coffee-400
//                       sm:text-xs
//                     "
//                   >
//                     {expense.expense_date || '—'}
//                   </span>

//                 </div>

//                 {/* Description */}
//                 <p
//                   className="
//                     mt-1.5
//                     break-words
//                     text-xs
//                     font-semibold
//                     leading-5
//                     text-coffee-700
//                     sm:text-sm
//                   "
//                 >
//                   {expense.description ||
//                     t(
//                       'No description',
//                       'ማብራሪያ የለም',
//                     )}
//                 </p>

//                 {/* Payment */}
//                 <p
//                   className="
//                     mt-0.5
//                     text-[10px]
//                     font-medium
//                     text-coffee-400
//                     sm:text-xs
//                   "
//                 >
//                   {paymentLabel(
//                     expense.payment_method,
//                   )}
//                 </p>

//               </div>

//               {/* ==================================================
//                   AMOUNT
//               ================================================== */}

//               <div className="shrink-0 text-right">

//                 <p
//                   className="
//                     whitespace-nowrap
//                     text-sm
//                     font-black
//                     text-red-700
//                     sm:text-base
//                   "
//                 >
//                   {formatMoney(amount)}
//                 </p>

//                 <p className="text-[9px] font-bold text-coffee-400">
//                   ETB
//                 </p>

//               </div>

//             </div>

//             {/* ==================================================
//                 ACTIONS
//             ================================================== */}

//             <div className="mt-2 flex justify-end gap-1">

//               <button
//                 type="button"
//                 onClick={() =>
//                   onEdit(expense)
//                 }
//                 title={t(
//                   'Edit expense',
//                   'ወጪ አርትዕ',
//                 )}
//                 className="
//                   flex
//                   h-8
//                   items-center
//                   gap-1.5
//                   rounded-lg
//                   px-2.5
//                   text-[11px]
//                   font-bold
//                   text-coffee-500
//                   transition
//                   hover:bg-coffee-50
//                   active:bg-coffee-100
//                   sm:h-9
//                   sm:px-3
//                   sm:text-xs
//                 "
//               >
//                 <Edit3 className="h-3.5 w-3.5" />

//                 {t(
//                   'Edit',
//                   'አርትዕ',
//                 )}
//               </button>

//               <ExpenseDeleteButton
//                 expenseId={expense.id}
//                 action={deleteAction}
//                 isAm={isAm}
//               />

//             </div>

//           </div>
//         )
//       })}

//     </div>
//   )
// }
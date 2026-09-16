'use client'

import { useMemo, useState } from 'react'

import ExpenseFilters from './ExpenseFilters'
import ExpenseTable from './ExpenseTable'
import ExpenseEditModal from './ExpenseEditModal'
import type { Expense } from './expenseTypes'

interface ExpenseHistoryProps {
  expenses: Expense[]
  deleteAction: (
    formData: FormData,
  ) => void | Promise<void>
  isAm: boolean
}

export default function ExpenseHistory({
  expenses,
  deleteAction,
  isAm,
}: ExpenseHistoryProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [payment, setPayment] = useState('')
  const [date, setDate] = useState('')
  const [editingExpense, setEditingExpense] =
    useState<Expense | null>(null)

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
  // TRANSLATION HELPER
  // ============================================================

  const t = (en: string, am: string) =>
    isAm ? am : en

  // ============================================================
  // FILTER EXPENSES
  // ============================================================

  const filteredExpenses = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase()

    return expenses.filter((expense) => {
      const categoryName =
        expense.category ?? ''

      const description =
        expense.description ?? ''

      const matchesSearch =
        !normalizedSearch ||
        categoryName
          .toLowerCase()
          .includes(normalizedSearch) ||
        description
          .toLowerCase()
          .includes(normalizedSearch)

      const matchesCategory =
        !category ||
        categoryName === category

      const matchesPayment =
        !payment ||
        expense.payment_method === payment

      const matchesDate =
        !date ||
        expense.expense_date === date

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPayment &&
        matchesDate
      )
    })
  }, [
    expenses,
    search,
    category,
    payment,
    date,
  ])

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setPayment('')
    setDate('')
  }

  // ============================================================
  // TOTAL FILTERED EXPENSES
  // ============================================================

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount ?? 0),
      0,
    )
  }, [filteredExpenses])

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-coffee-100
          bg-white
          shadow-sm
        "
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-coffee-100
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2 className="text-sm font-black text-coffee-900">
              {t(
                'Expense History',
                'የወጪ ታሪክ',
              )}
            </h2>

            <p className="mt-0.5 text-[10px] text-coffee-400">
              {filteredExpenses.length}{' '}
              {t(
                filteredExpenses.length === 1
                  ? 'expense'
                  : 'expenses',
                'ወጪ',
              )}
            </p>
          </div>

          {/* ====================================================
              FILTERED TOTAL
          ==================================================== */}

          <div
            className="
              rounded-xl
              bg-coffee-50
              px-3
              py-2
              text-xs
              font-bold
              text-coffee-600
            "
          >
            {formatMoney(filteredTotal)} ETB
          </div>
        </div>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <ExpenseFilters
          search={search}
          category={category}
          payment={payment}
          date={date}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onPaymentChange={setPayment}
          onDateChange={setDate}
          onClear={clearFilters}
          isAm={isAm}
        />

        {/* ======================================================
            EXPENSE TABLE
        ====================================================== */}

        <ExpenseTable
          expenses={filteredExpenses}
          deleteAction={deleteAction}
          onEdit={setEditingExpense}
          isAm={isAm}
        />
      </section>

      {/* ========================================================
          EDIT MODAL
      ======================================================== */}

      <ExpenseEditModal
        expense={editingExpense}
        onClose={() =>
          setEditingExpense(null)
        }
        isAm={isAm}
      />
    </>
  )
}

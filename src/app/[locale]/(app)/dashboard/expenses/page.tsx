import { redirect } from 'next/navigation'
import { Route } from 'next'

import {
  ArrowLeft,
  CircleDollarSign,
  Plus,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getAssignedProfileRoles } from '@/lib/shift-reports/server'

import {
  addExpense,
  updateExpense,
  deleteExpense,
} from './actions'

import ExpenseSummary from './components/ExpenseSummary'
import ExpenseForm from './components/ExpenseForm'
import ExpenseHistory from './components/ExpenseHistory'

import type { Expense } from './components/expenseTypes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function DashboardExpensesPage({
  params,
}: PageProps) {
  const { locale } = await params

  const supabase = await createClient()

  const isAm = locale === 'am'

  const t = (en: string, am: string) =>
    isAm ? am : en

  // ============================================================
  // 1. AUTHENTICATION
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}/auth/login` as Route,
    )
  }

  // ============================================================
  // 2. PROFILE / BUSINESS CONTEXT
  // ============================================================

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      business_id
    `)
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!profile) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  const businessId =
    profile.business_id ??
    user.user_metadata?.business_id ??
    user.app_metadata?.business_id

  if (!businessId) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  // ============================================================
  // 3. AUTHORIZATION
  // ============================================================

  const userRole =
    profile.role ??
    user.user_metadata?.role ??
    'owner'

  const assignedRoles = await getAssignedProfileRoles(supabase, user.id, userRole)
  const isOwnerOrManager = assignedRoles.some((role) => role === 'owner' || role === 'manager')

  if (!isOwnerOrManager) {
    redirect(
      `/${locale}/dashboard` as Route,
    )
  }

  // ============================================================
  // 4. CURRENT DATE
  // ============================================================

  const today = new Date()
    .toISOString()
    .slice(0, 10)

  // ============================================================
  // 5. LOAD ACTIVE EXPENSES
  // ============================================================

  const {
    data: expenses,
    error: expensesError,
  } = await supabase
    .from('expenses')
    .select(`
      id,
      category,
      description,
      amount,
      payment_method,
      expense_date,
      branch_id,
      shift_id,
      created_at
    `)
    .eq(
      'business_id',
      businessId,
    )
    .is(
      'deleted_at',
      null,
    )
    .order(
      'expense_date',
      {
        ascending: false,
      },
    )
    .order(
      'created_at',
      {
        ascending: false,
      },
    )
    .limit(100)

  if (expensesError) {
    console.error(
      '[EXPENSES PAGE] Failed to load expenses:',
      expensesError,
    )
  }

  const expenseList =
    (expenses ?? []) as Expense[]

  // ============================================================
  // 6. TODAY EXPENSES
  // ============================================================

  const todayExpenses =
    expenseList
      .filter(
        expense =>
          expense.expense_date === today,
      )
      .reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount ?? 0,
          ),
        0,
      )

  // ============================================================
  // 7. THIS MONTH EXPENSES
  // ============================================================

  const monthStartDate =
    `${today.slice(0, 7)}-01`

  const monthExpenses =
    expenseList
      .filter(
        expense =>
          expense.expense_date >=
            monthStartDate &&
          expense.expense_date <=
            today,
      )
      .reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount ?? 0,
          ),
        0,
      )

  // ============================================================
  // 8. ALL ACTIVE EXPENSES
  // ============================================================

  const totalExpenses =
    expenseList.reduce(
      (total, expense) =>
        total +
        Number(
          expense.amount ?? 0,
        ),
      0,
    )

  // ============================================================
  // 9. BIND SERVER ACTIONS
  // ============================================================

  const addExpenseAction =
    addExpense.bind(
      null,
      locale,
    )

  const updateExpenseAction =
    updateExpense.bind(
      null,
      locale,
    )

  const deleteExpenseAction =
    deleteExpense.bind(
      null,
      locale,
    )

  // ============================================================
  // 10. UI
  // ============================================================

  return (
    <main className="mx-auto w-full max-w-6xl px-3 pb-8 sm:px-5 lg:px-6">
      <div className="space-y-4 sm:space-y-5">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm sm:p-5">
          <a
            href={`/${locale}/dashboard`}
            className="
              inline-flex
              min-h-8
              items-center
              gap-1.5
              rounded-lg
              text-xs
              font-semibold
              text-coffee-500
              transition
              hover:text-berbere-600
            "
          >
            <ArrowLeft className="h-4 w-4" />

            {t(
              'Back to Dashboard',
              'ወደ ዳሽቦርድ ተመለስ',
            )}
          </a>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-berbere-50">
              <CircleDollarSign className="h-5 w-5 text-berbere-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-black text-coffee-900 sm:text-xl">
                {t(
                  'Expenses',
                  'ወጪዎች',
                )}
              </h1>

              <p className="mt-0.5 text-xs text-coffee-500">
                {t(
                  'Record and manage business expenses',
                  'የንግድ ወጪዎችን ይመዝግቡ እና ያስተዳድሩ',
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================
            SUMMARY
        ====================================================== */}

        <ExpenseSummary
          todayExpenses={todayExpenses}
          monthExpenses={monthExpenses}
          totalExpenses={totalExpenses}
          isAm={isAm}
        />

        {/* ======================================================
            RECORD EXPENSE
        ====================================================== */}

        <ExpenseForm
          action={addExpenseAction}
          today={today}
          isAm={isAm}
        />

        {/* ======================================================
            EXPENSE HISTORY
        ====================================================== */}

        <ExpenseHistory
          expenses={expenseList}
          updateAction={updateExpenseAction}
          deleteAction={deleteExpenseAction}
          isAm={isAm}
        />

      </div>
    </main>
  )
}

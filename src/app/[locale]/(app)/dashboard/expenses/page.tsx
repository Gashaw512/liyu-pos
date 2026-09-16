import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Route } from 'next'

import {
  ArrowLeft,
  CircleDollarSign,
  Plus,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

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
    redirect(`/${locale}/auth/login` as Route)
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
    redirect(`/${locale}/onboarding` as Route)
  }

  const businessId =
    profile.business_id ??
    user.user_metadata?.business_id ??
    user.app_metadata?.business_id

  if (!businessId) {
    redirect(`/${locale}/onboarding` as Route)
  }

  const userRole =
    profile.role ??
    user.user_metadata?.role ??
    'owner'

  // ============================================================
  // 3. AUTHORIZATION
  // ============================================================

  const isOwnerOrManager =
    userRole === 'owner' ||
    userRole === 'manager'

  if (!isOwnerOrManager) {
    redirect(`/${locale}/dashboard` as Route)
  }

  // ============================================================
  // 4. CURRENT DATE
  // ============================================================

  const today = new Date()
    .toISOString()
    .slice(0, 10)

  // ============================================================
  // 5. LOAD EXPENSES
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
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('expense_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
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
          Number(expense.amount ?? 0),
        0,
      )

  // ============================================================
  // 7. THIS MONTH EXPENSES
  // ============================================================

  const monthStartDate =
    `${today.slice(0, 7)}-01`

  const monthExpenses =
    expenseList
      .filter(expense =>
        expense.expense_date >=
          monthStartDate &&
        expense.expense_date <=
          today,
      )
      .reduce(
        (total, expense) =>
          total +
          Number(expense.amount ?? 0),
        0,
      )

  // ============================================================
  // 8. ALL ACTIVE EXPENSES
  // ============================================================

  const totalExpenses =
    expenseList.reduce(
      (total, expense) =>
        total +
        Number(expense.amount ?? 0),
      0,
    )

  // ============================================================
  // 9. MONEY FORMATTER
  // ============================================================

  // const formatMoney = (value: number) =>
  //   value.toLocaleString(
  //     isAm ? 'am-ET' : 'en-ET',
  //     {
  //       minimumFractionDigits: 2,
  //       maximumFractionDigits: 2,
  //     },
  //   )

  // ============================================================
  // 10. ADD EXPENSE
  // ============================================================

  async function addExpense(
    formData: FormData,
  ) {
    'use server'

    const supabase = await createClient()

    // ----------------------------------------------------------
    // Authentication
    // ----------------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/${locale}/auth/login` as Route)
    }

    // ----------------------------------------------------------
    // Reload secure profile
    // ----------------------------------------------------------

    const { data: profile } =
      await supabase
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
      redirect(`/${locale}/onboarding` as Route)
    }

    const actionBusinessId =
      profile.business_id ??
      user.user_metadata?.business_id ??
      user.app_metadata?.business_id

    if (!actionBusinessId) {
      redirect(`/${locale}/onboarding` as Route)
    }

    const actionRole =
      profile.role ??
      user.user_metadata?.role ??
      'owner'

    if (
      actionRole !== 'owner' &&
      actionRole !== 'manager'
    ) {
      redirect(
        `/${locale}/dashboard` as Route,
      )
    }

    // ----------------------------------------------------------
    // Read form values
    // ----------------------------------------------------------

    const category = String(
      formData.get('category') ?? '',
    ).trim()

    const description = String(
      formData.get('description') ?? '',
    ).trim()

    const amountRaw = String(
      formData.get('amount') ?? '',
    ).trim()

    const paymentMethod = String(
      formData.get('payment_method') ??
        'cash',
    ).trim()

    const expenseDate = String(
      formData.get('expense_date') ?? '',
    ).trim()

    const amount = Number(amountRaw)

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!category) {
      return
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return
    }

    if (!expenseDate) {
      return
    }

    // ----------------------------------------------------------
    // Find active shift
    // ----------------------------------------------------------

    const { data: activeShift } =
      await supabase
        .from('shifts')
        .select(`
          id,
          branch_id
        `)
        .eq(
          'business_id',
          actionBusinessId,
        )
        .eq('status', 'open')
        .order('opened_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

    // ----------------------------------------------------------
    // Create expense
    // ----------------------------------------------------------

    const { error: insertError } =
      await supabase
        .from('expenses')
        .insert({
          business_id:
            actionBusinessId,

          branch_id:
            activeShift?.branch_id ??
            null,

          recorded_by: user.id,

          shift_id:
            activeShift?.id ?? null,

          category,

          description:
            description || null,

          amount,

          payment_method:
            paymentMethod || 'cash',

          expense_date:
            expenseDate,
        })

    if (insertError) {
      console.error(
        '[EXPENSES PAGE] Failed to create expense:',
        insertError,
      )

      return
    }

    // ----------------------------------------------------------
    // Revalidate expense page + dashboard
    // ----------------------------------------------------------

    revalidatePath(
      `/${locale}/dashboard/expenses`,
    )

    revalidatePath(
      `/${locale}/dashboard`,
    )
  }

  // ============================================================
  // 11. SOFT DELETE EXPENSE
  // ============================================================

  async function deleteExpense(
    formData: FormData,
  ) {
    'use server'

    const expenseId = String(
      formData.get('expense_id') ?? '',
    ).trim()

    if (!expenseId) {
      return
    }

    const supabase = await createClient()

    // ----------------------------------------------------------
    // Authentication
    // ----------------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/${locale}/auth/login` as Route)
    }

    // ----------------------------------------------------------
    // Secure profile lookup
    // ----------------------------------------------------------

    const { data: profile } =
      await supabase
        .from('profiles')
        .select(`
          role,
          business_id
        `)
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

    if (!profile) {
      return
    }

    const actionBusinessId =
      profile.business_id ??
      user.user_metadata?.business_id ??
      user.app_metadata?.business_id

    const actionRole =
      profile.role ??
      user.user_metadata?.role ??
      'owner'

    if (
      !actionBusinessId ||
      (
        actionRole !== 'owner' &&
        actionRole !== 'manager'
      )
    ) {
      return
    }

    // ----------------------------------------------------------
    // Soft delete
    // ----------------------------------------------------------

    const { error: deleteError } =
      await supabase
        .from('expenses')
        .update({
          deleted_at:
            new Date().toISOString(),
        })
        .eq('id', expenseId)
        .eq(
          'business_id',
          actionBusinessId,
        )
        .is('deleted_at', null)

    if (deleteError) {
      console.error(
        '[EXPENSES PAGE] Failed to delete expense:',
        deleteError,
      )

      return
    }

    // ----------------------------------------------------------
    // Revalidate
    // ----------------------------------------------------------

    revalidatePath(
      `/${locale}/dashboard/expenses`,
    )

    revalidatePath(
      `/${locale}/dashboard`,
    )
  }

  // ============================================================
  // 12. UI
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
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg text-xs font-semibold text-coffee-500 transition hover:text-berbere-600"
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
          // formatMoney={formatMoney}
          isAm={isAm}
        />

        {/* ======================================================
            RECORD EXPENSE
        ====================================================== */}

        <section className="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-berbere-50">
              <Plus className="h-4 w-4 text-berbere-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-coffee-900 sm:text-base">
                {t(
                  'Record Expense',
                  'ወጪ መዝግብ',
                )}
              </h2>

              <p className="mt-0.5 text-[11px] text-coffee-500">
                {t(
                  'Add a business expense',
                  'የንግድ ወጪ ይጨምሩ',
                )}
              </p>
            </div>
          </div>

          <ExpenseForm
            action={addExpense}
            today={today}
            isAm={isAm}
          />
        </section>

        {/* ======================================================
            EXPENSE HISTORY
        ====================================================== */}

        <ExpenseHistory
          expenses={expenseList}
          deleteAction={deleteExpense}
          // formatMoney={formatMoney}
          isAm={isAm}
        />

      </div>
    </main>
  )
}
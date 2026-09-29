
import { createClient } from '../../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { Route } from 'next'

import DashboardClientContent from './DashboardClientContent'

import {
  getDashboardReport,
} from '@/queries/dashboardReport'

export const dynamic = 'force-dynamic'

/* ============================================================
   TYPES
   ============================================================ */

interface PageProps {
  params: Promise<{
    locale: string
  }>

  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

/* ============================================================
   DATE CONFIGURATION
   ============================================================ */

const BUSINESS_TIME_ZONE =
  'Africa/Addis_Ababa'

/* ============================================================
   DATE HELPERS
   ============================================================ */

/**
 * Validate a real YYYY-MM-DD calendar date.
 */
function isValidDate(
  value: string | undefined,
): boolean {
  if (!value) {
    return false
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Get today's Gregorian date according to
 * the business timezone: Africa/Addis_Ababa.
 *
 * This prevents a UTC server from treating
 * Ethiopian evening as the previous day.
 */
function getTodayDate(): string {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date())
}

/**
 * Add days to a YYYY-MM-DD date.
 *
 * Uses UTC internally so the server timezone
 * cannot change the calendar date.
 */
function addDays(
  dateString: string,
  days: number,
): string {
  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  date.setUTCDate(
    date.getUTCDate() + days,
  )

  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}-` +
    `${String(
      date.getUTCDate(),
    ).padStart(2, '0')}`
  )
}

/**
 * Return Monday of the week containing
 * the supplied date.
 */
function startOfWeek(
  dateString: string,
): string {
  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  const dayOfWeek =
    date.getUTCDay()

  const mondayOffset =
    dayOfWeek === 0
      ? 6
      : dayOfWeek - 1

  date.setUTCDate(
    date.getUTCDate() -
      mondayOffset,
  )

  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}-` +
    `${String(
      date.getUTCDate(),
    ).padStart(2, '0')}`
  )
}

/**
 * Return the first day of the current month.
 */
function startOfMonth(
  dateString: string,
): string {
  const [
    year,
    month,
  ] = dateString.split('-')

  return `${year}-${month}-01`
}

/**
 * Convert an Ethiopian business-calendar
 * midnight into a UTC timestamp.
 *
 * Ethiopia is UTC+3.
 *
 * Example:
 *
 * 2026-09-17 00:00 Ethiopia
 * =
 * 2026-09-16 21:00 UTC
 *
 * Used for timestamp columns such as:
 *
 *   sales.created_at
 */
function toAddisMidnightIso(
  dateString: string,
): string {
  return new Date(
    `${dateString}T00:00:00+03:00`,
  ).toISOString()
}

/**
 * Format a Gregorian date using the
 * Ethiopian calendar for dashboard display.
 *
 * IMPORTANT:
 *
 * This is DISPLAY ONLY.
 *
 * Database queries continue using Gregorian
 * YYYY-MM-DD values.
 */
function formatEthiopianDate(
  dateString: string,
  locale: string,
): string {
  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      12,
      0,
      0,
    ),
  )

  return new Intl.DateTimeFormat(
    locale === 'am'
      ? 'am-ET-u-ca-ethiopic'
      : 'en-ET-u-ca-ethiopic',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date)
}

/**
 * Build the period label shown in the dashboard.
 *
 * The database uses Gregorian dates.
 * The user sees Ethiopian calendar dates.
 */
function getPeriodLabel(
  fromDate: string,
  toDate: string,
  today: string,
  locale: string,
): string {
  const tomorrow =
    addDays(
      today,
      1,
    )

  /* ----------------------------------------------------------
     TODAY
     ---------------------------------------------------------- */

  if (
    fromDate === today &&
    toDate === tomorrow
  ) {
    return locale === 'am'
      ? 'ዛሬ'
      : 'Today'
  }

  /* ----------------------------------------------------------
     DATE RANGE
     ---------------------------------------------------------- */

  const visibleTo =
    addDays(
      toDate,
      -1,
    )

  const formattedFrom =
    formatEthiopianDate(
      fromDate,
      locale,
    )

  const formattedTo =
    formatEthiopianDate(
      visibleTo,
      locale,
    )

  return (
    `${formattedFrom} – ${formattedTo}`
  )
}

/* ============================================================
   PAGE
   ============================================================ */

export default async function DashboardOverviewPage({
  params,
  searchParams,
}: PageProps) {
  const {
    locale,
  } = await params

  const query =
    await searchParams

  const supabase =
    await createClient()

  /* ==========================================================
     1. AUTHENTICATION
     ========================================================== */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}/auth/login` as Route,
    )
  }

  /* ==========================================================
     2. USER / BUSINESS CONTEXT
     ========================================================== */

  const {
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(
        'role, business_id',
      )
      .eq(
        'id',
        user.id,
      )
      .is(
        'deleted_at',
        null,
      )
      .maybeSingle()

  if (!profile) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  const businessId =
    profile.business_id ??
    user.user_metadata
      ?.business_id ??
    user.app_metadata
      ?.business_id

  if (!businessId) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  /* ==========================================================
     3. USER ROLE
     ========================================================== */

  const userRole =
    profile.role ??
    user.user_metadata?.role ??
    'owner'

  /* ==========================================================
     4. DETERMINE DASHBOARD PERIOD
     ========================================================== */

  /**
   * Always calculate "today" using Ethiopia time.
   */
  const today =
    getTodayDate()

  const tomorrow =
    addDays(
      today,
      1,
    )

  /**
   * Default:
   *
   * Today
   *
   * from = today
   * to   = tomorrow
   *
   * `to` is EXCLUSIVE.
   */
  let fromDate =
    today

  let toDate =
    tomorrow

  const requestedFrom =
    query.from

  const requestedTo =
    query.to

  /**
   * The DashboardPeriodFilter already converts
   * user-selected inclusive dates into an
   * exclusive `to` date.
   *
   * Therefore we simply accept the range here.
   */
  if (
    isValidDate(
      requestedFrom,
    ) &&
    isValidDate(
      requestedTo,
    ) &&
    requestedFrom! <
      requestedTo!
  ) {
    fromDate =
      requestedFrom!

    toDate =
      requestedTo!
  }

  /* ==========================================================
     5. CORRECT TIMESTAMP BOUNDARIES
     ========================================================== */

  /**
   * These are used ONLY for timestamp fields.
   *
   * Sales:
   *
   *   created_at >= from
   *   created_at <  to
   */
  const from =
    toAddisMidnightIso(
      fromDate,
    )

  const to =
    toAddisMidnightIso(
      toDate,
    )

  /* ==========================================================
     6. GET DASHBOARD REPORT
     ========================================================== */

  const [report, categoryResult, productResult] = await Promise.all([
    getDashboardReport({
      businessId,
      userId: user.id,
      fromDate,
      toDate,
      from,
      to,
    }),
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true)
      .is('deleted_at', null),
  ])

  if (categoryResult.error) {
    console.error('[DASHBOARD] Category count lookup failed:', categoryResult.error)
  }

  const categoryCount = categoryResult.error
    ? report.inventory.totalCategories
    : categoryResult.count ?? 0

  if (productResult.error) {
    console.error('[DASHBOARD] Product count lookup failed:', productResult.error)
  }

  const productCount = productResult.error
    ? report.inventory.totalProducts
    : productResult.count ?? 0

  /* ==========================================================
     7. BUSINESS NAME
     ========================================================== */

  const businessName =
    user.user_metadata
      ?.business_name ??
    'Liyu POS'

  /* ==========================================================
     8. SHIFT STATUS
     ========================================================== */

  const hasActiveShift =
    report.activeShift !== null

  /* ==========================================================
     9. PERIOD LABEL
     ========================================================== */

  const periodLabel =
    getPeriodLabel(
      fromDate,
      toDate,
      today,
      locale,
    )

  /**
   * DashboardPeriodFilter expects the
   * visible/inclusive final date.
   *
   * Internally the report continues using
   * an exclusive `toDate`.
   */
  const visibleToDate =
    addDays(
      toDate,
      -1,
    )

  /* ==========================================================
     10. RENDER
     ========================================================== */

  return (
    <DashboardClientContent
      locale={locale}
      role={userRole}
      businessName={businessName}

      /* ------------------------------------------------------
         Period
      ------------------------------------------------------ */

      periodLabel={
        periodLabel
      }

      periodFrom={
        fromDate
      }

      periodTo={
        visibleToDate
      }

      /* ------------------------------------------------------
         Inventory
      ------------------------------------------------------ */

      initialProductCount={
        productCount
      }

      initialCategoryCount={
        categoryCount
      }

      /* ------------------------------------------------------
         Category performance
      ------------------------------------------------------ */

      categoryBreakdown={
        report.categories.map(
          item => ({
            name:
              item.name,

            itemsSold:
              item.itemsSold,

            revenue:
              item.revenue,

            grossProfit:
              item.grossProfit,
          }),
        )
      }

      /* ------------------------------------------------------
         Low stock
      ------------------------------------------------------ */

      lowStockAlerts={
        report.lowStock.map(
          item => ({
            id:
              item.id,

            name:
              item.name,

            category:
              item.category ??
              'Uncategorized',

            stock:
              item.quantity,
          }),
        )
      }

      /* ------------------------------------------------------
         Sales
      ------------------------------------------------------ */

      periodRevenue={
        report.sales.revenue
      }

      periodTransactionCount={
        report.sales
          .transactions
      }

      periodGrossProfit={
        report.sales
          .grossProfit
      }

      periodDiscounts={
        report.sales
          .discounts
      }

      periodTax={
        report.sales.tax
      }

      averageTicketSize={
        report.sales
          .averageSale
      }

      /* ------------------------------------------------------
         Expenses / Profit
      ------------------------------------------------------ */

      periodExpenses={
        report.expenses.total
      }

      periodNetProfit={
        report.profit.netProfit
      }

      /* ------------------------------------------------------
         Offline synchronization
      ------------------------------------------------------ */

      pendingSyncCount={
        report.pendingOfflineSales
      }

      /* ------------------------------------------------------
         Shift
      ------------------------------------------------------ */

      hasActiveShift={
        hasActiveShift
      }

      openShiftCount={
        report.openShiftCount
      }
    />
  )
}

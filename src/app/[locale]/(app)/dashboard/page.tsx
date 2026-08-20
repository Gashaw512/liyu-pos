import { createClient } from '../../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { Route } from 'next'

import DashboardClientContent from './DashboardClientContent'

import {
  getDashboardReport,
} from '@/queries/dashboardReport'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function DashboardOverviewPage({
  params,
}: PageProps) {
  const { locale } = await params

  const supabase = await createClient()

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
  // 2. USER / BUSINESS CONTEXT
  // ============================================================

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
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

  // ============================================================
  // 3. USER ROLE
  // ============================================================

  const userRole =
    profile.role ??
    user.user_metadata?.role ??
    'owner'

  // ============================================================
  // 4. TODAY RANGE
  // ============================================================

  const now = new Date()

  const from = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString()

  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString()

  // ============================================================
  // 5. DASHBOARD REPORT
  // ============================================================

  const report = await getDashboardReport({
    businessId,
    userId: user.id,
    from,
    to,
  })

  // ============================================================
  // 6. BUSINESS NAME
  // ============================================================

  const businessName =
    user.user_metadata?.business_name ??
    'Liyu POS'

  // ============================================================
  // 7. ACTIVE SHIFT
  // ============================================================

  const hasActiveShift =
    report.activeShift !== null

  // ============================================================
  // 8. RENDER
  // ============================================================

  return (
    <DashboardClientContent
      locale={locale}
      role={userRole}
      businessName={businessName}

      initialProductCount={
        report.inventory.totalProducts
      }

      initialCategoryCount={
        report.inventory.totalCategories
      }

      categoryBreakdown={
        report.categories.map((item) => ({
          name: item.name,
          itemsSold: item.itemsSold,
          revenue: item.revenue,
          grossProfit: item.grossProfit,
        }))
      }

      lowStockAlerts={
        report.lowStock.map((item) => ({
          id: item.id,
          name: item.name,
          category:
            item.category ?? 'Uncategorized',
          stock: item.quantity,
        }))
      }

      todayRevenue={
        report.sales.revenue
      }

      todayTransactionCount={
        report.sales.transactions
      }

      todayGrossProfit={
        report.sales.grossProfit
      }

      todayExpenses={
        report.expenses.total
      }

      todayNetProfit={
        report.profit.netProfit
      }

      todayDiscounts={
        report.sales.discounts
      }

      todayTax={
        report.sales.tax
      }

      averageTicketSize={
        report.sales.averageSale
      }

      pendingSyncCount={
        report.pendingOfflineSales
      }

      hasActiveShift={
        hasActiveShift
      }

      openShiftCount={
        report.openShiftCount
      }
    />
  )
}
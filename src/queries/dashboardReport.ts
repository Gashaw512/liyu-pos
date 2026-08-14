import { createClient } from '@/lib/supabase/server'

import type {
  DashboardReport,
  ExpenseSummary,
  LowStockItem,
  ProfitSummary,
  Shift,
} from '@/types/database/operations'

interface DashboardReportOptions {
  businessId: string
  branchId?: string | null
  from: string
  to: string
}

interface ExpenseRow {
  id: string
  amount: number | string | null
}

interface InventoryCategoryRow {
  name: string
  name_am: string | null
}


interface InventoryProductRow {
  id: string
  name: string
  name_am: string | null
  low_stock_alert: number | string | null
  is_active: boolean
  deleted_at: string | null
  category:
    | InventoryCategoryRow
    | InventoryCategoryRow[]
    | null
}

interface RawInventoryRow {
  id: string
  product_id: string
  quantity: number | string | null
  product:
    | InventoryProductRow
    | InventoryProductRow[]
    | null
}

const toNumber = (value: unknown): number => {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

/* ============================================================
   EXPENSES
   ============================================================ */

async function getTodayExpenses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DashboardReportOptions,
): Promise<ExpenseSummary> {
  let query = supabase
    .from('expenses')
    .select('id, amount')
    .eq('business_id', options.businessId)
    .is('deleted_at', null)
    .gte('expense_date', options.from.slice(0, 10))
    .lt('expense_date', options.to.slice(0, 10))

  if (options.branchId) {
    query = query.eq('branch_id', options.branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `Failed to fetch expenses: ${error.message}`,
    )
  }

  const expenses = (data ?? []) as ExpenseRow[]

  return {
    total: expenses.reduce(
      (sum, expense) =>
        sum + toNumber(expense.amount),
      0,
    ),
    transactions: expenses.length,
  }
}

/* ============================================================
   INVENTORY
   ============================================================ */

async function getInventorySummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DashboardReportOptions,
) {
  let query = supabase
    .from('inventory')
    .select(`
      id,
      product_id,
      quantity,
      product:products (
        id,
        name,
        name_am,
        low_stock_alert,
        is_active,
        deleted_at,
        category:categories (
          name,
          name_am
        )
      )
    `)
    .eq('business_id', options.businessId)

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `Failed to fetch inventory: ${error.message}`,
    )
  }

  const rows =
    (data as unknown as RawInventoryRow[]) ?? []

  let totalInventoryUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  const lowStock: LowStockItem[] = []
  const categoryNames = new Set<string>()

  for (const row of rows) {
    const product = Array.isArray(row.product)
      ? row.product[0] ?? null
      : row.product

    if (
      !product ||
      !product.is_active ||
      product.deleted_at
    ) {
      continue
    }

    const category = Array.isArray(product.category)
      ? product.category[0] ?? null
      : product.category

    const quantity = toNumber(row.quantity)

    const alertLevel = toNumber(
      product.low_stock_alert,
    )

    totalInventoryUnits += quantity

    if (category?.name) {
      categoryNames.add(category.name)
    }

    if (quantity <= 0) {
      outOfStockCount++
    }

    if (quantity <= alertLevel) {
      lowStockCount++

      lowStock.push({
        id: row.id,
        productId: product.id,
        name: product.name ?? '',
        nameAm: product.name_am,
        category: category?.name ?? null,
        quantity,
        alertLevel,
        shortage: Math.max(
          alertLevel - quantity,
          0,
        ),
      })
    }
  }

  return {
    totalProducts: rows.filter((row) => {
      const product = Array.isArray(row.product)
        ? row.product[0] ?? null
        : row.product

      return (
        !!product &&
        product.is_active === true &&
        !product.deleted_at
      )
    }).length,

    totalCategories: categoryNames.size,

    lowStockCount,

    outOfStockCount,

    totalInventoryUnits,

    lowStock: lowStock.sort(
      (a, b) => a.quantity - b.quantity,
    ),
  }
}

/* ============================================================
   ACTIVE SHIFT
   ============================================================ */

async function getActiveShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DashboardReportOptions,
): Promise<Shift | null> {
  let query = supabase
    .from('shifts')
    .select(`
      id,
      business_id,
      branch_id,
      cashier_id,
      opened_by,
      closed_by,
      shift_label,
      opened_at,
      closed_at,
      opening_cash,
      expected_cash,
      actual_cash_reported,
      cash_discrepancy,
      total_sales,
      total_transactions,
      status,
      is_first_shift,
      notes,
      created_at,
      updated_at,
      opening_float,
      closing_float,
      actual_cash,
      difference
    `)
    .eq('business_id', options.businessId)
    .eq('status', 'open')
    .order('opened_at', {
      ascending: false,
    })
    .limit(1)

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `Failed to fetch active shift: ${error.message}`,
    )
  }

  return (data?.[0] ?? null) as Shift | null
}

/* ============================================================
   PENDING OFFLINE SALES
   ============================================================ */

async function getPendingOfflineSales(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DashboardReportOptions,
): Promise<number> {
  let query = supabase
    .from('sales')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('business_id', options.businessId)
    .eq('is_offline_sync', true)
    .eq('status', 'completed')
    .is('deleted_at', null)

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const { count, error } = await query

  if (error) {
    throw new Error(
      `Failed to fetch offline sales: ${error.message}`,
    )
  }

  return count ?? 0
}

/* ============================================================
   MAIN REPORT
   ============================================================ */

export async function getDashboardReport(
  options: DashboardReportOptions,
): Promise<DashboardReport> {
  const supabase = await createClient()

  /*
   * IMPORTANT:
   * We keep the server report focused on dashboard data.
   */

  const [
    inventory,
    expenses,
    activeShift,
    pendingOfflineSales,
  ] = await Promise.all([
    getInventorySummary(
      supabase,
      options,
    ),

    getTodayExpenses(
      supabase,
      options,
    ),

    getActiveShift(
      supabase,
      options,
    ),

    getPendingOfflineSales(
      supabase,
      options,
    ),
  ])

  /*
   * Sales are fetched directly here temporarily.
   *
   * This avoids importing the client-side
   * getSalesReport() into the Server Component.
   */

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      total_amount
    `)
    .eq('business_id', options.businessId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .gte('created_at', options.from)
    .lt('created_at', options.to)

  if (options.branchId) {
    salesQuery = salesQuery.eq(
      'branch_id',
      options.branchId,
    )
  }

  const { data: salesData, error: salesError } =
    await salesQuery

  if (salesError) {
    throw new Error(
      `Failed to fetch sales: ${salesError.message}`,
    )
  }

  const sales = salesData ?? []

  const revenue = sales.reduce(
    (sum, sale) =>
      sum + toNumber(sale.total_amount),
    0,
  )

  const transactions = sales.length

  const averageSale =
    transactions > 0
      ? revenue / transactions
      : 0

  /*
   * Category performance.
   */

  let categoryQuery = supabase
    .from('sale_items')
    .select(`
      quantity,
      total_amount,
      sale:sales!inner (
        business_id,
        created_at,
        status,
        deleted_at
      ),
      product:products (
        category:categories (
          id,
          name,
          name_am
        )
      )
    `)
    .eq(
      'sale.business_id',
      options.businessId,
    )
    .eq(
      'sale.status',
      'completed',
    )
    .is(
      'sale.deleted_at',
      null,
    )
    .gte(
      'sale.created_at',
      options.from,
    )
    .lt(
      'sale.created_at',
      options.to,
    )

  const { data: categoryRows, error: categoryError } =
    await categoryQuery

  if (categoryError) {
    throw new Error(
      `Failed to fetch category sales: ${categoryError.message}`,
    )
  }

  const categoryMap = new Map<
    string,
    {
      categoryId: string | null
      name: string
      nameAm: string | null
      itemsSold: number
      revenue: number
      grossProfit: number
    }
  >()

  for (const row of categoryRows ?? []) {
    const product = Array.isArray(row.product)
      ? row.product[0]
      : row.product

    const category = Array.isArray(
      product?.category,
    )
      ? product.category[0]
      : product?.category

    const name =
      category?.name ??
      'Uncategorized'

    const existing =
      categoryMap.get(name)

    const itemsSold = toNumber(row.quantity)
    const rowRevenue = toNumber(
      row.total_amount,
    )

    if (existing) {
      existing.itemsSold += itemsSold
      existing.revenue += rowRevenue
    } else {
      categoryMap.set(name, {
        categoryId:
          category?.id ?? null,
        name,
        nameAm:
          category?.name_am ?? null,
        itemsSold,
        revenue: rowRevenue,
        grossProfit: 0,
      })
    }
  }

  const categories =
    Array.from(categoryMap.values()).sort(
      (a, b) =>
        b.revenue - a.revenue,
    )

  const grossProfit = 0
  const expenseTotal = expenses.total
  const netProfit =
    grossProfit - expenseTotal

  const grossMargin = 0

  const netMargin =
    revenue > 0
      ? (netProfit / revenue) * 100
      : 0

  const profit: ProfitSummary = {
    revenue,
    grossProfit,
    expenses: expenseTotal,
    netProfit,
    grossMargin,
    netMargin,
  }

  return {
    sales: {
      revenue,
      transactions,
      itemsSold: categories.reduce(
        (sum, category) =>
          sum + category.itemsSold,
        0,
      ),
      grossProfit,
      grossMargin,
      discounts: 0,
      tax: 0,
      averageSale,
    },

    expenses,

    profit,

    inventory: {
      totalProducts:
        inventory.totalProducts,
      totalCategories:
        inventory.totalCategories,
      lowStockCount:
        inventory.lowStockCount,
      outOfStockCount:
        inventory.outOfStockCount,
      totalInventoryUnits:
        inventory.totalInventoryUnits,
    },

    lowStock:
      inventory.lowStock,

    activeShift,

    pendingOfflineSales,

    categories,
  }
}
import { createClient } from '@/lib/supabase/server'

import type {
  DashboardReport,
  ExpenseSummary,
  LowStockItem,
  ProfitSummary,
  Shift,
} from '@/types/database/operations'

/* ============================================================
   TYPES
   ============================================================ */

export interface DashboardReportOptions {
  businessId: string
  userId: string
  branchId?: string | null
  from: string
  to: string
}

interface ExpenseRow {
  id: string
  amount: number | string | null
}

interface InventoryCategoryRow {
  id?: string
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

interface CategorySaleRow {
  quantity: number | string | null
  total_amount: number | string | null
  gross_profit: number | string | null

  product:
    | {
        category:
          | {
              id: string
              name: string
              name_am: string | null
            }
          | {
              id: string
              name: string
              name_am: string | null
            }[]
          | null
      }
    | {
        category:
          | {
              id: string
              name: string
              name_am: string | null
            }
          | {
              id: string
              name: string
              name_am: string | null
            }[]
          | null
      }[]
    | null
}

interface SalesRow {
  id: string
  total_amount: number | string | null
}

/* ============================================================
   HELPERS
   ============================================================ */

const toNumber = (value: unknown): number => {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
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
    .select(`
      id,
      amount
    `)
    .eq(
      'business_id',
      options.businessId,
    )
    .is(
      'deleted_at',
      null,
    )
    .gte(
      'expense_date',
      options.from.slice(0, 10),
    )
    .lt(
      'expense_date',
      options.to.slice(0, 10),
    )

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const {
    data,
    error,
  } = await query

  if (error) {
    throw new Error(
      `Failed to fetch expenses: ${error.message}`,
    )
  }

  const expenses =
    (data ?? []) as ExpenseRow[]

  const total = expenses.reduce(
    (sum, expense) =>
      sum + toNumber(expense.amount),
    0,
  )

  return {
    total,
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
          id,
          name,
          name_am
        )
      )
    `)
    .eq(
      'business_id',
      options.businessId,
    )

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const {
    data,
    error,
  } = await query

  if (error) {
    throw new Error(
      `Failed to fetch inventory: ${error.message}`,
    )
  }

  const rows =
    (data as unknown as RawInventoryRow[]) ??
    []

  let totalInventoryUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  const lowStock: LowStockItem[] = []

  const categoryNames =
    new Set<string>()

  for (const row of rows) {
    const product =
      Array.isArray(row.product)
        ? row.product[0] ?? null
        : row.product

    if (
      !product ||
      !product.is_active ||
      product.deleted_at
    ) {
      continue
    }

    const category =
      Array.isArray(product.category)
        ? product.category[0] ?? null
        : product.category

    const quantity =
      toNumber(row.quantity)

    const alertLevel =
      toNumber(
        product.low_stock_alert,
      )

    totalInventoryUnits += quantity

    if (category?.name) {
      categoryNames.add(
        category.name,
      )
    }

    if (quantity <= 0) {
      outOfStockCount++
    }

    /*
     * A low-stock alert is only meaningful
     * when a positive alert level is configured.
     */
    if (
      alertLevel > 0 &&
      quantity <= alertLevel
    ) {
      lowStockCount++

      lowStock.push({
        id: row.id,

        productId:
          product.id,

        name:
          product.name ?? '',

        nameAm:
          product.name_am,

        category:
          category?.name ?? null,

        quantity,

        alertLevel,

        shortage:
          Math.max(
            alertLevel - quantity,
            0,
          ),
      })
    }
  }

  const activeProducts =
    rows.filter((row) => {
      const product =
        Array.isArray(row.product)
          ? row.product[0] ?? null
          : row.product

      return (
        !!product &&
        product.is_active === true &&
        !product.deleted_at
      )
    })

  return {
    totalProducts:
      activeProducts.length,

    totalCategories:
      categoryNames.size,

    lowStockCount,

    outOfStockCount,

    totalInventoryUnits,

    lowStock:
      lowStock.sort(
        (a, b) =>
          a.quantity -
          b.quantity,
      ),
  }
}

/* ============================================================
   CURRENT USER ACTIVE SHIFT
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
    .eq(
      'business_id',
      options.businessId,
    )
    .eq(
      'cashier_id',
      options.userId,
    )
    .eq(
      'status',
      'open',
    )
    .order(
      'opened_at',
      {
        ascending: false,
      },
    )
    .limit(1)

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const {
    data,
    error,
  } = await query

  if (error) {
    throw new Error(
      `Failed to fetch active shift: ${error.message}`,
    )
  }

  return (
    data?.[0] ?? null
  ) as Shift | null
}

/* ============================================================
   OPEN SHIFT COUNT
   ============================================================ */

/**
 * Counts all currently open shifts
 * for the selected business / branch.
 */
async function getOpenShiftCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DashboardReportOptions,
): Promise<number> {
  let query = supabase
    .from('shifts')
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      },
    )
    .eq(
      'business_id',
      options.businessId,
    )
    .eq(
      'status',
      'open',
    )

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const {
    count,
    error,
  } = await query

  if (error) {
    throw new Error(
      `Failed to fetch open shifts: ${error.message}`,
    )
  }

  return count ?? 0
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
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      },
    )
    .eq(
      'business_id',
      options.businessId,
    )
    .eq(
      'is_offline_sync',
      true,
    )
    .eq(
      'status',
      'completed',
    )
    .is(
      'deleted_at',
      null,
    )

  if (options.branchId) {
    query = query.eq(
      'branch_id',
      options.branchId,
    )
  }

  const {
    count,
    error,
  } = await query

  if (error) {
    throw new Error(
      `Failed to fetch offline sales: ${error.message}`,
    )
  }

  return count ?? 0
}

/* ============================================================
   MAIN DASHBOARD REPORT
   ============================================================ */

export async function getDashboardReport(
  options: DashboardReportOptions,
): Promise<DashboardReport> {
  const supabase =
    await createClient()

  /* ==========================================================
     PARALLEL NON-SALES QUERIES
     ========================================================== */

  const [
    inventory,
    expenses,
    activeShift,
    openShiftCount,
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

    getOpenShiftCount(
      supabase,
      options,
    ),

    getPendingOfflineSales(
      supabase,
      options,
    ),
  ])

  /* ==========================================================
     SALES
     ========================================================== */

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      total_amount
    `)
    .eq(
      'business_id',
      options.businessId,
    )
    .eq(
      'status',
      'completed',
    )
    .is(
      'deleted_at',
      null,
    )
    .gte(
      'created_at',
      options.from,
    )
    .lt(
      'created_at',
      options.to,
    )

  if (options.branchId) {
    salesQuery =
      salesQuery.eq(
        'branch_id',
        options.branchId,
      )
  }

  const {
    data: salesData,
    error: salesError,
  } = await salesQuery

  if (salesError) {
    throw new Error(
      `Failed to fetch sales: ${salesError.message}`,
    )
  }

  const sales =
    (salesData ?? []) as SalesRow[]

  /* ==========================================================
     SALES SUMMARY
     ========================================================== */

  const revenue =
    sales.reduce(
      (sum, sale) =>
        sum +
        toNumber(
          sale.total_amount,
        ),
      0,
    )

  const transactions =
    sales.length

  const averageSale =
    transactions > 0
      ? revenue / transactions
      : 0

  /* ==========================================================
     CATEGORY PERFORMANCE + GROSS PROFIT
     ========================================================== */

  let categoryQuery = supabase
    .from('sale_items')
    .select(`
      quantity,
      total_amount,
      gross_profit,

      sale:sales!inner (
        business_id,
        branch_id,
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

  if (options.branchId) {
    categoryQuery =
      categoryQuery.eq(
        'sale.branch_id',
        options.branchId,
      )
  }

  const {
    data: categoryRowsData,
    error: categoryError,
  } = await categoryQuery

  if (categoryError) {
    throw new Error(
      `Failed to fetch category sales: ${categoryError.message}`,
    )
  }

  const categoryRows =
    (categoryRowsData ??
      []) as unknown as CategorySaleRow[]

  const categoryMap =
    new Map<
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

  /*
   * Total gross profit comes directly
   * from sale_items.gross_profit.
   */
  let grossProfit = 0

  let itemsSold = 0

  for (const row of categoryRows) {
    const product =
      Array.isArray(row.product)
        ? row.product[0] ?? null
        : row.product

    const category =
      Array.isArray(
        product?.category,
      )
        ? product.category[0] ?? null
        : product?.category

    const rowItemsSold =
      toNumber(
        row.quantity,
      )

    const rowRevenue =
      toNumber(
        row.total_amount,
      )

    const rowGrossProfit =
      toNumber(
        row.gross_profit,
      )

    itemsSold +=
      rowItemsSold

    grossProfit +=
      rowGrossProfit

    const categoryId =
      category?.id ?? null

    const categoryName =
      category?.name ??
      'Uncategorized'

    /*
     * Use ID where available so two
     * categories with the same name
     * cannot accidentally be merged.
     */
    const mapKey =
      categoryId ??
      `uncategorized:${categoryName}`

    const existing =
      categoryMap.get(
        mapKey,
      )

    if (existing) {
      existing.itemsSold +=
        rowItemsSold

      existing.revenue +=
        rowRevenue

      existing.grossProfit +=
        rowGrossProfit
    } else {
      categoryMap.set(
        mapKey,
        {
          categoryId,

          name:
            categoryName,

          nameAm:
            category?.name_am ??
            null,

          itemsSold:
            rowItemsSold,

          revenue:
            rowRevenue,

          grossProfit:
            rowGrossProfit,
        },
      )
    }
  }

  const categories =
    Array.from(
      categoryMap.values(),
    ).sort(
      (a, b) =>
        b.revenue -
        a.revenue,
    )

  /* ==========================================================
     PROFIT
     ========================================================== */

  /*
   * Gross Profit:
   *
   * sale_items.gross_profit
   *
   * This is already calculated/stored
   * by the sales system.
   */

  const expenseTotal =
    expenses.total

  /*
   * Net Profit:
   *
   * Gross Profit - Operating Expenses
   */
  const netProfit =
    grossProfit -
    expenseTotal

  const grossMargin =
    revenue > 0
      ? (
          grossProfit /
          revenue
        ) * 100
      : 0

  const netMargin =
    revenue > 0
      ? (
          netProfit /
          revenue
        ) * 100
      : 0

  const profit: ProfitSummary = {
    revenue,

    grossProfit,

    expenses:
      expenseTotal,

    netProfit,

    grossMargin,

    netMargin,
  }

  /* ==========================================================
     FINAL REPORT
     ========================================================== */

  return {
    sales: {
      revenue,

      transactions,

      itemsSold,

      grossProfit,

      grossMargin,

      /*
       * Keep these zero until the database
       * fields for actual discounts/tax
       * are wired into this report.
       */
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

    /*
     * Active shift belonging to
     * the currently authenticated user.
     */
    activeShift,

    /*
     * All open shifts in this
     * business / branch.
     */
    openShiftCount,

    pendingOfflineSales,

    categories,
  }
}
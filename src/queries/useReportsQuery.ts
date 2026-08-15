// // src/queries/useReportsQuery.ts

// // 'use client'
// import { useQuery } from '@tanstack/react-query'
// import { getSupabaseBrowserClient } from '@/lib/supabase/client'
// import {
//     getSalesReport,
// } from './useSalesQuery'
// import type {
//     DashboardReport,
//     ExpenseSummary,
//     LowStockItem,
//     ProfitSummary,
//     Shift,
// } from '@/types/database/operations'


// interface ExpenseRow {
//     id: string
//     amount: number | string | null
// }
// interface InventoryCategoryRow {
//     name: string
//     name_am: string | null
// }
// interface InventoryProductRow {
//     id: string
//     name: string
//     name_am: string | null
//     low_stock_alert: number | string | null
//     is_active: boolean
//     deleted_at: string | null
//     category: InventoryCategoryRow | null
// }
// interface RawInventoryRow {
//     id: string
//     product_id: string
//     quantity: number | string | null
//     product: InventoryProductRow | null
// }

// /* ============================================================
//    TYPES
//    ============================================================ */

// export interface DashboardReportOptions {
//     businessId: string
//     branchId?: string | null

//     /**
//      * Date range for today's business report.
//      */
//     from: string
//     to: string

//     enabled?: boolean
// }

// /* ============================================================
//    HELPERS
//    ============================================================ */

// const toNumber = (
//     value: unknown
// ): number => {
//     const number = Number(value)

//     return Number.isFinite(number)
//         ? number
//         : 0
// }

// /* ============================================================
//    EXPENSES
//    ============================================================ */

// async function getTodayExpenses(
//     options: DashboardReportOptions
// ): Promise<ExpenseSummary> {
//     const supabase =
//         getSupabaseBrowserClient()

//     let query = supabase
//         .from('expenses')
//         .select(`
//       id,
//       amount
//     `)
//         .eq(
//             'business_id',
//             options.businessId
//         )
//         .is(
//             'deleted_at',
//             null
//         )
//         .gte(
//             'expense_date',
//             options.from.slice(0, 10)
//         )
//         .lt(
//             'expense_date',
//             options.to.slice(0, 10)
//         )

//     if (options.branchId) {
//         query = query.eq(
//             'branch_id',
//             options.branchId
//         )
//     }

//     const {
//         data,
//         error,
//     } = await query

//     const expenses = (data ?? []) as ExpenseRow[]

//     if (error) {
//         console.error(
//             '[getTodayExpenses]',
//             error
//         )

//         throw new Error(
//             `Failed to fetch expenses: ${error.message}`
//         )
//     }

//     const total = expenses.reduce(
//         (sum, expense) =>
//             sum + toNumber(expense.amount),
//         0
//     )

//     return {
//         total,
//         transactions: expenses.length,
//     }
// }

// /* ============================================================
//    INVENTORY
//    ============================================================ */

// async function getInventorySummary(
//   options: DashboardReportOptions
// ) {
//   const supabase =
//     getSupabaseBrowserClient()

//   let query = supabase
//     .from('inventory')
//     .select(`
//       id,
//       product_id,
//       quantity,

//       product:products (
//         id,
//         name,
//         name_am,
//         low_stock_alert,
//         is_active,
//         deleted_at,

//         category:categories (
//           name,
//           name_am
//         )
//       )
//     `)
//     .eq(
//       'business_id',
//       options.businessId
//     )

//   /*
//    * Branch-specific inventory.
//    */
//   if (options.branchId) {
//     query = query.eq(
//       'branch_id',
//       options.branchId
//     )
//   }

//   const {
//     data,
//     error,
//   } = await query

//   if (error) {
//     console.error(
//       '[getInventorySummary]',
//       error.message
//     )

//     throw new Error(
//       `Failed to fetch inventory: ${error.message}`
//     )
//   }

//   /*
//    * Supabase/PostgREST relational results
//    * can be represented as either an object
//    * or an array depending on relationship
//    * inference.
//    *
//    * Normalize them once here.
//    */
//   const rows =
//     (data as unknown as RawInventoryRow[]) ?? []

//   let totalInventoryUnits = 0
//   let lowStockCount = 0
//   let outOfStockCount = 0

//   const lowStock: LowStockItem[] = []

//   /*
//    * Track categories by name rather than
//    * relying on Supabase's inferred type.
//    */
//   const categoryNames = new Set<string>()

//   /*
//    * ------------------------------------------------------------
//    * PROCESS INVENTORY
//    * ------------------------------------------------------------
//    */

//   for (const row of rows) {
//     /*
//      * Normalize product relation.
//      */
//     const product = Array.isArray(row.product)
//       ? row.product[0] ?? null
//       : row.product

//     if (
//       !product ||
//       !product.is_active ||
//       product.deleted_at
//     ) {
//       continue
//     }

//     /*
//      * Normalize category relation.
//      */
//     const category = Array.isArray(
//       product.category
//     )
//       ? product.category[0] ?? null
//       : product.category

//     /*
//      * Normalize numeric values.
//      */
//     const quantity = toNumber(
//       row.quantity
//     )

//     const alertLevel = toNumber(
//       product.low_stock_alert
//     )

//     /*
//      * Total inventory units.
//      */
//     totalInventoryUnits += quantity

//     /*
//      * Category count.
//      */
//     if (category?.name) {
//       categoryNames.add(
//         category.name
//       )
//     }

//     /*
//      * Out of stock.
//      */
//     if (quantity <= 0) {
//       outOfStockCount++
//     }

//     /*
//      * Low stock.
//      *
//      * Important:
//      * quantity <= alertLevel means the
//      * product needs attention.
//      */
//     if (quantity <= alertLevel) {
//       lowStockCount++

//       lowStock.push({
//         id: row.id,

//         productId:
//           product.id,

//         name:
//           product.name ?? '',

//         nameAm:
//           product.name_am,

//         category:
//           category?.name ?? null,

//         quantity,

//         alertLevel,

//         shortage:
//           Math.max(
//             alertLevel - quantity,
//             0
//           ),
//       })
//     }
//   }

//   /*
//    * ------------------------------------------------------------
//    * RETURN DASHBOARD INVENTORY SUMMARY
//    * ------------------------------------------------------------
//    */

//   return {
//     /*
//      * Number of active products that
//      * actually have inventory records.
//      */
//     totalProducts:
//       rows.filter((row) => {
//         const product =
//           Array.isArray(row.product)
//             ? row.product[0] ?? null
//             : row.product

//         return (
//           !!product &&
//           product.is_active === true &&
//           !product.deleted_at
//         )
//       }).length,

//     /*
//      * Number of distinct categories
//      * represented in inventory.
//      */
//     totalCategories:
//       categoryNames.size,

//     /*
//      * Products at or below their
//      * configured low-stock threshold.
//      */
//     lowStockCount,

//     /*
//      * Products with zero or negative stock.
//      */
//     outOfStockCount,

//     /*
//      * Total physical quantity across
//      * the selected branch/business.
//      */
//     totalInventoryUnits,

//     /*
//      * Most urgent products first.
//      */
//     lowStock:
//       lowStock.sort(
//         (a, b) =>
//           a.quantity - b.quantity
//       ),
//   }
// }

// /* ============================================================
//    ACTIVE SHIFT
//    ============================================================ */

// async function getActiveShift(
//     options: DashboardReportOptions
// ): Promise<Shift | null> {
//     const supabase =
//         getSupabaseBrowserClient()

//     let query = supabase
//         .from('shifts')
//         .select(`
//       id,
//       business_id,
//       branch_id,
//       cashier_id,
//       opened_by,
//       closed_by,
//       shift_label,
//       opened_at,
//       closed_at,
//       opening_cash,
//       expected_cash,
//       actual_cash_reported,
//       cash_discrepancy,
//       total_sales,
//       total_transactions,
//       status,
//       is_first_shift,
//       notes,
//       created_at,
//       updated_at,
//       opening_float,
//       closing_float,
//       actual_cash,
//       difference
//     `)
//         .eq(
//             'business_id',
//             options.businessId
//         )
//         .eq(
//             'status',
//             'open'
//         )
//         .order(
//             'opened_at',
//             {
//                 ascending: false,
//             }
//         )
//         .limit(1)

//     if (options.branchId) {
//         query = query.eq(
//             'branch_id',
//             options.branchId
//         )
//     }

//     const {
//         data,
//         error,
//     } = await query

//     if (error) {
//         console.error(
//             '[getActiveShift]',
//             error
//         )

//         throw new Error(
//             `Failed to fetch active shift: ${error.message}`
//         )
//     }

//     return (
//         data?.[0] ??
//         null
//     ) as Shift | null
// }


// /* ============================================================
//    OPEN SHIFT COUNT
//    ============================================================ */

// async function getOpenShiftCount(
//     options: DashboardReportOptions
// ): Promise<number> {
//     const supabase =
//         getSupabaseBrowserClient()

//     let query = supabase
//         .from('shifts')
//         .select(
//             'id',
//             {
//                 count: 'exact',
//                 head: true,
//             }
//         )
//         .eq(
//             'business_id',
//             options.businessId
//         )
//         .eq(
//             'status',
//             'open'
//         )

//     if (options.branchId) {
//         query = query.eq(
//             'branch_id',
//             options.branchId
//         )
//     }

//     const {
//         count,
//         error,
//     } = await query

//     if (error) {
//         console.error(
//             '[getOpenShiftCount]',
//             error
//         )

//         throw new Error(
//             `Failed to fetch open shifts: ${error.message}`
//         )
//     }

//     return count ?? 0
// }

// /* ============================================================
//    PENDING OFFLINE SALES
//    ============================================================ */

// async function getPendingOfflineSales(
//     options: DashboardReportOptions
// ): Promise<number> {
//     const supabase =
//         getSupabaseBrowserClient()

//     let query = supabase
//         .from('sales')
//         .select(
//             'id',
//             {
//                 count: 'exact',
//                 head: true,
//             }
//         )
//         .eq(
//             'business_id',
//             options.businessId
//         )
//         .eq(
//             'is_offline_sync',
//             true
//         )
//         .eq(
//             'status',
//             'completed'
//         )
//         .is(
//             'deleted_at',
//             null
//         )

//     if (options.branchId) {
//         query = query.eq(
//             'branch_id',
//             options.branchId
//         )
//     }

//     const {
//         count,
//         error,
//     } = await query

//     if (error) {
//         console.error(
//             '[getPendingOfflineSales]',
//             error
//         )

//         throw new Error(
//             `Failed to fetch offline sales: ${error.message}`
//         )
//     }

//     return count ?? 0
// }

// /* ============================================================
//    MAIN DASHBOARD REPORT
//    ============================================================ */

// export async function getDashboardReport(
//     options: DashboardReportOptions
// ): Promise<DashboardReport> {
// const [
//     sales,
//     expenses,
//     inventory,
//     activeShift,
//     openShiftCount,
//     pendingOfflineSales,
// ] = await Promise.all([
//     getSalesReport({
//         businessId:
//             options.businessId,

//         branchId:
//             options.branchId,

//         from:
//             options.from,

//         to:
//             options.to,
//     }),

//     getTodayExpenses(
//         options
//     ),

//     getInventorySummary(
//         options
//     ),

//     getActiveShift(
//         options
//     ),

//     getOpenShiftCount(
//         options
//     ),

//     getPendingOfflineSales(
//         options
//     ),
// ])

//     /* ==========================================================
//        PROFIT
  
//        Gross profit comes directly from sale_items.gross_profit.
  
//        Net profit:
//          gross profit - operating expenses
//     ========================================================== */

//     const revenue =
//         sales.summary.revenue

//     const grossProfit =
//         sales.summary.grossProfit

//     const expenseTotal =
//         expenses.total

//     const netProfit =
//         grossProfit -
//         expenseTotal

//     const grossMargin =
//         revenue > 0
//             ? (
//                 grossProfit /
//                 revenue
//             ) * 100
//             : 0

//     const netMargin =
//         revenue > 0
//             ? (
//                 netProfit /
//                 revenue
//             ) * 100
//             : 0

//     const profit: ProfitSummary =
//     {
//         revenue,

//         grossProfit,

//         expenses:
//             expenseTotal,

//         netProfit,

//         grossMargin,

//         netMargin,
//     }

//     return {
//     sales: {
//         revenue,

//         transactions:
//             sales.summary
//                 .transactions,

//         itemsSold:
//             sales.summary
//                 .itemsSold,

//         grossProfit,

//         grossMargin,

//         discounts:
//             sales.summary
//                 .discounts,

//         tax:
//             sales.summary
//                 .tax,

//         averageSale:
//             sales.summary
//                 .averageSale,
//     },

//     expenses,

//     profit,

//     inventory: {
//         totalProducts:
//             inventory.totalProducts,

//         totalCategories:
//             inventory.totalCategories,

//         lowStockCount:
//             inventory.lowStockCount,

//         outOfStockCount:
//             inventory.outOfStockCount,

//         totalInventoryUnits:
//             inventory.totalInventoryUnits,
//     },

//     lowStock:
//         inventory.lowStock,

//     activeShift,

//     openShiftCount,

//     pendingOfflineSales,

//     categories:
//         sales.categories,
// }
// }

// /* ============================================================
//    REACT QUERY
//    ============================================================ */

// export function useReportsQuery(
//     options: DashboardReportOptions
// ) {
//     return useQuery({
//         queryKey: [
//             'dashboard-report',

//             options.businessId,

//             options.branchId ??
//             'all',

//             options.from,

//             options.to,
//         ],

//         queryFn: () =>
//             getDashboardReport(
//                 options
//             ),

//         enabled:
//             Boolean(
//                 options.businessId
//             ) &&
//             (options.enabled ??
//                 true),

//         staleTime:
//             30_000,

//         refetchInterval:
//             60_000,

//         refetchOnWindowFocus:
//             true,
//     })
// }
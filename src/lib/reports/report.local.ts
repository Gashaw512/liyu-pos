import { getDB } from '@/lib/offline/db'

import type {
  ReportCategory,
  ReportExpense,
  ReportInventory,
  ReportProduct,
  ReportSale,
} from './report.types'

import {
  getExpenseDate,
  getReportDateRange,
  getSaleDate,
  isDateInRange,
} from './report.helpers'

export interface LocalReportData {
  sales: ReportSale[]

  expenses: ReportExpense[]

  products: ReportProduct[]

  categories: ReportCategory[]

  inventory: ReportInventory[]

  activeShift: any | null
}

/* ============================================================
 * LOAD LOCAL REPORT DATA
 * ============================================================ */

export async function loadLocalReportData(
  date?: Date | string,
): Promise<LocalReportData> {
  const db = await getDB()

  const range =
    getReportDateRange(date)

  /* ----------------------------------------------------------
   * Read independent stores in parallel
   * ---------------------------------------------------------- */

  const [
    localSales,
    products,
    categories,
    inventory,
    activeShift,
  ] = await Promise.all([
    db.getAll(
      'completed_sales_history',
    ),

    db.getAll(
      'products',
    ),

    db.getAll(
      'categories',
    ),

    db.getAll(
      'inventory',
    ),

    db.get(
      'active_shift',
      'current',
    ),
  ])

  /* ----------------------------------------------------------
   * SALES
   * ---------------------------------------------------------- */

  const sales =
    (
      localSales || []
    )
      .filter((sale) =>
        isDateInRange(
          getSaleDate(
            sale as ReportSale,
          ),
          range,
        ),
      )
      .map(
        (sale) =>
          sale as ReportSale,
      )

  /* ----------------------------------------------------------
   * EXPENSES
   *
   * This is intentionally isolated because expenses
   * should become a first-class offline store.
   * ---------------------------------------------------------- */

  let expenses: ReportExpense[] = []

  try {
    const localExpenses =
      await db.getAll(
        'expenses' as never,
      )

    expenses =
      (
        localExpenses || []
      )
        .map(
          (expense) =>
            expense as unknown as ReportExpense,
        )
        .filter(
          (expense) =>
            isDateInRange(
              getExpenseDate(
                expense,
              ),
              range,
            ),
        )
  } catch {
    expenses = []
  }

  return {
    sales,

    expenses,

    products:
      (products || []) as ReportProduct[],

    categories:
      (categories || []) as ReportCategory[],

    inventory:
      (inventory || []) as ReportInventory[],

    activeShift:
      activeShift || null,
  }
}
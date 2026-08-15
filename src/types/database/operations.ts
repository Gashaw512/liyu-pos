import type {ShiftLabel,ShiftStatus} from '../enum'

/* ============================================================================
 * SHIFTS
 * Maps to: public.shifts
 * ========================================================================== */
export interface Shift {
  id: string

  business_id: string

  branch_id: string

  cashier_id: string

  opened_by: string | null

  closed_by: string | null

  shift_label: ShiftLabel

  opened_at: string

  closed_at: string | null

  opening_cash: number

  expected_cash: number

  actual_cash_reported: number | null

  cash_discrepancy: number | null

  total_sales: number

  total_transactions: number

  status: ShiftStatus

  is_first_shift: boolean

  notes: string | null

  created_at: string

  updated_at: string

  opening_float: number

  closing_float: number | null

  actual_cash: number | null

  difference: number | null
}

/* ============================================================================
 * EXPENSES
 * Maps to: public.expenses
 * ========================================================================== */
export interface Expense {
  id: string

  business_id: string

  branch_id: string | null

  recorded_by: string | null

  shift_id: string | null

  category: string

  description: string | null

  amount: number

  payment_method: string

  receipt_url: string | null

  expense_date: string

  created_at: string

  updated_at: string

  deleted_at: string | null
}

/* ============================================================================
 * STOCK RECONCILIATIONS
 * Maps to: public.stock_reconciliations
 * ========================================================================== */
export interface StockCount {
  id: string

  business_id: string

  branch_id: string

  shift_id: string | null

  product_id: string

  counted_by: string | null

  recon_date: string

  opening_qty: number

  added_qty: number

  closing_qty: number

  logged_sales_qty: number

  discrepancy_qty: number

  discrepancy_value: number | null

  notes: string | null

  is_verified: boolean

  verified_by: string | null

  created_at: string
}

export interface LowStockItem {
  id: string
  productId: string

  name: string
  nameAm: string | null

  category: string | null

  quantity: number
  alertLevel: number

  shortage: number
}


export interface InventorySummary {
  totalProducts: number
  totalCategories: number

  lowStockCount: number
  outOfStockCount: number

  totalInventoryUnits: number
}

export interface ExpenseSummary {
  total: number
  transactions: number
}

export interface ProfitSummary {
  revenue: number
  grossProfit: number
  expenses: number
  netProfit: number

  grossMargin: number
  netMargin: number
}

export interface DashboardReport {
  sales: {
    revenue: number
    transactions: number
    itemsSold: number

    grossProfit: number
    grossMargin: number

    discounts: number
    tax: number

    averageSale: number
  }

  expenses: ExpenseSummary

  profit: ProfitSummary

  inventory: InventorySummary

  lowStock: LowStockItem[]

  activeShift: Shift | null

  openShiftCount: number

  pendingOfflineSales: number

  categories: {
    categoryId: string | null
    name: string
    nameAm: string | null

    itemsSold: number
    revenue: number
    grossProfit: number
  }[]
}


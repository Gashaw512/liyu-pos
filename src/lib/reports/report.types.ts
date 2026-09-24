import type { Shift } from '@/types/database'
import type {
  LocalHistoricalSale,
} from '@/types/models/pos-cart'

/* ============================================================
 * REPORT DATE RANGE
 * ============================================================ */

export interface ReportDateRange {
  from: Date
  to: Date
  /** Calendar-date bounds for PostgreSQL DATE columns; `toDate` is exclusive. */
  fromDate: string
  toDate: string
  fromISO: string
  toISO: string
}

/* ============================================================
 * REPORT OPTIONS
 * ============================================================ */

export interface DailyReportOptions {
  businessId: string
  branchId?: string | null
  userId?: string | null

  /**
   * Local report date.
   *
   * Example:
   * 2026-09-01
   */
  date?: Date | string

  /**
   * Whether remote reconciliation should be attempted.
   *
   * Offline-first means local data is returned even when
   * remote access fails.
   */
  allowRemote?: boolean
}

/* ============================================================
 * REPORT STATUS
 * ============================================================ */

export type ReportDataSource =
  | 'local'
  | 'remote'
  | 'merged'

export interface ReportSyncState {
  source: ReportDataSource

  remoteAvailable: boolean

  localOnlySales: number

  remoteSales: number

  remoteExpenses: number

  lastUpdated: string
}

/* ============================================================
 * SALE
 * ============================================================ */

export interface ReportSaleItem {
  id?: string

  sale_id?: string
  saleId?: string

  product_id?: string
  productId?: string

  category_id?: string
  categoryId?: string

  product_name?: string
  productName?: string

  name?: string

  quantity?: number | string

  unit_price?: number | string
  unitPrice?: number | string

  price?: number | string

  total?: number | string
  total_amount?: number | string

  cost_total?: number | string

  gross_profit?: number | string
}

export interface ReportPayment {
  id?: string

  sale_id?: string
  saleId?: string

  method?: string
  payment_method?: string

  amount?: number | string
}

export interface ReportSale {
  id?: string
  sale_id?: string

  business_id?: string
  branch_id?: string

  created_at?: string
  createdAt?: string

  subtotal?: number | string

  total_amount?: number | string
  totalAmount?: number | string

  tip_amount?: number | string
  tipAmount?: number | string

  payment_method?: string
  paymentMethod?: string

  status?: string

  items?: ReportSaleItem[]
  sale_items?: ReportSaleItem[]

  payments?: ReportPayment[]

  is_offline_sync?: boolean
  synced?: boolean
  sync_status?: string
}

/* ============================================================
 * EXPENSE
 * ============================================================ */

export interface ReportExpense {
  id?: string

  business_id?: string
  branch_id?: string

  amount?: number | string
  total_amount?: number | string

  description?: string
  note?: string

  category?: string
  expense_category?: string

  expense_date?: string
  date?: string
  created_at?: string

  status?: string

  deleted_at?: string | null
}

/* ============================================================
 * PRODUCT / CATEGORY
 * ============================================================ */

export interface ReportProduct {
  id: string

  name?: string
  name_am?: string | null

  stock_quantity?: number | string
  quantity?: number | string

  reorder_level?: number | string
  low_stock_threshold?: number | string
  low_stock_alert?: number | string

  is_active?: boolean
  deleted_at?: string | null
}

export interface ReportCategory {
  id: string

  name?: string
  name_am?: string | null
}

/* ============================================================
 * INVENTORY
 * ============================================================ */

export interface ReportInventory {
  id: string

  product_id: string
  branch_id?: string

  quantity: number | string
}

/* ============================================================
 * SUMMARY TYPES
 * ============================================================ */

export interface ProductSummary {
  id: string
  name: string
  quantity: number
  revenue: number
  grossProfit: number
}

export interface CategorySummary {
  id: string
  name: string
  nameAm: string | null

  quantity: number
  revenue: number
  grossProfit: number
}

export interface PaymentSummary {
  method: string
  amount: number
}

export interface ExpenseSummary {
  total: number
  transactions: number

  byCategory: Array<{
    category: string
    amount: number
  }>
}

export interface LowStockSummary {
  id: string
  productId: string
  name: string
  nameAm: string | null

  quantity: number
  alertLevel: number
  shortage: number
}

/* ============================================================
 * FINANCIAL SUMMARY
 * ============================================================ */

export interface DailyFinancialSummary {
  revenue: number

  tips: number

  totalReceived: number

  transactions: number

  itemsSold: number

  averageSale: number

  cash: number

  telebirr: number

  bank: number

  card: number

  other: number

  paymentTotal: number

  grossProfit: number

  grossMargin: number

  expenses: number

  netProfit: number

  netMargin: number
}

/* ============================================================
 * INVENTORY SUMMARY
 * ============================================================ */

export interface DailyInventorySummary {
  totalProducts: number

  totalCategories: number

  totalInventoryUnits: number

  lowStockCount: number

  outOfStockCount: number

  lowStock: LowStockSummary[]
}

/* ============================================================
 * COMPLETE DAILY REPORT
 * ============================================================ */

export interface DailyReport {
  date: string

  financials: DailyFinancialSummary

  expenses: ExpenseSummary

  inventory: DailyInventorySummary

  products: ProductSummary[]

  categories: CategorySummary[]

  payments: PaymentSummary[]

  sales: ReportSale[]

  activeShift: Shift | null

  sync: ReportSyncState
}

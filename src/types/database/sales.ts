
// src/types/database/sales.ts
// export interface Sale {}
// export interface SaleItem {}
// export interface Payment {}

import type {
  PaymentMethod,
  TransactionStatus
} from '../enum'

/* ============================================================================
 * SALES
 * Maps to: public.sales: it is the reciptient of all transactions, and the main source of truth for sales data. It is linked to sale_items and payments tables.
 * ========================================================================== */
export interface Sale {
  id: string

  business_id: string
  branch_id: string

  shift_id: string | null

  cashier_id: string | null

  receipt_number: string

  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number

  status: TransactionStatus

  customer_name: string | null
  customer_phone: string | null

  notes: string | null
//  the below can be removed  as it is not nessesary for synced already on the db
  is_offline_sync: boolean
//  prefrable than the above is_offline_sync
//   sync_status:
//   | 'pending'
//   | 'synced'
//   | 'failed'
  offline_id: string | null

  created_at: string

  voided_at: string | null
  voided_by: string | null

  deleted_at: string | null

  table_id: string | null
  table_name: string | null

  tip_amount: number
//   add this for For offline troubleshooting.
//   device_id: string | null
}

/* ============================================================================
 * SALE ITEMS
 * Maps to: public.sale_items: it is soled Item
 * ========================================================================== */
export interface SaleItem {
  id: string

  sale_id: string

  product_id: string

  product_name: string

  unit_price: number
  cost_price: number

  quantity: number

  discount: number

  total_amount: number

  gross_profit: number

  created_at: string
}

/* ============================================================================
 * PAYMENTS
 * Maps to: public.payments
 * ========================================================================== */
export interface Payment {
  id: string

  sale_id: string

  business_id: string

  method: PaymentMethod

  amount: number

  reference_no: string | null

  status:
    | 'completed'
    | 'pending'
    | 'failed'
    | 'refunded'

  created_at: string
}
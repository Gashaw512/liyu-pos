import type {PaymentMethod,TransactionStatus} from '../enum'
export interface PendingSale {
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

  is_offline_sync: boolean
  offline_id: string | null

  created_at: string

  voided_at: string | null
  voided_by: string | null

  deleted_at: string | null

  table_id?: string | null
  table_name?: string | null

  tip_amount?: number
}

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

export interface Payment {
  id: string

  sale_id: string

  business_id: string

  method: PaymentMethod

  amount: number

  reference_no: string | null

  status: 'completed' | 'pending' | 'failed' | 'refunded'

  created_at: string
}
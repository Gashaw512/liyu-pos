export interface POSProduct {
  id: string
  name: string
  category_id?: string | null
  retail_price?: number
  image_url?: string | null
  is_active?: boolean
  sku?: string | null
}

export interface POSCategory {
  id: string
  name: string
  sort_order?: number
  is_active?: boolean
}

export interface POSCartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface POSTable {
  id: string
  name: string
  table_number?: string
  has_open_tab?: boolean
}

export interface POSShift {
  id: string

  real_database_id?: string | null

  branch_id?: string | null
  cashier_id?: string | null
  business_id?: string | null

  opening_cash?: number | null
  opening_float?: number | null

  opened_at?: string | null
  opened_by?: string | null

  closed_by?: string | null
  shift_label?: string | null

  closed_at?: string | null
  closing_float?: number | null

  actual_cash?: number | null
  difference?: number | null

  // Required by the offline Shift type
  expected_cash?: number | null
  actual_cash_reported?: number | null
  cash_discrepancy?: number | null
  total_sales?: number | null
  total_cash_sales?: number | null
  total_non_cash_sales?: number | null

  status?: string | null
  notes?: string | null

  created_at?: string | null
  updated_at?: string | null
}

export interface PaymentSplit {
  cash: number
  telebirr: number
  cbeBirr: number
}
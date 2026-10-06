// src/types/database/catalog.ts

import type { UnitOfMeasure } from '../enum'

export interface Category {
  id: string
  business_id: string
  name: string
  name_am: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  deleted_at: string | null
}

export interface CategoryTemplate {
  id: string
  business_type: string
  name: string
  name_am: string | null
  icon: string | null
  sort_order: number
}

export interface Product {
  id: string
  business_id: string
  branch_id: string | null

  category_id: string | null

  name: string
  name_am: string | null

  barcode: string | null
  sku: string | null

  unit_type: UnitOfMeasure

  /*
   * NULL means the product does not use crate-based
   * packaging information.
   */
  units_per_crate: number | null

  cost_price: number
  retail_price: number

  tax_inclusive: boolean

  image_url: string | null

  is_active: boolean
  is_sold_by_weight: boolean
  track_inventory: boolean

  /*
   * NULL means no low-stock threshold is configured.
   */
  low_stock_alert: number | null

  created_at: string
  updated_at: string

  deleted_at: string | null

  /*
   * Derived field.
   * This is not necessarily stored on products.
   * It may come from an inventory query/join.
   */
  quantity?: number

  price_group_id: string | null
  price_type: 'fixed' | 'group'

  description: string | null

  /** Server-issued integrity proof for a cached offline retail price. */
  price_proof?: string
}

export interface Supplier {
  id: string
  business_id: string

  name: string

  phone: string | null
  email: string | null
  address: string | null
  notes: string | null

  is_active: boolean

  created_at: string
  deleted_at: string | null
}

export interface RestaurantTable {
  id: string
  business_id: string
  branch_id: string

  name: string
  capacity: number

  is_active: boolean

  created_at: string
  deleted_at: string | null
}

'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { InventoryProduct } from '@/types/inventory'

// Raw relational payload types eliminating 'any'
interface RawCategoryRelation {
  id: string
  name: string
  name_am?: string | null
  icon?: string | null
  color?: string | null
  sort_order?: number
}

interface RawInventoryRelation {
  quantity: number | null
  branch_id: string
}

interface RawProductPayload {
  id: string
  name: string | null
  name_am: string | null
  barcode: string | null
  sku: string | null
  unit_type: string | null
  retail_price: number | string | null
  cost_price: number | string | null
  low_stock_alert: number | string | null
  category_id: string | null
  categories: RawCategoryRelation | RawCategoryRelation[] | null
  inventory: RawInventoryRelation | RawInventoryRelation[] | null
}

/**
 * Fetches active inventory products for a specific business and branch.
 * Defensively handles PostgREST array/object join payloads and localizations.
 */
export async function getInventoryProducts(
  businessId: string,
  branchId: string
): Promise<InventoryProduct[]> {
  if (!businessId) throw new Error('Business ID is required')
  if (!branchId) throw new Error('Branch ID is required')

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      name_am,
      barcode,
      sku,
      unit_type,
      retail_price,
      cost_price,
      low_stock_alert,
      category_id,

      categories (
        id,
        name,
        name_am,
        icon,
        color,
        sort_order
      ),

      inventory (
        quantity,
        branch_id
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[getInventoryProducts] Error:', error.message)
    throw new Error(`Failed to fetch inventory products: ${error.message}`)
  }

  const rawProducts = (data as unknown as RawProductPayload[]) ?? []

  return rawProducts.map((product) => {
    // 1. Defensively handle the relational stock array matching the active branch
    let calculatedStock = 0
    if (Array.isArray(product.inventory)) {
      const branchInv = product.inventory.find((inv) => inv.branch_id === branchId)
      calculatedStock = Number(branchInv?.quantity ?? 0)
    } else if (product.inventory) {
      const inv = product.inventory as RawInventoryRelation
      if (inv.branch_id === branchId) {
        calculatedStock = Number(inv.quantity ?? 0)
      }
    }

    // 2. Defensively handle the relational category object or array element
    const categoryInfo = Array.isArray(product.categories)
      ? product.categories[0]
      : product.categories

    const nameEn = product.name || ''
    const nameAm = product.name_am || nameEn

    return {
      id: product.id,
      name: nameEn,
      name_am: nameAm,
      barcode: product.barcode || '',
      sku: product.sku || '',
      unit_type: product.unit_type || 'piece',

      // Strict numerical normalization
      retail_price: Number(product.retail_price ?? 0),
      cost_price: Number(product.cost_price ?? 0),
      low_stock_alert: Number(product.low_stock_alert ?? 5),

      category_id: product.category_id,

      // Fallback logic preserving business context completely
      category_name: categoryInfo?.name ?? 'Uncategorized',
      category_name_am: categoryInfo?.name_am ?? categoryInfo?.name ?? 'ያልተመደበ',
      category_icon: categoryInfo?.icon ?? '📦',
      category_color: categoryInfo?.color ?? '#64748b',

      // Dual-mapped keys satisfying standard properties and structural type schemas
      quantity: calculatedStock,
      opening_count: calculatedStock,
    } as InventoryProduct
  })
}
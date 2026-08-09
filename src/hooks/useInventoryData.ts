// src/hooks/useInventoryData.ts

import { getDB } from '@/lib/offline/db'
import type { InventoryProduct } from '@/types/inventory'

/* =========================
 * INTERNAL RAW DB TYPES
 * ========================= */
type RawProduct = {
  id: string
  name: string
  name_am: string | null
  barcode: string | null
  sku: string | null
  unit_type: InventoryProduct['unit_type']
  retail_price: number
  cost_price: number
  category_id: string | null
}

type RawCategory = {
  id: string
  name: string
  name_am: string | null
  icon?: string
  color?: string
}

type RawInventory = {
  product_id: string
  quantity: number
}

/* =========================
 * MAIN FUNCTION
 * ========================= */
export async function getLocalInventoryProducts(): Promise<
  InventoryProduct[]
> {
  const db = await getDB()

  const tx = db.transaction(
    ['products', 'categories', 'inventory'],
    'readonly'
  )

  const [rawProducts, rawCategories, rawInventory] =
    await Promise.all([
      tx.objectStore('products').getAll(),
      tx.objectStore('categories').getAll(),
      tx.objectStore('inventory').getAll()
    ])

  await tx.done

  const products = rawProducts as RawProduct[]
  const categories = rawCategories as RawCategory[]
  const inventory = rawInventory as RawInventory[]

  /* =========================
   * FAST LOOKUP MAPS
   * ========================= */
  const categoryMap = new Map<string, RawCategory>()
  for (const c of categories) {
    categoryMap.set(c.id, c)
  }

  const stockMap = new Map<string, number>()
  for (const i of inventory) {
    stockMap.set(i.product_id, i.quantity)
  }

  /* =========================
   * FINAL MAPPING
   * ========================= */
  return products.map((product): InventoryProduct => {
    const cat = product.category_id
      ? categoryMap.get(product.category_id)
      : undefined

    return {
      id: product.id,
      name: product.name,
      name_am: product.name_am,
      barcode: product.barcode,
      sku: product.sku,
      unit_type: product.unit_type,

      retail_price: product.retail_price,
      cost_price: product.cost_price,

      category_id: product.category_id,

      category_name: cat?.name ?? 'Uncategorized',
      category_name_am: cat?.name_am ?? 'ያልተመደበ',
      category_icon: cat?.icon ?? '📦',
      category_color: cat?.color ?? '#64748b',

      opening_count: stockMap.get(product.id) ?? 0
    }
  })
}
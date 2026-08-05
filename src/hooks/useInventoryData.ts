// src/hooks/useInventoryData.ts
import { getDB } from '@/lib/offline/db'
import { InventoryProduct } from '@/types/inventory'

export async function getLocalInventoryProducts(): Promise<InventoryProduct[]> {
  const db = await getDB()

  // Pull everything from local storage in one quick batch
  const tx = db.transaction(['products', 'categories', 'inventory'], 'readonly')
  const [rawProducts, rawCategories, rawInventory] = await Promise.all([
    tx.objectStore('products').getAll(),
    tx.objectStore('categories').getAll(),
    tx.objectStore('inventory').getAll(),
  ])
  await tx.done

  // Create fast lookup tables
  const categoryMap = new Map(rawCategories.map(c => [c.id, c]))
  const stockMap = new Map(rawInventory.map(i => [i.product_id, i.quantity]))

  return rawProducts.map((product) => {
    const cat = product.category_id ? categoryMap.get(product.category_id) : null;
    
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
      opening_count: stockMap.get(product.id) ?? 0,
    }
  })
}
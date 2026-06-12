// src/queries/useProductQueries.ts
import { supabase } from '@/lib/supabase/client'
import { InventoryProduct } from '@/types/inventory'

export async function getInventoryProducts(
  businessId: string, 
  branchId: string
): Promise<InventoryProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
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

  if (error) throw error

  return (data ?? []).map((product: any) => {
    // Filter down to the active branch inventory row record if it exists
    const branchInventory = Array.isArray(product.inventory)
      ? product.inventory.find((inv: any) => inv.branch_id === branchId)
      : product.inventory;

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
      category_name: product.categories?.name ?? 'Uncategorized',
      category_name_am: product.categories?.name_am ?? 'ያልተመደበ',
      category_icon: product.categories?.icon ?? '📦',
      category_color: product.categories?.color ?? '#64748b',
      opening_count: branchInventory?.quantity ? Number(branchInventory.quantity) : 0
    }
  })
}
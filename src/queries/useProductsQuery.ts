import { supabase } from '@/lib/supabase/client'
import {InventoryProduct} from '@/types/inventory'

export async function getInventoryProducts(
  businessId: string, branchId: string
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
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)

  if (error) {
    throw error
  }

  return (data ?? []).map((product: any) => ({
    id: product.id,
    name: product.name,
    name_am: product.name_am,
    category_id: product.category_id,
    category_name:
      product.categories?.name ??
      'Uncategorized',
    category_name_am:
      product.categories?.name_am ??
      null,
    category_icon:
      product.categories?.icon ??
      '📦',
    category_color:
      product.categories?.color ??
      '#64748b',
    category_sort_order:
      product.categories?.sort_order ??
      999,
    retail_price:
      product.retail_price,
    opening_count: product.quantity
  }))
}
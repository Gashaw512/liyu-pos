// // src/queries/useInventoryQueries.ts

// import { supabase } from '@/lib/supabase/client'
// import { InventoryProduct } from '@/types/inventory'

// export async function getInventoryProducts(
//   businessId: string,
//   branchId: string
// ): Promise<InventoryProduct[]> {
//   const { data, error } = await supabase
//     .from('products')
//     .select(`
//       id,
//       name,
//       name_am,
//       barcode,
//       sku,
//       unit_type,
//       retail_price,
//       cost_price,
//       low_stock_alert,
//       category_id,

//       categories (
//         id,
//         name,
//         name_am,
//         icon,
//         color,
//         sort_order
//       ),

//       inventory (
//         quantity,
//         branch_id
//       )
//     `)
//     .eq('business_id', businessId)
//     .is('deleted_at', null)
//     .eq('is_active', true)
//     .order('name')

//   if (error) throw error

//   return (data ?? []).map((product: any) => {
//     const branchInventory = Array.isArray(product.inventory)
//       ? product.inventory.find(
//           (inv: any) => inv.branch_id === branchId
//         )
//       : product.inventory

//     return {
//       id: product.id,

//       name: product.name,
//       name_am: product.name_am,

//       barcode: product.barcode,
//       sku: product.sku,

//       unit_type: product.unit_type,

//       retail_price: Number(product.retail_price ?? 0),

//       cost_price: Number(product.cost_price ?? 0),

//       category_id: product.category_id,

//       category_name:
//         product.categories?.name ?? 'Uncategorized',

//       category_name_am:
//         product.categories?.name_am ?? 'ያልተመደበ',

//       category_icon:
//         product.categories?.icon ?? '📦',

//       category_color:
//         product.categories?.color ?? '#64748b',

//       quantity:
//         Number(branchInventory?.quantity ?? 0),

//       low_stock_alert:
//         Number(product.low_stock_alert ?? 5)
//     }
//   })
// }

// src/queries/useInventoryQueries.ts

import { supabase } from '@/lib/supabase/client'
import { InventoryProduct } from '@/types/inventory'

export async function getInventoryProducts(
  businessId: string,
  branchId: string
): Promise<InventoryProduct[]> {
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

  if (error) throw error

  return (data ?? []).map((product: any) => {
    // 1. Defensively handle the relational stock array matching the active branch
    const branchInventory = Array.isArray(product.inventory)
      ? product.inventory.find((inv: any) => inv.branch_id === branchId)
      : product.inventory

    const calculatedStock = Number(branchInventory?.quantity ?? 0)

    // 2. Defensively handle the relational category array or object safely
    const categoryInfo = Array.isArray(product.categories)
      ? product.categories[0]
      : product.categories

    return {
      id: product.id,
      name: product.name || '',
      name_am: product.name_am || product.name || '',
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
      opening_count: calculatedStock, // 👈 Fixes the TypeScript interface mismatch
    }
  })
}

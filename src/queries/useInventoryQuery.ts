// src/queries/useInventoryQuery.ts

// import {supabase} from '../lib/supabase/client'
// import { InventoryProduct } from '../types/inventory'

// export  async function getInvenoryProducts(businessId: string, branchId: string): Promise<InventoryProduct[]> {
//     const { data, error } = await supabase
//       .from('products')
//       .select(
//         `id,
//         name,
//         category_id,
//         categories (
//           id,
//           name,
//           icon
//         )`
//       )
//       .eq('business_id', businessId)
//       .eq('branch_id', branchId)

//     if (error) {
//       console.error('Error fetching inventory products:', error)
//       return []
//     }

//     return data.map(product => ({
//       id: product.id,
//       name: product.name,
//       category: product.category_id,
//       CategoryIcon: product.categories?.icon || '📦',
//       openingCount: 0, // You can set this to the actual opening count if you have that data
//       categoryName: product.categories?.name || null,
//     }))
//   }
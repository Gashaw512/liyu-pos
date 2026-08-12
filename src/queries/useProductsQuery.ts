// src/queries/useProductQueries.ts

import { supabase } from '@/lib/supabase/client'
import type { Product } from '@/types/database/catalog'
import type { ProductListItem } from '@/types/dto/product.dt'

/**
 * LIST PAGE QUERY (JOINED VIEW)
 */
export async function getProducts(
  businessId: string
): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      name_am,
      image_url,
      retail_price,
      price_type,
      is_active,

      categories (
        name,
        name_am
      ),

      price_groups (
        name
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('name')

  if (error) throw error

  return (
    data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      name_am: item.name_am,
      image_url: item.image_url,
      retail_price: item.retail_price,
      price_type: item.price_type,

      category_name: item.categories?.name ?? null,
      category_name_am: item.categories?.name_am ?? null,

      price_group_name: item.price_groups?.name ?? null,

      is_active: item.is_active
    })) ?? []
  )
}

/**
 * SINGLE PRODUCT
 */
export async function getProductById(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(*),
      price_groups(*)
    `)
    .eq('id', productId)
    .single()

  if (error) throw error

  return data
}

/**
 * CREATE
 */
export async function createProduct(payload: {
  business_id: string
  category_id: string

  name: string
  name_am?: string

  retail_price?: number

  price_type: 'fixed' | 'group'

  price_group_id?: string | null

  image_url?: string | null
}) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: payload.business_id,
      category_id: payload.category_id,

      name: payload.name.trim(),
      name_am: payload.name_am || null,

      retail_price: payload.retail_price || 0,

      price_type: payload.price_type,
      price_group_id: payload.price_group_id || null,

      image_url: payload.image_url || null,

      cost_price: 0,
      unit_type: 'piece',
      tax_inclusive: true,
      track_inventory: true,
      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  return data
}

/**
 * UPDATE
 */
export async function updateProduct(
  productId: string,
  payload: Partial<Product>
) {
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error

  return data
}

/**
 * SOFT DELETE
 */
export async function deleteProduct(
  productId: string
) {
  const { error } = await supabase
    .from('products')
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', productId)

  if (error) throw error

  return true
}
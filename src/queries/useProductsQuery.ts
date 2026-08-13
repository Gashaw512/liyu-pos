// src/queries/useProductQueries.ts
'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database/catalog'
import type { ProductListItem } from '@/types/dto/product.dt'

// Raw relational payload types eliminating 'any'
interface RawCategoryRelation {
  name: string
  name_am?: string | null
}

interface RawPriceGroupRelation {
  name: string
}

interface RawProductListItemPayload {
  id: string
  name: string
  name_am: string | null
  image_url: string | null
  retail_price: number | string | null
  price_type: 'fixed' | 'group'
  is_active: boolean
  categories: RawCategoryRelation | RawCategoryRelation[] | null
  price_groups: RawPriceGroupRelation | RawPriceGroupRelation[] | null
}

export interface CreateProductPayload {
  business_id: string
  category_id: string
  name: string
  name_am?: string | null
  retail_price?: number
  price_type: 'fixed' | 'group'
  price_group_id?: string | null
  image_url?: string | null
}

export type UpdateProductPayload = Partial<
  Omit<Product, 'id' | 'business_id' | 'created_at'>
>

/**
 * LIST PAGE QUERY (JOINED VIEW)
 * Fetches lightweight product items with joined category and price group details.
 */
export async function getProducts(
  businessId: string
): Promise<ProductListItem[]> {
  if (!businessId) throw new Error('Business ID is required')

  const supabase = getSupabaseBrowserClient()

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

  if (error) {
    console.error('[getProducts] Error:', error.message)
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  const rawItems = (data as unknown as RawProductListItemPayload[]) ?? []

  return rawItems.map((item) => {
    // Defensively resolve joined relational objects vs arrays
    const categoryInfo = Array.isArray(item.categories)
      ? item.categories[0]
      : item.categories

    const priceGroupInfo = Array.isArray(item.price_groups)
      ? item.price_groups[0]
      : item.price_groups

    return {
      id: item.id,
      name: item.name || '',
      name_am: item.name_am || null,
      image_url: item.image_url || null,
      retail_price: Number(item.retail_price ?? 0),
      price_type: item.price_type,

      category_name: categoryInfo?.name ?? null,
      category_name_am: categoryInfo?.name_am ?? null,

      price_group_name: priceGroupInfo?.name ?? null,

      is_active: item.is_active ?? true,
    } as ProductListItem
  })
}

/**
 * SINGLE PRODUCT
 * Fetches a complete product record by ID with full category and price group details.
 */
export async function getProductById(productId: string): Promise<Product> {
  if (!productId) throw new Error('Product ID is required')

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(*),
      price_groups(*)
    `)
    .eq('id', productId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error(`[getProductById] Error for ID ${productId}:`, error.message)
    throw new Error(`Failed to fetch product: ${error.message}`)
  }

  return data as Product
}

/**
 * CREATE
 * Creates a new catalog product with required POS default configurations.
 */
export async function createProduct(
  payload: CreateProductPayload
): Promise<Product> {
  if (!payload.business_id) throw new Error('Business ID is required')
  if (!payload.category_id) throw new Error('Category ID is required')
  if (!payload.name?.trim()) throw new Error('Product name cannot be empty')

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: payload.business_id,
      category_id: payload.category_id,

      name: payload.name.trim(),
      name_am: payload.name_am ? payload.name_am.trim() : null,

      retail_price: payload.retail_price ?? 0,

      price_type: payload.price_type,
      price_group_id: payload.price_group_id || null,

      image_url: payload.image_url || null,

      // POS catalog default fallbacks
      cost_price: 0,
      unit_type: 'piece',
      tax_inclusive: true,
      track_inventory: true,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('[createProduct] Error:', error.message)
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return data as Product
}

/**
 * UPDATE
 * Updates existing product details selectively.
 */
export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload
): Promise<Product> {
  if (!productId) throw new Error('Product ID is required')

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select()
    .single()

  if (error) {
    console.error(`[updateProduct] Error for ID ${productId}:`, error.message)
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return data as Product
}

/**
 * SOFT DELETE
 * Soft deletes a product by setting deleted_at timestamp and deactivating it.
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  if (!productId) throw new Error('Product ID is required')

  const supabase = getSupabaseBrowserClient()

  const { error } = await supabase
    .from('products')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false
    })
    .eq('id', productId)

  if (error) {
    console.error(`[deleteProduct] Error for ID ${productId}:`, error.message)
    throw new Error(`Failed to delete product: ${error.message}`)
  }

  return true
}
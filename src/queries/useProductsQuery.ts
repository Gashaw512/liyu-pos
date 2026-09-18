// src/queries/useProductsQuery.ts

import createClient from '@/lib/supabase/client'

import type { Product } from '@/types/database/catalog'
import type { UnitOfMeasure } from '@/types/enum'

/* ============================================================
   TYPES
============================================================ */

export interface ProductListItem extends Product {
  category_name: string | null
  category_name_am: string | null
  price_group_name: string | null
  price_group_name_am: string | null
}

/* ============================================================
   SUPABASE RELATION TYPES
============================================================ */

interface CategoryRelation {
  id: string
  name: string | null
  name_am: string | null
}

interface PriceGroupRelation {
  id: string
  name: string | null
  name_am: string | null
  amount: number | null
}

interface ProductQueryRow extends Product {
  categories:
    | CategoryRelation
    | CategoryRelation[]
    | null

  price_groups:
    | PriceGroupRelation
    | PriceGroupRelation[]
    | null
}

/* ============================================================
   CREATE PRODUCT PAYLOAD
============================================================ */

export interface CreateProductPayload {
  business_id: string
  category_id: string

  name: string
  name_am: string

  description?: string | null

  barcode?: string | null
  sku?: string | null

  unit_type?: UnitOfMeasure
  units_per_crate?: number | null

  cost_price?: number
  retail_price: number

  price_type?: 'group' | 'fixed'
  price_group_id?: string | null

  tax_inclusive?: boolean
  is_sold_by_weight?: boolean
  track_inventory?: boolean

  low_stock_alert?: number | null

  image_url?: string | null

  is_active?: boolean
}

/* ============================================================
   UPDATE PRODUCT PAYLOAD
   ------------------------------------------------------------
   Explicit type instead of Partial<Product>.

   Important:
   - undefined = do not update the field
   - null = intentionally clear the field
   - number/string/etc = update the field
============================================================ */

export interface UpdateProductPayload {
  category_id?: string | null

  name?: string
  name_am?: string | null

  description?: string | null

  barcode?: string | null
  sku?: string | null

  unit_type?: UnitOfMeasure

  units_per_crate?: number | null

  cost_price?: number
  retail_price?: number

  price_type?: 'group' | 'fixed'
  price_group_id?: string | null

  tax_inclusive?: boolean
  is_sold_by_weight?: boolean
  track_inventory?: boolean

  low_stock_alert?: number | null

  image_url?: string | null

  is_active?: boolean
}

/* ============================================================
   RELATIONSHIP HELPERS
============================================================ */

function getCategory(
  relation:
    | CategoryRelation
    | CategoryRelation[]
    | null
): CategoryRelation | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function getPriceGroup(
  relation:
    | PriceGroupRelation
    | PriceGroupRelation[]
    | null
): PriceGroupRelation | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

/* ============================================================
   GET PRODUCTS
   ------------------------------------------------------------
   Lightweight product list.

   Inventory quantity is intentionally NOT handled here.
============================================================ */

export async function getProducts(
  businessId: string
): Promise<ProductListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      business_id,
      branch_id,
      category_id,
      name,
      name_am,
      barcode,
      sku,
      unit_type,
      units_per_crate,
      cost_price,
      retail_price,
      tax_inclusive,
      image_url,
      is_active,
      is_sold_by_weight,
      track_inventory,
      low_stock_alert,
      created_at,
      updated_at,
      deleted_at,
      price_group_id,
      price_type,
      description,

      categories (
        id,
        name,
        name_am
      ),

      price_groups (
        id,
        name,
        name_am,
        amount
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[getProducts] Supabase error:',
      error
    )

    throw error
  }

  const rows =
    (data ?? []) as unknown as ProductQueryRow[]

  return rows.map(
    (
      product: ProductQueryRow
    ): ProductListItem => {
      const category =
        getCategory(product.categories)

      const priceGroup =
        getPriceGroup(product.price_groups)

      return {
        ...product,

        category_name:
          category?.name ?? null,

        category_name_am:
          category?.name_am ?? null,

        price_group_name:
          priceGroup?.name ?? null,

        price_group_name_am:
          priceGroup?.name_am ?? null,
      }
    }
  )
}

/* ============================================================
   GET PRODUCT BY ID
   ------------------------------------------------------------
   Full product configuration for Edit Product.
============================================================ */

export async function getProductById(
  productId: string,
  businessId: string
): Promise<ProductListItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      business_id,
      branch_id,
      category_id,
      name,
      name_am,
      barcode,
      sku,
      unit_type,
      units_per_crate,
      cost_price,
      retail_price,
      tax_inclusive,
      image_url,
      is_active,
      is_sold_by_weight,
      track_inventory,
      low_stock_alert,
      created_at,
      updated_at,
      deleted_at,
      price_group_id,
      price_type,
      description,

      categories (
        id,
        name,
        name_am
      ),

      price_groups (
        id,
        name,
        name_am,
        amount
      )
    `)
    .eq('id', productId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error(
      '[getProductById] Supabase error:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error('Product not found')
  }

  const product =
    data as unknown as ProductQueryRow

  const category =
    getCategory(product.categories)

  const priceGroup =
    getPriceGroup(product.price_groups)

  return {
    ...product,

    category_name:
      category?.name ?? null,

    category_name_am:
      category?.name_am ?? null,

    price_group_name:
      priceGroup?.name ?? null,

    price_group_name_am:
      priceGroup?.name_am ?? null,
  }
}

/* ============================================================
   CREATE PRODUCT
============================================================ */

export async function createProduct(
  payload: CreateProductPayload
): Promise<Product> {
  const supabase = await createClient()

  const {
    business_id,
    category_id,

    name,
    name_am,

    description,

    barcode,
    sku,

    unit_type,
    units_per_crate,

    cost_price,
    retail_price,

    price_type,
    price_group_id,

    tax_inclusive,
    is_sold_by_weight,
    track_inventory,

    low_stock_alert,

    image_url,

    is_active,
  } = payload

  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id,
      category_id,

      name: name.trim(),

      name_am:
        name_am.trim(),

      description:
        description?.trim() || null,

      barcode:
        barcode?.trim() || null,

      sku:
        sku?.trim() || null,

      unit_type:
        unit_type ?? 'piece',

      units_per_crate:
        units_per_crate ?? null,

      cost_price:
        cost_price ?? 0,

      retail_price,

      price_type:
        price_type ?? 'fixed',

      price_group_id:
        price_group_id ?? null,

      tax_inclusive:
        tax_inclusive ?? true,

      is_sold_by_weight:
        is_sold_by_weight ?? false,

      track_inventory:
        track_inventory ?? true,

      low_stock_alert:
        low_stock_alert ?? null,

      image_url:
        image_url?.trim() || null,

      is_active:
        is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error(
      '[createProduct] Supabase error:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Product was not created'
    )
  }

  return data as Product
}

/* ============================================================
   UPDATE PRODUCT
   ------------------------------------------------------------
   Updates product configuration only.

   Inventory quantity is NOT changed here.
============================================================ */

export async function updateProduct(
  productId: string,
  businessId: string,
  updates: UpdateProductPayload
): Promise<Product> {
  const supabase = await createClient()

  /*
   * Only fields declared in UpdateProductPayload
   * can reach this function.
   *
   * We still create a clean object before sending it
   * to Supabase.
   */

  const cleanedUpdates: UpdateProductPayload = {
    ...updates,
  }

  /* ----------------------------------------------------------
     STRING CLEANING
  ---------------------------------------------------------- */

  if (
    typeof cleanedUpdates.name ===
    'string'
  ) {
    cleanedUpdates.name =
      cleanedUpdates.name.trim()
  }

  if (
    typeof cleanedUpdates.name_am ===
    'string'
  ) {
    cleanedUpdates.name_am =
      cleanedUpdates.name_am.trim()
  }

  if (
    typeof cleanedUpdates.description ===
    'string'
  ) {
    cleanedUpdates.description =
      cleanedUpdates.description.trim() ||
      null
  }

  if (
    typeof cleanedUpdates.barcode ===
    'string'
  ) {
    cleanedUpdates.barcode =
      cleanedUpdates.barcode.trim() ||
      null
  }

  if (
    typeof cleanedUpdates.sku ===
    'string'
  ) {
    cleanedUpdates.sku =
      cleanedUpdates.sku.trim() ||
      null
  }

  if (
    typeof cleanedUpdates.image_url ===
    'string'
  ) {
    cleanedUpdates.image_url =
      cleanedUpdates.image_url.trim() ||
      null
  }

  /* ----------------------------------------------------------
     REMOVE UNDEFINED VALUES
     ----------------------------------------------------------
     Supabase should only receive fields the caller
     actually wants to update.
  ---------------------------------------------------------- */

  const updateData = Object.fromEntries(
    Object.entries(cleanedUpdates).filter(
      ([, value]) =>
        value !== undefined
    )
  )

  /* ----------------------------------------------------------
     UPDATE
  ---------------------------------------------------------- */

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    console.error(
      '[updateProduct] Supabase error:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Product was not updated'
    )
  }

  return data as Product
}

/* ============================================================
   DELETE PRODUCT
   ------------------------------------------------------------
   Soft delete only.

   IMPORTANT:
   No inventory quantity is changed.
   No inventory movement is created.
============================================================ */

export async function deleteProduct(
  productId: string,
  businessId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({
      deleted_at:
        new Date().toISOString(),

      is_active: false,
    })
    .eq('id', productId)
    .eq('business_id', businessId)
    .is('deleted_at', null)

  if (error) {
    console.error(
      '[deleteProduct] Supabase error:',
      error
    )

    throw error
  }
}
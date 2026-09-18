// src/queries/useCategoryQueries.ts

'use client'

import createClient from '@/lib/supabase/client'
import type { Category } from '@/types/database/catalog'

// ============================================================
// TYPES
// ============================================================

export interface CategoryProductRelation {
  id: string
  name: string
}

export interface CategoryWithProducts extends Category {
  products?: CategoryProductRelation[]
}

export interface CreateCategoryPayload {
  business_id: string
  name: string
  name_am?: string | null
  icon?: string | null
  color?: string | null
  sort_order?: number
}

export interface UpdateCategoryPayload {
  name?: string
  name_am?: string | null
  icon?: string | null
  color?: string | null
  sort_order?: number
  is_active?: boolean
}

// ============================================================
// DEFAULTS
// ============================================================

const DEFAULT_CATEGORY_ICON = '📦'
const DEFAULT_CATEGORY_COLOR = '#8B2635'

// ============================================================
// GET ALL CATEGORIES
// ============================================================

export async function getCategories(
  businessId: string
): Promise<CategoryWithProducts[]> {
  if (!businessId) {
    throw new Error('Business ID is required')
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      products (
        id,
        name
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getCategories] Failed to load categories:', {
      businessId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return (data ?? []) as CategoryWithProducts[]
}

// ============================================================
// GET CATEGORY BY ID
// ============================================================

export async function getCategoryById(
  categoryId: string,
  businessId: string
): Promise<Category> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  if (!businessId) {
    throw new Error('Business ID is required')
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('[getCategoryById] Failed to load category:', {
      categoryId,
      businessId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(`Failed to fetch category: ${error.message}`)
  }

  return data as Category
}

// ============================================================
// CREATE CATEGORY
// ============================================================

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category> {
  if (!payload.business_id) {
    throw new Error('Business ID is required')
  }

  const name = payload.name?.trim()

  if (!name) {
    throw new Error('Category name cannot be empty')
  }

  const nameAm = payload.name_am?.trim() || null

  const icon =
    payload.icon?.trim() || DEFAULT_CATEGORY_ICON

  const color =
    payload.color?.trim() || DEFAULT_CATEGORY_COLOR

  const sortOrder =
    Number.isFinite(payload.sort_order)
      ? Number(payload.sort_order)
      : 0

  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .insert({
      business_id: payload.business_id,
      name,
      name_am: nameAm,
      icon,
      color,
      sort_order: sortOrder,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createCategory] Failed to create category:', {
      businessId: payload.business_id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(`Failed to create category: ${error.message}`)
  }

  if (!data) {
    throw new Error('Category was not created')
  }

  return data as Category
}

// ============================================================
// UPDATE CATEGORY
// ============================================================

export async function updateCategory(
  categoryId: string,
  businessId: string,
  payload: UpdateCategoryPayload
): Promise<Category> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  if (!businessId) {
    throw new Error('Business ID is required')
  }

  // ----------------------------------------------------------
  // Build a clean update object.
  //
  // IMPORTANT:
  // business_id, id, created_at and deleted_at are intentionally
  // not accepted here.
  // ----------------------------------------------------------

  const updates: UpdateCategoryPayload = {}

  if (payload.name !== undefined) {
    const name = payload.name.trim()

    if (!name) {
      throw new Error('Category name cannot be empty')
    }

    updates.name = name
  }

  if (payload.name_am !== undefined) {
    updates.name_am = payload.name_am?.trim() || null
  }

  if (payload.icon !== undefined) {
    updates.icon =
      payload.icon?.trim() || DEFAULT_CATEGORY_ICON
  }

  if (payload.color !== undefined) {
    updates.color =
      payload.color?.trim() || DEFAULT_CATEGORY_COLOR
  }

  if (payload.sort_order !== undefined) {
    if (!Number.isFinite(payload.sort_order)) {
      throw new Error('Category sort order must be a valid number')
    }

    updates.sort_order = Number(payload.sort_order)
  }

  if (payload.is_active !== undefined) {
    updates.is_active = payload.is_active
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No category changes were provided')
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) {
    console.error('[updateCategory] Failed to update category:', {
      categoryId,
      businessId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(`Failed to update category: ${error.message}`)
  }

  if (!data) {
    throw new Error(
      'Category was not updated or is not accessible.'
    )
  }

  return data as Category
}

// ============================================================
// DELETE CATEGORY
// ============================================================
//
// Soft delete only.
//
// Database row remains:
//
//   deleted_at = timestamp
//   is_active  = false
//
// The database RLS policy remains the final authorization layer.
// ============================================================

export async function deleteCategory(
  categoryId: string,
  businessId?: string
): Promise<boolean> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  const supabase = createClient()

  let query = supabase
    .from('categories')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', categoryId)
    .is('deleted_at', null)

  // ----------------------------------------------------------
  // Business scope
  //
  // businessId is optional here for backward compatibility with
  // the existing category list page.
  //
  // When provided, the update is explicitly scoped to the
  // business. RLS still remains the final authorization layer.
  // ----------------------------------------------------------

  if (businessId) {
    query = query.eq('business_id', businessId)
  }

  const { data, error } = await query
    .select(`
      id,
      business_id,
      name,
      deleted_at,
      is_active
    `)
    .single()

  if (error) {
    console.error('[deleteCategory] Failed to delete category:', {
      categoryId,
      businessId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(`Failed to delete category: ${error.message}`)
  }

  if (!data) {
    throw new Error(
      'Category was not deleted. It may already be deleted or is not accessible.'
    )
  }

  console.log('[deleteCategory] Category soft-deleted:', {
    categoryId: data.id,
    businessId: data.business_id,
    deletedAt: data.deleted_at,
  })

  return true
}
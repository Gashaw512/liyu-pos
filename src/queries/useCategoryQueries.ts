// src/queries/useCategoryQueries.ts

'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
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
  group_type?: string | null
  sort_order?: number
}

export type UpdateCategoryPayload = Partial<
  Omit<Category, 'id' | 'business_id' | 'created_at'>
>

// ============================================================
// GET ALL CATEGORIES
// ============================================================

export async function getCategories(
  businessId: string
): Promise<CategoryWithProducts[]> {
  if (!businessId) {
    throw new Error('Business ID is required')
  }

  const supabase = getSupabaseBrowserClient()

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
    console.error('[getCategories] Error:', error)

    throw new Error(
      `Failed to fetch categories: ${error.message}`
    )
  }

  return (data as CategoryWithProducts[]) ?? []
}

// ============================================================
// GET CATEGORY BY ID
// ============================================================

export async function getCategoryById(
  categoryId: string
): Promise<Category> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error(
      `[getCategoryById] Error for ID ${categoryId}:`,
      error
    )

    throw new Error(
      `Failed to fetch category: ${error.message}`
    )
  }

  return data as Category
}

// ============================================================
// CREATE CATEGORY
// ============================================================

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category> {
  // ----------------------------------------------------------
  // Validate input
  // ----------------------------------------------------------

  if (!payload.business_id) {
    throw new Error('Business ID is required')
  }

  const name = payload.name?.trim()

  if (!name) {
    throw new Error('Category name cannot be empty')
  }

  const supabase = getSupabaseBrowserClient()

  // ----------------------------------------------------------
  // Insert
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from('categories')
    .insert({
      business_id: payload.business_id,
      name,
      name_am: payload.name_am?.trim() || null,
      icon: payload.icon || '📦',
      color: payload.color || '#8B2635',
      group_type: payload.group_type || null,
      sort_order: payload.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createCategory] Error:', error)

    throw new Error(
      `Failed to create category: ${error.message}`
    )
  }

  return data as Category
}

// ============================================================
// UPDATE CATEGORY
// ============================================================

export async function updateCategory(
  categoryId: string,
  payload: UpdateCategoryPayload
): Promise<Category> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    console.error(
      `[updateCategory] Error for ID ${categoryId}:`,
      error
    )

    throw new Error(
      `Failed to update category: ${error.message}`
    )
  }

  return data as Category
}

// ============================================================
// DELETE CATEGORY
// ============================================================
//
// SOFT DELETE ONLY.
//
// The row remains in the database.
//
// Before:
//   deleted_at = NULL
//   is_active  = TRUE
//
// After:
//   deleted_at = current timestamp
//   is_active  = FALSE
//
// Authorization is enforced by Supabase RLS.
//
// ============================================================

export async function deleteCategory(
  categoryId: string
): Promise<boolean> {
  if (!categoryId) {
    throw new Error('Category ID is required')
  }

  const supabase = getSupabaseBrowserClient()

  // ----------------------------------------------------------
  // Perform soft delete
  // ----------------------------------------------------------
  //
  // IMPORTANT:
  // Do not perform a separate frontend permission check here.
  //
  // The database RLS policy must verify:
  //
  //   1. User belongs to the same business
  //   2. User has the required role
  //   3. Category is currently active
  //
  // The frontend only requests the update.
  // ----------------------------------------------------------

  const deletedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('categories')
    .update({
      deleted_at: deletedAt,
      is_active: false,
    })
    .eq('id', categoryId)
    .is('deleted_at', null)
    .select(
      'id, business_id, name, deleted_at, is_active'
    )
    .single()

  // ----------------------------------------------------------
  // Database / RLS error
  // ----------------------------------------------------------

  if (error) {
    console.error('[deleteCategory] Soft delete failed:', {
      categoryId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })

    throw new Error(
      `Failed to delete category: ${error.message}`
    )
  }

  // ----------------------------------------------------------
  // Safety check
  // ----------------------------------------------------------

  if (!data) {
    throw new Error(
      'Category was not deleted. It may already be deleted or is not accessible to the current user.'
    )
  }

  // ----------------------------------------------------------
  // Success
  // ----------------------------------------------------------

  console.log('[deleteCategory] Soft delete successful:', {
    categoryId,
    deletedAt: data.deleted_at,
  })

  return true
}
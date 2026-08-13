'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Category } from '@/types/database/catalog'

// Dedicated type definitions for sub-queries and payloads
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

/**
 * Fetches active categories for a business along with child products.
 * Maintains nested lookup logic and dual-column sorting.
 */
export async function getCategories(
  businessId: string
): Promise<CategoryWithProducts[]> {
  if (!businessId) throw new Error('Business ID is required')

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
    console.error('[getCategories] Error:', error.message)
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return (data as CategoryWithProducts[]) ?? []
}

/**
 * Fetches a single category record by its unique ID.
 */
export async function getCategoryById(
  categoryId: string
): Promise<Category> {
  if (!categoryId) throw new Error('Category ID is required')

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error(`[getCategoryById] Error for ID ${categoryId}:`, error.message)
    throw new Error(`Failed to fetch category: ${error.message}`)
  }

  return data as Category
}

/**
 * Inserts a new category with POS default fallbacks and input sanitization.
 */
export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category> {
  if (!payload.business_id) throw new Error('Business ID is required')
  if (!payload.name?.trim()) throw new Error('Category name cannot be empty')

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      business_id: payload.business_id,
      name: payload.name.trim(),
      name_am: payload.name_am ? payload.name_am.trim() : null,
      icon: payload.icon || '📦',
      color: payload.color || '#8B2635',
      group_type: payload.group_type || null,
      sort_order: payload.sort_order ?? 0,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('[createCategory] Error:', error.message)
    throw new Error(`Failed to create category: ${error.message}`)
  }

  return data as Category
}

/**
 * Updates selective category fields.
 */
export async function updateCategory(
  categoryId: string,
  payload: UpdateCategoryPayload
): Promise<Category> {
  if (!categoryId) throw new Error('Category ID is required')

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) {
    console.error(`[updateCategory] Error for ID ${categoryId}:`, error.message)
    throw new Error(`Failed to update category: ${error.message}`)
  }

  return data as Category
}

/**
 * Performs a soft delete by timestamping deleted_at and deactivating the record.
 */
export async function deleteCategory(categoryId: string): Promise<boolean> {
  if (!categoryId) throw new Error('Category ID is required')

  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('categories')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false
    })
    .eq('id', categoryId)

  if (error) {
    console.error(`[deleteCategory] Error for ID ${categoryId}:`, error.message)
    throw new Error(`Failed to delete category: ${error.message}`)
  }

  return true
}
import { supabase } from '@/lib/supabase/client'
import type { Category } from '@/types/database/catalog'

export async function getCategories(
  businessId: string
): Promise<any[]> {
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

  if (error) throw error

  return data ?? []
}




export async function getCategoryById(
  categoryId: string
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (error) throw error

  return data as Category
}

export async function createCategory(payload: {
  business_id: string

  name: string

  name_am?: string | null

  icon?: string | null

  color?: string | null

  group_type?: string | null

  sort_order?: number
}) {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      business_id: payload.business_id,

      name: payload.name.trim(),

      name_am: payload.name_am || null,

      icon: payload.icon || '📦',

      color: payload.color || '#8B2635',

      group_type: payload.group_type || null,

      sort_order: payload.sort_order ?? 0,

      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateCategory(
  categoryId: string,
  payload: Partial<Category>
) {
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function deleteCategory(
  categoryId: string
) {
  const { error } = await supabase
    .from('categories')
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', categoryId)

  if (error) throw error

  return true
}





// // src/queries/useCategoryQueries.ts
// import createClient from '@/lib/supabase/client'
// import type { Category } from '@/types/database/catalog'

// const supabase = createClient()

// export async function getCategories(businessId: string): Promise<Category[]> {
//   const { data, error } = await supabase
//     .from('categories')
//     .select('*')
//     .eq('business_id', businessId)
//     .is('deleted_at', null)
//     .order('sort_order', { ascending: true })

//   if (error) throw error

//   return data ?? []
// }

// export async function createCategory(payload: {
//   business_id: string
//   name: string
//   name_am: string
//   icon?: string
//   color?: string
//   sort_order?: number
// }) {
//   const { data, error } = await supabase
//     .from('categories')
//     .insert({
//       business_id: payload.business_id,
//       name: payload.name.trim(),
//       name_am: payload.name_am.trim(),
//       icon: payload.icon ?? '📦',
//       color: payload.color ?? '#8B2635',
//       sort_order: payload.sort_order ?? 0,
//       is_active: true
//     })
//     .select()
//     .single()

//   if (error) throw error

//   return data
// }

// export async function deleteCategory(id: string) {
//   const { error } = await supabase
//     .from('categories')
//     .update({ deleted_at: new Date().toISOString() })
//     .eq('id', id)

//   if (error) throw error

//   return true
// }
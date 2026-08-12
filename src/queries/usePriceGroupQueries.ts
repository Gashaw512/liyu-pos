// src/queries/usePriceGroupQueries.ts

import createClient from '@/lib/supabase/client'

const supabase = createClient()

export interface CreatePriceGroupPayload {
  business_id: string
  name: string
  name_am?: string
  amount: number
}

export interface UpdatePriceGroupPayload {
  name?: string
  name_am?: string
  amount?: number
  is_active?: boolean
}

export async function getPriceGroups(
  businessId: string
) {
  const { data, error } = await supabase
    .from('price_groups')
    .select(`
      *,
      products (
        id,
        name,
        price_type
      )
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('name')

  if (error) throw error

  return data ?? []
}

export async function getPriceGroupById(
  id: string
) {
  const { data, error } = await supabase
    .from('price_groups')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function createPriceGroup(
  payload: CreatePriceGroupPayload
) {
  const { data, error } = await supabase
    .from('price_groups')
    .insert({
      business_id: payload.business_id,
      name: payload.name.trim(),
      name_am: payload.name_am?.trim() || null,
      amount: payload.amount,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('createPriceGroup error', error)
    throw error
  }

  return data
}

export async function updatePriceGroup(
  id: string,
  payload: UpdatePriceGroupPayload
) {
  const { data, error } = await supabase
    .from('price_groups')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function deletePriceGroup(
  id: string
) {
  // Remove product links first
  const { error: unlinkError } = await supabase
    .from('products')
    .update({
      price_group_id: null,
      price_type: 'fixed'
    })
    .eq('price_group_id', id)

  if (unlinkError) {
    throw unlinkError
  }

  // Soft delete group
  const { error } = await supabase
    .from('price_groups')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false
    })
    .eq('id', id)

  if (error) {
    throw error
  }

  return true
}
// src/queries/usePriceGroupQueries.ts

import createClient from '@/lib/supabase/client'

const supabase = createClient()

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// AUTH DEBUG HELPER
// ============================================================

async function requireAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('[PRICE GROUPS] Auth lookup failed:', error)
    throw new Error(
      `Authentication check failed: ${error.message}`
    )
  }

  if (!user) {
    console.error(
      '[PRICE GROUPS] No authenticated Supabase user found.'
    )

    throw new Error(
      'Your session is not authenticated. Please sign in again.'
    )
  }

  console.log('[PRICE GROUPS] Authenticated user:', user.id)

  return user
}

// ============================================================
// GET ALL PRICE GROUPS
// ============================================================

export async function getPriceGroups(
  businessId: string
) {
  if (!businessId) {
    throw new Error(
      'Business ID is required to load price groups.'
    )
  }

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

  if (error) {
    console.error('[PRICE GROUPS] getPriceGroups error:', error)
    throw error
  }

  return data ?? []
}

// ============================================================
// GET PRICE GROUP BY ID
// ============================================================

export async function getPriceGroupById(
  id: string
) {
  if (!id) {
    throw new Error(
      'Price group ID is required.'
    )
  }

  const { data, error } = await supabase
    .from('price_groups')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(
      '[PRICE GROUPS] getPriceGroupById error:',
      error
    )

    throw error
  }

  return data
}

// ============================================================
// CREATE PRICE GROUP
// ============================================================

export async function createPriceGroup(
  payload: CreatePriceGroupPayload
) {
  // ----------------------------------------------------------
  // Validate payload
  // ----------------------------------------------------------

  if (!payload.business_id) {
    throw new Error(
      'Business ID is required to create a price group.'
    )
  }

  const name = payload.name.trim()

  if (!name) {
    throw new Error(
      'Price group name is required.'
    )
  }

  if (!Number.isFinite(payload.amount)) {
    throw new Error(
      'Price group amount must be a valid number.'
    )
  }

  if (payload.amount < 0) {
    throw new Error(
      'Price group amount cannot be negative.'
    )
  }

  // ----------------------------------------------------------
  // Confirm browser authentication
  // ----------------------------------------------------------

  const user = await requireAuthenticatedUser()
  

  // ----------------------------------------------------------
  // Debug context
  //
  // IMPORTANT:
  // This only logs information locally.
  // RLS remains the final security boundary.
  // ----------------------------------------------------------

  console.log('[PRICE GROUPS] Creating price group:', {
    user_id: user.id,
    business_id: payload.business_id,
    name,
    amount: payload.amount,
  })

  // ----------------------------------------------------------
  // Insert
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from('price_groups')
    .insert({
      business_id: payload.business_id,
      name,
      name_am: payload.name_am?.trim() || null,
      amount: payload.amount,
      is_active: true,
    })
    .select()
    .single()

  // ----------------------------------------------------------
  // Error handling
  // ----------------------------------------------------------

  if (error) {
    console.error(
      '[PRICE GROUPS] createPriceGroup failed:',
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        user_id: user.id,
        business_id: payload.business_id,
      }
    )

    throw error
  }

  console.log(
    '[PRICE GROUPS] Price group created:',
    data
  )

  return data
}

// ============================================================
// UPDATE PRICE GROUP
// ============================================================

export async function updatePriceGroup(
  id: string,
  payload: UpdatePriceGroupPayload
) {
  if (!id) {
    throw new Error(
      'Price group ID is required.'
    )
  }

  await requireAuthenticatedUser()

  const { data, error } = await supabase
    .from('price_groups')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(
      '[PRICE GROUPS] updatePriceGroup error:',
      error
    )

    throw error
  }

  return data
}

// ============================================================
// DELETE PRICE GROUP
// ============================================================

export async function deletePriceGroup(
  id: string
) {
  if (!id) {
    throw new Error(
      'Price group ID is required.'
    )
  }

  await requireAuthenticatedUser()

  // ----------------------------------------------------------
  // Remove product links first
  // ----------------------------------------------------------

  const { error: unlinkError } = await supabase
    .from('products')
    .update({
      price_group_id: null,
      price_type: 'fixed',
    })
    .eq('price_group_id', id)

  if (unlinkError) {
    console.error(
      '[PRICE GROUPS] Failed to unlink products:',
      unlinkError
    )

    throw unlinkError
  }

  // ----------------------------------------------------------
  // Soft delete price group
  // ----------------------------------------------------------

  const { error } = await supabase
    .from('price_groups')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id)

  if (error) {
    console.error(
      '[PRICE GROUPS] Failed to delete price group:',
      error
    )

    throw error
  }

  return true
}


import { createClient } from '@/lib/supabase/server'

export interface StaffMember {
  id: string
  full_name: string | null
  phone: string | null
  role: string | null
  branch_id: string | null
}

export interface PendingInvite {
  id: string
  code: string
  business_id: string
  branch_id: string | null
  status: 'pending' | 'accepted' | 'expired' | string
  created_at: string
}

/**
 * Fetches active staff profiles associated with a business.
 * MUST be called within Server Components, Server Actions, or Route Handlers.
 */
export async function getStaff(businessId: string): Promise<StaffMember[]> {
  if (!businessId) throw new Error('Business ID is required')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, branch_id')
    .eq('business_id', businessId)
    .order('full_name')

  if (error) {
    console.error('[getStaff] Error:', error.message)
    throw new Error(`Failed to fetch staff members: ${error.message}`)
  }

  return (data as StaffMember[]) ?? []
}

/**
 * Fetches pending staff invitations for a business.
 * MUST be called within Server Components, Server Actions, or Route Handlers.
 */
export async function getPendingInvites(
  businessId: string
): Promise<PendingInvite[]> {
  if (!businessId) throw new Error('Business ID is required')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff_invitations')
    .select('id, code, business_id, branch_id, status, created_at')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingInvites] Error:', error.message)
    throw new Error(`Failed to fetch pending invites: ${error.message}`)
  }

  return (data as PendingInvite[]) ?? []
}
// src/types/database/users.ts

import type { StaffRole } from '../enum'

export interface Profile {
  id: string
  business_id: string | null
  branch_id: string | null
  full_name: string
  phone: string | null
  role: StaffRole
  language: string
  avatar_url: string | null
  is_active: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null

  profile_roles?: ProfileRole[]
}

export interface ProfileRole {
  id: string
  profile_id: string
  role_name: StaffRole
  assigned_at: string
}

/**
 * 🔥 FIXED: matches DB exactly
 */
export interface StaffInvitation {
  id: string
  business_id: string

  staff_name: string
  role_assigned: StaffRole

  phone: string | null

  code: string

  status: 'pending' | 'used' | 'expired'

  expires_at: string | null
  used_at: string | null

  claimed_by_profile_id: string | null

  created_at: string
}
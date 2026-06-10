export interface Profile {}
export interface ProfileRole {}
// export interface StaffInvitation {}

// src/types/database/users.ts

import type { StaffRole } from '../enum';

export interface Profile {
  id: string;

  business_id: string | null;

  branch_id: string | null;

  full_name: string;

  phone: string | null;

  role: StaffRole;

  language: string;

  avatar_url: string | null;

  is_active: boolean;

  last_seen_at: string | null;

  created_at: string;

  updated_at: string;

  deleted_at: string | null;
}

export interface ProfileRole {
  id: string;

  profile_id: string;

  role_name: StaffRole;

  assigned_at: string;
}

export interface StaffInvitation {
  id: string;

  business_id: string;

  created_by_profile_id: string;

  email: string | null;

  phone: string | null;

  code: string;

  role_assigned: StaffRole;

  status: 'pending' | 'used' | 'expired';

  claimed_by_profile_id: string | null;

  used_at: string | null;

  expires_at: string;

  created_at: string;
}
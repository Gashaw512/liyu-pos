import type { StaffRole } from "../enum"

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  role: StaffRole

  profile_roles?: { role_name: StaffRole }[]
}
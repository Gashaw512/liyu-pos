import 'server-only'

import { createHmac } from 'node:crypto'

export function isPasswordRecoverySupportAgent(userId: string): boolean {
  const allowedIds = (process.env.SUPPORT_RECOVERY_ADMIN_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return allowedIds.includes(userId)
}

export function hashSupportRequestIp(ipAddress: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Password recovery server credentials are not configured.')

  return createHmac('sha256', key).update(ipAddress).digest('hex')
}
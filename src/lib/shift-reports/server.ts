import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { createClient } from '@/lib/supabase/server'
import { decryptSecret } from './crypto'
import { isAllowedNotificationRole } from './routing'

export { isAllowedNotificationRole, selectEnabledBusinessRecipients } from './routing'
export { telegramSendDocument, telegramSendMessage } from './telegram'

type SessionClient = Awaited<ReturnType<typeof createClient>>

export async function getAuthorizedProfile(client: SessionClient, allowedRoles: string[] = ['owner', 'manager']) {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { user: null, profile: null, error: 'Unauthorized' as const }
  const { data: profile } = await client.from('profiles').select('id,business_id,branch_id,role,full_name').eq('id', user.id).is('deleted_at', null).maybeSingle()
  if (!profile || !profile.business_id) return { user: null, profile: null, error: 'Business profile is unavailable.' as const }
  if (!isAllowedNotificationRole(profile.role, allowedRoles)) return { user: null, profile: null, error: 'Forbidden' as const }
  return { user, profile, error: null }
}

export function createAdminDatabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server database credentials are not configured.')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getApplicationTelegramBotToken(): string {
  const encryptedToken = process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED
  if (!encryptedToken) throw new Error('The application Telegram bot is not configured.')
  return decryptSecret(encryptedToken)
}

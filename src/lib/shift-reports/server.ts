import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { createClient } from '@/lib/supabase/server'

type SessionClient = Awaited<ReturnType<typeof createClient>>

export async function getAuthorizedProfile(client: SessionClient, allowedRoles: string[] = ['owner', 'manager']) {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { user: null, profile: null, error: 'Unauthorized' as const }
  const { data: profile } = await client.from('profiles').select('id,business_id,branch_id,role,full_name').eq('id', user.id).is('deleted_at', null).maybeSingle()
  if (!profile || !profile.business_id) return { user: null, profile: null, error: 'Business profile is unavailable.' as const }
  if (!allowedRoles.includes(profile.role ?? '')) return { user: null, profile: null, error: 'Forbidden' as const }
  return { user, profile, error: null }
}

export function createAdminDatabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server database credentials are not configured.')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function telegramSendMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }), cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}.`)
}

export async function telegramSendDocument(token: string, chatId: string, file: Buffer, filename: string, caption: string) {
  const form = new FormData()
  form.set('chat_id', chatId)
  form.set('caption', caption.slice(0, 900))
  form.set('document', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), filename)
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(30000) })
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}.`)
}

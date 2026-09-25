import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptSecret, encryptSecret } from '@/lib/shift-reports/crypto'
import { getAuthorizedProfile, telegramSendMessage } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const { data, error } = await client.from('business_notification_settings').select('telegram_enabled,telegram_bot_token_encrypted,telegram_chat_id,whatsapp_enabled,updated_at').eq('business_id', auth.profile!.business_id).maybeSingle()
    if (error) throw error
    return NextResponse.json({ telegramEnabled: data?.telegram_enabled ?? false, telegramTokenConfigured: Boolean(data?.telegram_bot_token_encrypted), telegramChatId: data?.telegram_chat_id ?? '', telegramChatConfigured: Boolean(data?.telegram_chat_id), whatsappEnabled: false, whatsappSupported: false, encryptionReady: Boolean(process.env.MESSAGING_ENCRYPTION_KEY), updatedAt: data?.updated_at ?? null })
  } catch (error) {
    console.error('[shift-reports] config read failed:', error)
    return NextResponse.json({ error: 'Unable to load notification configuration.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const body = await request.json() as { telegramEnabled?: unknown; telegramBotToken?: unknown; telegramChatId?: unknown }
    const enabled = body.telegramEnabled === true
    const suppliedToken = typeof body.telegramBotToken === 'string' ? body.telegramBotToken.trim() : ''
    const chatId = typeof body.telegramChatId === 'string' ? body.telegramChatId.trim() : ''
    const { data: previous, error: readError } = await client.from('business_notification_settings').select('telegram_bot_token_encrypted,telegram_chat_id').eq('business_id', auth.profile!.business_id).maybeSingle()
    if (readError) throw readError
    const encryptedToken = suppliedToken ? encryptSecret(suppliedToken) : previous?.telegram_bot_token_encrypted ?? null
    const recipient = chatId || previous?.telegram_chat_id || null
    if (enabled && (!encryptedToken || !recipient)) return NextResponse.json({ error: 'Enter a Telegram bot token and chat ID before enabling notifications.' }, { status: 400 })
    const { error } = await client.from('business_notification_settings').upsert({ business_id: auth.profile!.business_id, telegram_enabled: enabled, telegram_bot_token_encrypted: encryptedToken, telegram_chat_id: recipient, whatsapp_enabled: false, updated_by: auth.user!.id, updated_at: new Date().toISOString() }, { onConflict: 'business_id' })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[shift-reports] config save failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save notification configuration.' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const { data, error } = await client.from('business_notification_settings').select('telegram_enabled,telegram_bot_token_encrypted,telegram_chat_id').eq('business_id', auth.profile!.business_id).maybeSingle()
    if (error) throw error
    if (!data?.telegram_enabled || !data.telegram_bot_token_encrypted || !data.telegram_chat_id) return NextResponse.json({ error: 'Enable and configure Telegram before sending a test.' }, { status: 400 })
    await telegramSendMessage(decryptSecret(data.telegram_bot_token_encrypted), data.telegram_chat_id, 'Liyu POS test message: Telegram shift reports are connected.')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[shift-reports] Telegram test failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Telegram test message failed.' }, { status: 502 })
  }
}

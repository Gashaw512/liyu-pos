import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getApplicationTelegramBotToken,
  getAuthorizedProfile,
  telegramSendMessage,
} from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const businessId = auth.profile!.business_id!
    const [{ data: settings, error: settingsError }, { data: recipients, error: recipientsError }] = await Promise.all([
      client.from('business_notification_settings').select('telegram_enabled,updated_at').eq('business_id', businessId).maybeSingle(),
      client.from('business_notification_recipients').select('id,label,chat_id,enabled').eq('business_id', businessId).order('created_at'),
    ])
    if (settingsError) throw settingsError
    if (recipientsError) throw recipientsError
    let botConfigured = false
    try { getApplicationTelegramBotToken(); botConfigured = true } catch { /* Report status without exposing deployment secrets. */ }
    return NextResponse.json({
      telegramEnabled: settings?.telegram_enabled ?? false,
      botConfigured,
      recipients: recipients ?? [],
      whatsappEnabled: false,
      whatsappSupported: false,
      encryptionReady: Boolean(process.env.MESSAGING_ENCRYPTION_KEY),
      updatedAt: settings?.updated_at ?? null,
    })
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
    const businessId = auth.profile!.business_id!
    const body = await request.json() as { telegramEnabled?: unknown; recipients?: unknown }
    if (!Array.isArray(body.recipients)) return NextResponse.json({ error: 'Recipients must be a list.' }, { status: 400 })
    if (body.recipients.length > 30) return NextResponse.json({ error: 'A business can configure up to 30 recipients.' }, { status: 400 })
    const recipients = body.recipients.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new Error('Invalid recipient.')
      const row = value as Record<string, unknown>
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      const chatId = typeof row.chatId === 'string' ? row.chatId.trim() : ''
      if (!label || label.length > 80 || !chatId || chatId.length > 128) throw new Error('Each recipient needs a short name and valid Telegram chat ID.')
      return { business_id: businessId, label, chat_id: chatId, enabled: row.enabled !== false, created_by: auth.user!.id, updated_at: new Date().toISOString() }
    })
    if (new Set(recipients.map(row => row.chat_id)).size !== recipients.length) return NextResponse.json({ error: 'The same chat ID cannot be listed twice.' }, { status: 400 })
    const enabled = body.telegramEnabled === true
    if (enabled && !recipients.some(recipient => recipient.enabled)) return NextResponse.json({ error: 'Add at least one enabled recipient before enabling Telegram.' }, { status: 400 })
    if (enabled) getApplicationTelegramBotToken()

    const { data: existing, error: existingError } = await client.from('business_notification_recipients').select('id,chat_id').eq('business_id', businessId)
    if (existingError) throw existingError
    if (recipients.length) {
      const { error } = await client.from('business_notification_recipients').upsert(recipients, { onConflict: 'business_id,chat_id' })
      if (error) throw error
    }
    const keptChatIds = recipients.map(recipient => recipient.chat_id)
    const toDelete = (existing ?? []).filter(recipient => !keptChatIds.includes(recipient.chat_id)).map(recipient => recipient.id)
    if (toDelete.length) {
      const { error } = await client.from('business_notification_recipients').delete().eq('business_id', businessId).in('id', toDelete)
      if (error) throw error
    }
    const { error: settingsError } = await client.from('business_notification_settings').upsert({ business_id: businessId, telegram_enabled: enabled, whatsapp_enabled: false, updated_by: auth.user!.id, updated_at: new Date().toISOString() }, { onConflict: 'business_id' })
    if (settingsError) throw settingsError
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
    const businessId = auth.profile!.business_id!
    const [{ data: settings, error: settingsError }, { data: rows, error: recipientsError }] = await Promise.all([
      client.from('business_notification_settings').select('business_id,telegram_enabled').eq('business_id', businessId).maybeSingle(),
      client.from('business_notification_recipients').select('id,label,chat_id,business_id,enabled').eq('business_id', businessId).eq('enabled', true),
    ])
    if (settingsError) throw settingsError
    if (recipientsError) throw recipientsError
    if (!settings?.telegram_enabled || !rows?.length) return NextResponse.json({ error: 'Enable Telegram and add at least one enabled recipient first.' }, { status: 400 })
    const token = getApplicationTelegramBotToken()
    const recipientResults = await Promise.all(rows.map(async recipient => {
      try {
        await telegramSendMessage(token, recipient.chat_id, `Liyu POS test message for ${recipient.label}: this business is connected to Telegram shift reports.`)
        return { label: recipient.label, success: true }
      } catch (error) {
        return { label: recipient.label, success: false, error: error instanceof Error ? error.message : 'Delivery failed.' }
      }
    }))
    const failed = recipientResults.filter(result => !result.success)
    return NextResponse.json({ success: failed.length === 0, sent: recipientResults.length - failed.length, failed: failed.length, results: recipientResults }, { status: failed.length ? 502 : 200 })
  } catch (error) {
    console.error('[shift-reports] Telegram test failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Telegram test message failed.' }, { status: 502 })
  }
}

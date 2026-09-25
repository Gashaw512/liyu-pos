'use client'

import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Configuration {
  telegramEnabled: boolean
  telegramTokenConfigured: boolean
  telegramChatConfigured: boolean
  telegramChatId: string
  whatsappSupported: boolean
  encryptionReady: boolean
  updatedAt: string | null
}

export default function NotificationSettingsPage() {
  const params = useParams()
  const isAm = String(params.locale || 'en') === 'am'
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [token, setToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const t = (en: string, am: string) => isAm ? am : en

  async function load() {
    const response = await fetch('/api/shift-reports/config', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to load settings.')
    setConfiguration(result)
    setEnabled(result.telegramEnabled)
    setChatId(result.telegramChatId)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(error => setMessage(error.message)) }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/shift-reports/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ telegramEnabled: enabled, telegramBotToken: token, telegramChatId: chatId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.')
      setToken(''); await load(); setMessage(t('Settings saved securely.', 'ቅንብሮቹ በደህና ተቀምጠዋል።'))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save settings.') }
    finally { setBusy(false) }
  }

  async function testMessage() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/shift-reports/config', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Test message failed.')
      setMessage(t('Test message delivered to Telegram.', 'የሙከራ መልዕክቱ በቴሌግራም ተልኳል።'))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Test message failed.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-cream-50 px-4 py-5 pb-24 sm:px-6">
    <header className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-berbere-50 p-2.5 text-berbere-600"><BellRing className="h-5 w-5" /></div><div><h1 className="text-lg font-black text-coffee-800">{t('Shift report messages', 'የፈረቃ ሪፖርት መልዕክቶች')}</h1><p className="mt-1 text-xs text-coffee-500">{t('Send a PDF to the owner when a staff member closes a shift.', 'ሰራተኛ ፈረቃውን ሲዘጋ የPDF ሪፖርት ለባለቤቱ ይላኩ።')}</p></div></div>
    </header>

    <section className="space-y-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
      {configuration && !configuration.encryptionReady && <p role="alert" className="rounded-xl border border-gold-200 bg-gold-50 p-3 text-xs font-bold text-gold-800">{t('Server setup is incomplete: MESSAGING_ENCRYPTION_KEY must be configured before saving a bot token.', 'የserver ቅንብር አልተጠናቀቀም፦ የቦት ቶከን ከመቀመጡ በፊት MESSAGING_ENCRYPTION_KEY መዘጋጀት አለበት።')}</p>}
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Send className="h-4 w-4 text-sky-600" /><h2 className="font-black text-coffee-800">Telegram</h2></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${configuration?.telegramEnabled ? 'bg-berbere-50 text-berbere-700' : 'bg-cream-100 text-coffee-500'}`}>{configuration?.telegramEnabled ? t('Enabled', 'ነቅቷል') : t('Disabled', 'ጠፍቷል')}</span></div>
      <label className="flex min-h-11 items-center gap-3 rounded-xl bg-cream-50 px-3 text-sm font-bold text-coffee-700"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="h-4 w-4 accent-berbere-600" />{t('Send a shift PDF to Telegram after closing', 'ፈረቃ ሲዘጋ የፈረቃ PDF ወደ ቴሌግራም ላክ')}</label>
      <div><label htmlFor="telegram-token" className="mb-1.5 block text-xs font-bold text-coffee-600">{t('Telegram bot token', 'የቴሌግራም ቦት ቶከን')}</label><input id="telegram-token" type="password" autoComplete="new-password" value={token} onChange={event => setToken(event.target.value)} placeholder={configuration?.telegramTokenConfigured ? t('Saved securely. Leave blank to keep it.', 'በደህና ተቀምጧል። ለመጠበቅ ባዶ ይተዉት።') : '123456:ABC…'} className="h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-sm outline-none focus:border-berbere-400" /><p className="mt-1 text-[10px] text-coffee-400">{t('The token is encrypted on the server and never shown again.', 'ቶከኑ በserver ይመሰጠራል እና እንደገና አይታይም።')}</p></div>
      <div><label htmlFor="telegram-chat" className="mb-1.5 block text-xs font-bold text-coffee-600">{t('Owner chat ID', 'የባለቤቱ Chat ID')}</label><input id="telegram-chat" value={chatId} onChange={event => setChatId(event.target.value)} placeholder="123456789" className="h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-sm outline-none focus:border-berbere-400" /></div>
      {configuration?.telegramTokenConfigured && <p className="text-[10px] font-bold text-berbere-700">{t('Bot token saved securely', 'የቦት ቶከን በደህና ተቀምጧል')} · {t('Recipient', 'ተቀባይ')}: {configuration.telegramChatConfigured ? configuration.telegramChatId : '—'}{configuration.updatedAt ? ` · ${new Date(configuration.updatedAt).toLocaleString()}` : ''}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !configuration || !configuration.encryptionReady} onClick={() => void save()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('Save settings', 'ቅንብር አስቀምጥ')}</button><button type="button" disabled={busy || !configuration?.telegramEnabled} onClick={() => void testMessage()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 text-sm font-bold text-coffee-700 disabled:opacity-50"><MessageCircle className="h-4 w-4" />{t('Send test message', 'የሙከራ መልዕክት ላክ')}</button></div>
    </section>

    <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-berbere-500" /><h2 className="font-black text-coffee-800">WhatsApp</h2></div><p className="mt-2 text-xs leading-5 text-coffee-500">{t('WhatsApp delivery is not available yet. This app does not have Meta Cloud API credentials or document delivery configured.', 'የWhatsApp መላኪያ ገና አልተዘጋጀም። የMeta Cloud API ቅንብር እና የሰነድ መላኪያ የለም።')}</p></section>
    {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm font-bold text-coffee-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-berbere-600" />{message}</p>}
  </main>
}

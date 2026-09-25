'use client'

import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Loader2, MessageCircle, Plus, Send, Trash2 } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Recipient {
  id?: string
  label: string
  chatId: string
  enabled: boolean
}

interface Configuration {
  telegramEnabled: boolean
  botConfigured: boolean
  recipients: Array<{ id: string; label: string; chat_id: string; enabled: boolean }>
  whatsappSupported: boolean
  updatedAt: string | null
}

export default function NotificationSettingsPage() {
  const params = useParams()
  const isAm = String(params.locale || 'en') === 'am'
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
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
    setRecipients((result.recipients ?? []).map((recipient: Configuration['recipients'][number]) => ({ id: recipient.id, label: recipient.label, chatId: recipient.chat_id, enabled: recipient.enabled })))
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(error => setMessage(error.message)) }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function updateRecipient(index: number, changes: Partial<Recipient>) {
    setRecipients(current => current.map((recipient, itemIndex) => itemIndex === index ? { ...recipient, ...changes } : recipient))
  }

  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/shift-reports/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ telegramEnabled: enabled, recipients: recipients.map(({ label, chatId, enabled: recipientEnabled }) => ({ label, chatId, enabled: recipientEnabled })) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.')
      await load(); setMessage(t('Business Telegram settings saved.', 'የንግድ ቴሌግራም ቅንብሮች ተቀምጠዋል።'))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save settings.') }
    finally { setBusy(false) }
  }

  async function testMessage() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/shift-reports/config', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Test failed: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`)
      setMessage(t(`Test messages delivered to ${result.sent} business recipient(s).`, `የሙከራ መልዕክቶች ለ${result.sent} ተቀባይ(ዎች) ተልከዋል።`))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Test message failed.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-cream-50 px-4 py-5 pb-24 sm:px-6">
    <header className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-berbere-50 p-2.5 text-berbere-600"><BellRing className="h-5 w-5" /></div><div><h1 className="text-lg font-black text-coffee-800">{t('Shift report messages', 'የፈረቃ ሪፖርት መልዕክቶች')}</h1><p className="mt-1 text-xs text-coffee-500">{t('Manage Telegram recipients for this business. Reports are never sent to another business.', 'የዚህን ንግድ የቴሌግራም ተቀባዮች ያስተዳድሩ። ሪፖርቶች ወደ ሌላ ንግድ አይላኩም።')}</p></div></div>
    </header>

    <section className="space-y-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Send className="h-4 w-4 text-sky-600" /><h2 className="font-black text-coffee-800">Telegram</h2></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${configuration?.telegramEnabled ? 'bg-berbere-50 text-berbere-700' : 'bg-cream-100 text-coffee-500'}`}>{configuration?.telegramEnabled ? t('Enabled for this business', 'ለዚህ ንግድ ነቅቷል') : t('Disabled for this business', 'ለዚህ ንግድ ጠፍቷል')}</span></div>
      <p className={`rounded-xl p-3 text-xs font-bold ${configuration?.botConfigured ? 'bg-berbere-50 text-berbere-700' : 'bg-gold-50 text-gold-800'}`}>{configuration?.botConfigured ? t('Application Telegram bot is configured. This business has its own recipient list.', 'የመተግበሪያው ቴሌግራም ቦት ተዘጋጅቷል። ይህ ንግድ የራሱ ተቀባይ ዝርዝር አለው።') : t('The shared application bot is not configured on the server yet.', 'የመተግበሪያው የጋራ ቦት በserver ላይ ገና አልተዘጋጀም።')}</p>
      <label className="flex min-h-11 items-center gap-3 rounded-xl bg-cream-50 px-3 text-sm font-bold text-coffee-700"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="h-4 w-4 accent-berbere-600" />{t('Send shift PDFs to this business’s enabled recipients', 'የፈረቃ PDF ለዚህ ንግድ ነቅተው ያሉ ተቀባዮች ላክ')}</label>

      <div className="space-y-3">
        {recipients.map((recipient, index) => <div key={recipient.id ?? index} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-cream-200 p-3 sm:grid-cols-[1fr_1.2fr_auto_auto]">
          <label className="col-span-2 min-w-0 text-[10px] font-bold text-coffee-500 sm:col-span-1">{t('Name', 'ስም')}<input value={recipient.label} onChange={event => updateRecipient(index, { label: event.target.value })} className="mt-1 h-10 w-full min-w-0 rounded-lg border border-cream-300 px-2 text-xs text-coffee-800" /></label>
          <label className="col-span-2 min-w-0 text-[10px] font-bold text-coffee-500 sm:col-span-1">{t('Telegram chat ID', 'የቴሌግራም Chat ID')}<input value={recipient.chatId} onChange={event => updateRecipient(index, { chatId: event.target.value })} placeholder="123456789" className="mt-1 h-10 w-full min-w-0 rounded-lg border border-cream-300 px-2 text-xs text-coffee-800" /></label>
          <label className="flex h-10 items-center gap-1 text-[10px] font-bold text-coffee-600"><input type="checkbox" checked={recipient.enabled} onChange={event => updateRecipient(index, { enabled: event.target.checked })} className="h-4 w-4 accent-berbere-600" />{t('On', 'ነቅቷል')}</label>
          <button type="button" aria-label={t('Remove recipient', 'ተቀባይ አስወግድ')} onClick={() => setRecipients(current => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg text-coffee-400 hover:bg-gold-50 hover:text-gold-700"><Trash2 className="h-4 w-4" /></button>
        </div>)}
        <button type="button" disabled={recipients.length >= 30} onClick={() => setRecipients(current => [...current, { label: '', chatId: '', enabled: true }])} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-cream-400 px-3 text-xs font-bold text-coffee-600 disabled:opacity-40"><Plus className="h-4 w-4" />{t('Add recipient', 'ተቀባይ ጨምር')}</button>
      </div>
      <p className="text-[10px] leading-4 text-coffee-400">{t('Recipients are saved separately for each business. The bot token is a single encrypted server secret and is never shown here.', 'ተቀባዮች ለእያንዳንዱ ንግድ ለየብቻ ይቀመጣሉ። የቦት ቶከኑ አንድ የተመሰጠረ የserver ሚስጥር ነው እና እዚህ አይታይም።')}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !configuration || !configuration.botConfigured} onClick={() => void save()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('Save business settings', 'የንግድ ቅንብር አስቀምጥ')}</button><button type="button" disabled={busy || !configuration?.telegramEnabled} onClick={() => void testMessage()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 text-sm font-bold text-coffee-700 disabled:opacity-50"><MessageCircle className="h-4 w-4" />{t('Test all enabled recipients', 'ሁሉንም ነቅተው ያሉ ተቀባዮች ሞክር')}</button></div>
    </section>

    <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-berbere-500" /><h2 className="font-black text-coffee-800">WhatsApp</h2></div><p className="mt-2 text-xs leading-5 text-coffee-500">{t('WhatsApp delivery is not available yet. This app does not have Meta Cloud API credentials or document delivery configured.', 'የWhatsApp መላኪያ ገና አልተዘጋጀም። የMeta Cloud API ቅንብር እና የሰነድ መላኪያ የለም።')}</p></section>
    {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm font-bold text-coffee-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-berbere-600" />{message}</p>}
  </main>
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing, ChefHat, Clock3, Loader2, RefreshCw, Volume2, VolumeX, X } from 'lucide-react'
import { useParams } from 'next/navigation'
import { getNewTicketIds } from '@/lib/kitchen/newTicketNotifications'

type Ticket = {
  id: string
  order_id: string
  table_number: string
  waiter_name: string
  item_payload: Array<{ product_id: string; name: string; name_am?: string | null; quantity: number }>
  destination_station: 'kitchen' | 'bar'
  print_status: 'pending' | 'sent' | 'failed'
  preparation_status: 'pending' | 'preparing' | 'ready'
  created_at: string
}

export default function KitchenDisplayPage() {
  const params = useParams()
  const isAm = String(params.locale ?? 'en') === 'am'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [readyTickets, setReadyTickets] = useState<Ticket[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [newOrderMessage, setNewOrderMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const refreshLockRef = useRef(false)
  const [error, setError] = useState('')
  const [ticketFeedback, setTicketFeedback] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [clock, setClock] = useState(0)
  const previouslySeenTicketIds = useRef<Set<string> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundSettingsRef = useRef({ enabled: soundEnabled, muted })

  const playNotificationSound = useCallback(async () => {
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      if (context.state === 'suspended') await context.resume()
      if (context.state !== 'running') return false

      const now = context.currentTime
      const output = context.createGain()
      output.gain.setValueAtTime(Math.max(0.05, volume), now)
      output.gain.exponentialRampToValueAtTime(0.01, now + 0.75)
      output.connect(context.destination)
      for (const [index, frequency] of [880, 1174].entries()) {
        const oscillator = context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, now)
        oscillator.connect(output)
        oscillator.start(now + index * 0.18)
        oscillator.stop(now + index * 0.18 + 0.16)
      }
      return true
    } catch {
      return false
    }
  }, [volume])
  const soundPlayerRef = useRef(playNotificationSound)

  useEffect(() => {
    soundSettingsRef.current = { enabled: soundEnabled, muted }
  }, [soundEnabled, muted])

  useEffect(() => {
    soundPlayerRef.current = playNotificationSound
  }, [playNotificationSound])

  const loadTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/kitchen/tickets', { cache: 'no-store' })
      const result = await response.json() as { tickets?: Ticket[]; readyTickets?: Ticket[]; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not load kitchen tickets.')
      const activeTickets = result.tickets ?? []
      const nextReadyTickets = result.readyTickets ?? []
      const returnedTickets = [...activeTickets, ...nextReadyTickets]
      const currentIds = returnedTickets.map((ticket) => ticket.id)
      const seen = previouslySeenTicketIds.current
      const newIds = getNewTicketIds(seen, currentIds)
      if (seen === null) {
        previouslySeenTicketIds.current = new Set(currentIds)
      } else {
        for (const id of currentIds) seen.add(id)
        if (newIds.length > 0) {
          const firstNew = returnedTickets.find((ticket) => ticket.id === newIds[0])
          setNewOrderMessage(isAm
            ? `አዲስ ትዕዛዝ መጥቷል፦ ${firstNew?.table_number ?? ''}`
            : `New order${newIds.length > 1 ? `s (${newIds.length})` : ''} for ${firstNew?.table_number ?? 'a table'}`)
          if (soundSettingsRef.current.enabled && !soundSettingsRef.current.muted) {
            void soundPlayerRef.current()
          }
        }
      }
      setTickets(activeTickets)
      setReadyTickets(nextReadyTickets)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load kitchen tickets.')
    } finally {
      setLoading(false)
    }
  }, [isAm])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadTickets(), 0)
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(initialLoad)
    }
  }, [loadTickets])

  useEffect(() => () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
    try {
      setMuted(localStorage.getItem('liyu:kitchen:muted') === 'true')
      const savedVolume = Number(localStorage.getItem('liyu:kitchen:volume'))
      if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setVolume(savedVolume)
    } catch { /* audio preferences are optional */ }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const enableSound = async () => {
    const played = await playNotificationSound()
    if (played) setSoundEnabled(true)
    else setError(isAm
      ? 'ድምፅ አልተነቃም። የመሣሪያውን ድምፅ ያረጋግጡ እና እንደገና ይሞክሩ።'
      : 'Sound did not start. Check the device volume and try again.')
  }

  const testSound = async () => {
    const played = await playNotificationSound()
    if (played) {
      setSoundEnabled(true)
      setError('')
    } else {
      setError(isAm
        ? 'ድምፅ አልተነቃም። የመሣሪያውን ድምፅ ያረጋግጡ እና እንደገና ይሞክሩ።'
        : 'Sound did not start. Check the device volume and try again.')
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    try { localStorage.setItem('liyu:kitchen:muted', String(next)) } catch { /* optional */ }
  }

  const changeVolume = (next: number) => {
    setVolume(next)
    try { localStorage.setItem('liyu:kitchen:volume', String(next)) } catch { /* optional */ }
  }

  const refreshQueue = async () => {
    if (refreshLockRef.current) return
    refreshLockRef.current = true
    setRefreshing(true)
    try {
      await loadTickets()
    } finally {
      refreshLockRef.current = false
      setRefreshing(false)
    }
  }

  const updateTicket = async (ticket: Ticket) => {
    const nextStatus = ticket.preparation_status === 'pending' ? 'preparing' : 'ready'
    setBusyId(ticket.id)
    setError('')
    setTicketFeedback('')
    try {
      const response = await fetch('/api/kitchen/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, status: nextStatus }),
      })
      const result = await response.json() as { error?: string; duplicate?: boolean }
      if (!response.ok) throw new Error(result.error ?? 'Could not update ticket.')
      setTicketFeedback(result.duplicate
        ? (isAm ? `ይህ ትዕዛዝ አስቀድሞ ${nextStatus === 'ready' ? 'ዝግጁ' : 'በዝግጅት ላይ'} ነው።` : `This order is already ${nextStatus}.`)
        : nextStatus === 'ready'
          ? (isAm
            ? `${ticket.table_number} ትዕዛዝ ዝግጁ ነው። አስተናጋጁ ማቅረብ ይችላል፤ ካሸሩ በሽያጭ ገጽ ክፍያ ይወስዳል።`
            : `${ticket.table_number} is ready. The waiter can serve it; the cashier can open the table in Sales to take payment.`)
          : (isAm
            ? `${ticket.table_number} ትዕዛዝ ዝግጅት ተጀምሯል።`
            : `Preparing ${ticket.table_number}.`))
      await loadTickets()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update ticket.')
    } finally {
      setBusyId(null)
    }
  }

  const elapsed = (createdAt: string) => {
    const minutes = Math.max(0, Math.floor(((clock || new Date(createdAt).getTime()) - new Date(createdAt).getTime()) / 60_000))
    return minutes < 1 ? (isAm ? 'አሁን' : 'Just now') : isAm ? `${minutes} ደቂቃ` : `${minutes} min`
  }

  return (
    <main className="min-h-screen bg-cream-100 p-3 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ChefHat className="h-5 w-5" /></span>
          <div>
            <h1 className="text-lg font-black text-coffee-700">{isAm ? 'የወጪ ትዕዛዞች' : 'Kitchen & Bar Orders'}</h1>
            <p className="text-xs text-coffee-400">{isAm ? 'አዲስ ትዕዛዞችን ለማየት አድስን ይጫኑ' : 'Tap Refresh to check for new orders'}</p>
          </div>
        </div>
        <button type="button" onClick={() => void refreshQueue()} disabled={refreshing} className="flex h-10 items-center gap-2 rounded-xl border border-cream-300 px-3 text-xs font-bold text-coffee-600 hover:bg-cream-50 disabled:opacity-60" aria-label={isAm ? 'አድስ' : 'Refresh queue'}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span>{refreshing ? (isAm ? 'በማደስ ላይ' : 'Refreshing') : (isAm ? 'አድስ' : 'Refresh')}</span>
        </button>
        <div className="flex w-full flex-wrap items-center gap-2 border-t border-cream-200 pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0">
          {!soundEnabled ? (
            <button type="button" onClick={() => void enableSound()} className="flex h-10 items-center gap-1.5 rounded-xl bg-berbere-600 px-3 text-xs font-black text-white hover:bg-berbere-700" aria-label="Enable order sound">
              <BellRing className="h-4 w-4" />{isAm ? 'ድምፅ አንቃ' : 'Enable sound'}
            </button>
          ) : (
            <button type="button" onClick={toggleMute} className="flex h-10 items-center gap-1.5 rounded-xl border border-cream-300 px-3 text-xs font-bold text-coffee-700 hover:bg-cream-50" aria-label={muted ? 'Unmute order alerts' : 'Mute order alerts'}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{muted ? (isAm ? 'ድምፅ ተዘግቷል' : 'Muted') : (isAm ? 'ድምፅ ክፈት' : 'Sound on')}
            </button>
          )}
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-xl border border-cream-300 px-3 text-xs font-bold text-coffee-700 hover:bg-cream-50">{isAm ? 'የድምፅ ቅንብር' : 'Sound settings'}</summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-56 space-y-3 rounded-xl border border-cream-300 bg-white p-3 shadow-elevated">
              <button type="button" onClick={() => void testSound()} className="flex h-10 w-full items-center gap-2 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-700 hover:bg-cream-50">
                <BellRing className="h-4 w-4" />{isAm ? 'ድምፅ ፈትሽ' : 'Test sound'}
              </button>
              <label className="flex items-center justify-between gap-2 text-xs font-bold text-coffee-600">
                {isAm ? 'ድምፅ' : 'Volume'}
                <input aria-label="Notification volume" type="range" min="0.1" max="1" step="0.1" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="w-24 accent-berbere-600" />
              </label>
            </div>
          </details>
        </div>
      </header>

      {newOrderMessage && <p role="status" aria-live="polite" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 text-sm font-black text-gold-800">{newOrderMessage}<button type="button" onClick={() => setNewOrderMessage('')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-gold-100" aria-label={isAm ? 'ዝጋ' : 'Dismiss notice'}><X className="h-4 w-4" /></button></p>}
      {error && <div role="alert" className="mb-3 rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div>}
      {ticketFeedback && <p role="status" aria-live="polite" className="mb-3 rounded-xl border border-berbere-200 bg-berbere-50 px-4 py-3 text-sm font-bold text-berbere-700">{ticketFeedback}</p>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-coffee-500"><Loader2 className="h-5 w-5 animate-spin" />{isAm ? 'በመጫን ላይ...' : 'Loading orders...'}</div>
      ) : tickets.length === 0 && readyTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-coffee-200 bg-white p-10 text-center text-sm font-bold text-coffee-400">{isAm ? 'አሁን የሚዘጋጅ ትዕዛዝ የለም።' : 'No orders to prepare right now.'}</div>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <article key={ticket.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${ticket.preparation_status === 'pending' ? 'border-gold-400 ring-1 ring-gold-200' : 'border-coffee-700/10'}`}>
              <div className={`flex items-start justify-between gap-3 border-b border-cream-200 px-4 py-3 ${ticket.preparation_status === 'pending' ? 'bg-gold-50' : 'bg-cream-50'}`}>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-coffee-700">{ticket.table_number}</h2>
                  <p className="mt-0.5 truncate text-xs text-coffee-500">{isAm ? 'ከ' : 'Waiter'}: {ticket.waiter_name}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${ticket.preparation_status === 'pending' ? 'bg-gold-100 text-gold-800' : 'bg-info-bg text-info'}`}>
                    {ticket.preparation_status === 'pending' ? (isAm ? 'አዲስ · በመጠባበቅ ላይ' : 'NEW · Waiting') : (isAm ? 'በዝግጅት ላይ' : 'PREPARING')}
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gold-50 px-2 py-1 text-xs font-black text-gold-700"><Clock3 className="h-3.5 w-3.5" />{elapsed(ticket.created_at)}</span>
              </div>
              <ul className="space-y-2 px-4 py-4">
                {ticket.item_payload.map((item, index) => (
                  <li key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 font-bold text-coffee-700">{isAm && item.name_am ? item.name_am : item.name}</span>
                    <span className="shrink-0 rounded-lg bg-berbere-50 px-2.5 py-1 font-mono font-black text-berbere-700">× {item.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="px-4 pb-4">
                <button type="button" disabled={busyId === ticket.id} onClick={() => void updateTicket(ticket)} className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-black transition disabled:opacity-60 ${ticket.preparation_status === 'preparing' ? 'bg-success text-white' : 'bg-berbere-500 text-white hover:bg-berbere-600'}`}>
                  {busyId === ticket.id
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{ticket.preparation_status === 'pending' ? (isAm ? 'በመጀመር ላይ' : 'Starting…') : (isAm ? 'ዝግጁ በማድረግ ላይ' : 'Marking ready…')}</>
                    : ticket.preparation_status === 'preparing' ? (isAm ? 'ዝግጁ ነው' : 'Ready to serve') : (isAm ? 'ማዘጋጀት ጀምር' : 'Start preparing')}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && readyTickets.length > 0 && (
        <section className="mt-6 rounded-2xl border border-success/20 bg-success-bg/60 p-4 sm:p-5">
          <header className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-coffee-800">{isAm ? 'ዝግጁ የሆኑ ትዕዛዞች' : 'Ready for service'}</h2>
              <p className="mt-1 text-xs text-coffee-600">{isAm ? 'አስተናጋጁ ያቅርብ፤ ገንዘብ ተቀባዩ በሽያጭ ገጽ ክፍያ ይቀበል።' : 'Tell the waiter to serve. The cashier opens this table in Sales to take payment.'}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-success">{readyTickets.length}</span>
          </header>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {readyTickets.map((ticket) => (
              <li key={ticket.id} className="rounded-xl border border-success/20 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-coffee-800">{ticket.table_number}</span>
                  <span className="text-[11px] font-bold text-success">{isAm ? 'ለማቅረብ ዝግጁ' : 'Ready'}</span>
                </div>
                <p className="mt-1 text-xs text-coffee-500">{ticket.item_payload.map((item) => `${item.quantity} × ${isAm && item.name_am ? item.name_am : item.name}`).join(', ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChefHat, Clock3, Loader2, RefreshCw } from 'lucide-react'
import { useParams } from 'next/navigation'
import createClient from '@/lib/supabase/client'

type Ticket = {
  id: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [clock, setClock] = useState(0)

  const loadTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/kitchen/tickets', { cache: 'no-store' })
      const result = await response.json() as { tickets?: Ticket[]; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not load kitchen tickets.')
      setTickets(result.tickets ?? [])
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load kitchen tickets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadTickets(), 0)
    const fallback = window.setInterval(() => void loadTickets(), 10_000)
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    const client = createClient()
    const channel = client.channel('kitchen-order-tickets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_order_tickets' }, () => void loadTickets())
      .subscribe()
    return () => {
      window.clearInterval(fallback)
      window.clearInterval(timer)
      window.clearTimeout(initialLoad)
      void client.removeChannel(channel)
    }
  }, [loadTickets])

  const updateTicket = async (ticket: Ticket) => {
    const nextStatus = ticket.preparation_status === 'pending' ? 'preparing' : 'ready'
    setBusyId(ticket.id)
    try {
      const response = await fetch('/api/kitchen/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, status: nextStatus }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not update ticket.')
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
      <header className="mb-4 flex items-center justify-between rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ChefHat className="h-5 w-5" /></span>
          <div>
            <h1 className="text-lg font-black text-coffee-700">{isAm ? 'የወጪ ትዕዛዞች' : 'Kitchen & Bar Orders'}</h1>
            <p className="text-xs text-coffee-400">{isAm ? 'አዲስ ትዕዛዞች በራስ-ሰር ይታያሉ' : 'New table orders appear automatically'}</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadTickets()} className="flex h-10 items-center gap-2 rounded-xl border border-cream-300 px-3 text-xs font-bold text-coffee-600 hover:bg-cream-50" aria-label={isAm ? 'አድስ' : 'Refresh'}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">{isAm ? 'አድስ' : 'Refresh'}</span></button>
      </header>

      {error && <div role="alert" className="mb-3 rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-coffee-500"><Loader2 className="h-5 w-5 animate-spin" />{isAm ? 'በመጫን ላይ...' : 'Loading orders...'}</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-coffee-200 bg-white p-10 text-center text-sm font-bold text-coffee-400">{isAm ? 'አሁን የሚዘጋጅ ትዕዛዝ የለም።' : 'No orders to prepare right now.'}</div>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-cream-200 bg-cream-50 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-coffee-700">{ticket.table_number}</h2>
                  <p className="mt-0.5 truncate text-xs text-coffee-500">{isAm ? 'ከ' : 'Waiter'}: {ticket.waiter_name}</p>
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
                  {busyId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : ticket.preparation_status === 'preparing' ? (isAm ? 'ዝግጁ ነው' : 'Ready to serve') : (isAm ? 'ማዘጋጀት ጀምር' : 'Start preparing')}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

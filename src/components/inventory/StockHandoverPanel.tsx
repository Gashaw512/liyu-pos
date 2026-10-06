'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeftRight, Check, Loader2, PackageCheck, TriangleAlert } from 'lucide-react'
import type { InventoryProduct } from '@/types/inventory'

type Handover = {
  id: string
  issued_by_clerk_id: string
  received_by_user_id: string
  quantity_issued: number
  status: 'pending_verification' | 'accepted' | 'disputed'
  dispute_reason: string | null
  issued_at: string
  issuerName: string
  recipientName: string
  product: { name: string; nameAm: string | null }
  canVerify: boolean
}

type Recipient = { id: string; name: string }
type HandoverData = { canIssue: boolean; recipients: Recipient[]; handovers: Handover[] }

export default function StockHandoverPanel({
  products,
  isAm,
}: {
  products: InventoryProduct[]
  isAm: boolean
}) {
  const [data, setData] = useState<HandoverData | null>(null)
  const [productId, setProductId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/handover', { cache: 'no-store' })
      const result = await response.json() as HandoverData & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not load handovers.')
      setData(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load handovers.')
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productId || !recipientId || Number(quantity) <= 0 || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/handover/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: crypto.randomUUID(), productId, recipientUserId: recipientId, quantity: Number(quantity) }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not issue stock.')
      setQuantity('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue stock.')
    } finally {
      setBusy(false)
    }
  }

  const respond = async (handoverId: string, decision: 'accepted' | 'disputed') => {
    if (busy) return
    let reason: string | undefined
    if (decision === 'disputed') {
      reason = window.prompt(isAm ? 'ልዩነቱን ያብራሩ' : 'Briefly explain the difference')?.trim()
      if (!reason) return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/handover/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverId, decision, reason }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not update handover.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update handover.')
    } finally {
      setBusy(false)
    }
  }

  if (!data || (!data.canIssue && data.handovers.length === 0 && !error)) return null

  const statusLabel = (status: Handover['status']) => {
    if (isAm) return status === 'accepted' ? 'ተቀባይነት አግኝቷል' : status === 'disputed' ? 'አለመግባባት' : 'ማረጋገጫ ይጠብቃል'
    return status === 'accepted' ? 'Accepted' : status === 'disputed' ? 'Disputed' : 'Waiting for confirmation'
  }

  return (
    <section className="space-y-3 rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex items-center gap-2">
        <PackageCheck className="h-5 w-5 text-berbere-600" />
        <div>
          <h2 className="text-sm font-black text-coffee-800">{isAm ? 'የእቃ ርክክብ' : 'Stock handover'}</h2>
          <p className="text-xs text-coffee-500">{isAm ? 'እቃን ለሰራተኛ ይስጡ፤ ተቀባዩ ያረጋግጥ።' : 'Issue stock to staff and have the receiver confirm it.'}</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-bold text-danger">{error}</p>}

      {data.canIssue && (
        <form onSubmit={(event) => void issue(event)} className="grid gap-2 sm:grid-cols-[1.2fr_1.2fr_0.7fr_auto]">
          <select aria-label={isAm ? 'ምርት' : 'Product'} value={productId} onChange={(event) => setProductId(event.target.value)} required className="h-11 min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm">
            <option value="">{isAm ? 'ምርት ይምረጡ' : 'Choose product'}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{isAm && product.name_am ? product.name_am : product.name}</option>)}
          </select>
          <select aria-label={isAm ? 'ተቀባይ' : 'Receiver'} value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required className="h-11 min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm">
            <option value="">{isAm ? 'ሰራተኛ ይምረጡ' : 'Choose staff member'}</option>
            {data.recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
          </select>
          <input aria-label={isAm ? 'ብዛት' : 'Quantity'} type="number" min="0.01" step="0.01" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={isAm ? 'ብዛት' : 'Quantity'} required className="h-11 min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm" />
          <button type="submit" disabled={busy || !data.recipients.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            {isAm ? 'ስጥ' : 'Issue'}
          </button>
          {!data.recipients.length && <p className="text-xs text-coffee-500 sm:col-span-4">{isAm ? 'በዚህ ቅርንጫፍ የነቁ ሰራተኞች የሉም።' : 'No active eligible staff member is available.'}</p>}
        </form>
      )}

      {data.handovers.length > 0 && (
        <ul className="divide-y divide-cream-200 rounded-xl border border-cream-200">
          {data.handovers.map((handover) => (
            <li key={handover.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-coffee-800">{isAm && handover.product.nameAm ? handover.product.nameAm : handover.product.name} · {handover.quantity_issued}</p>
                <p className="text-xs text-coffee-500">{handover.issuerName} → {handover.recipientName} · {statusLabel(handover.status)}</p>
                {handover.dispute_reason && <p className="mt-1 flex items-center gap-1 text-xs text-gold-700"><TriangleAlert className="h-3 w-3" />{handover.dispute_reason}</p>}
              </div>
              {handover.canVerify && (
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void respond(handover.id, 'accepted')} className="inline-flex h-10 items-center gap-1 rounded-lg bg-berbere-600 px-3 text-xs font-black text-white disabled:opacity-50"><Check className="h-4 w-4" />{isAm ? 'ተቀበል' : 'Confirm received'}</button>
                  <button type="button" disabled={busy} onClick={() => void respond(handover.id, 'disputed')} className="h-10 rounded-lg border border-gold-300 px-3 text-xs font-bold text-gold-700 disabled:opacity-50">{isAm ? 'አለመግባባት' : 'Report difference'}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

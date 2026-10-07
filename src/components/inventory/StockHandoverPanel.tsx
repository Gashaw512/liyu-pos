'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeftRight,
  Check,
  Clock3,
  Loader2,
  PackageCheck,
  TriangleAlert,
  ClipboardCheck,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Handover = {
  id: string
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
type ProductOption = { id: string; name: string; name_am: string | null }
type CustodyLine = { productId: string; productName: string; productNameAm: string | null; quantityIssued: number }
type ReconciledLine = {
  product_id: string
  product_name: string
  quantity_issued: number
  quantity_used: number
  quantity_returned: number
  quantity_wasted: number
  expected_remaining: number
  physical_count: number
  difference: number
}
type CustodyData = {
  id: string
  openedAt: string
  status: string
  canReconcile: boolean
  reconciliationStatus: string | null
  lines: CustodyLine[]
  reconciliation: { lines: ReconciledLine[]; reconciledAt: string | null } | null
}
type CustodyAudit = {
  id: string
  recipientName: string
  openedAt: string
  closedAt: string | null
  status: string
  lines: Array<Partial<ReconciledLine> & { product_id?: string; product_name?: string; quantity_received?: number; physical_count?: number | null; difference?: number | null }>
}
type HandoverData = {
  canIssue: boolean
  isStationRecipient: boolean
  recipients: Recipient[]
  handovers: Handover[]
  custody: CustodyData | null
  custodyReports: CustodyAudit[]
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function StockHandoverPanel({ isAm }: { isAm: boolean }) {
  const [data, setData] = useState<HandoverData | null>(null)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productId, setProductId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [custodyForm, setCustodyForm] = useState<{ shiftId: string; amounts: Record<string, { used: string; returned: string; wasted: string; counted: string }> }>({ shiftId: '', amounts: {} })
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/handover', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const result = await response.json() as HandoverData & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not load handovers.')
      setData(result)
      setError('')
      if (result.custody) {
        setCustodyForm((current) => {
          const amounts = current.shiftId === result.custody!.id ? { ...current.amounts } : {}
          for (const line of result.custody!.lines) {
            if (!amounts[line.productId]) amounts[line.productId] = { used: '0', returned: '0', wasted: '0', counted: '' }
          }
          return current.shiftId === result.custody!.id && Object.keys(amounts).length === Object.keys(current.amounts).length
            ? current
            : { shiftId: result.custody!.id, amounts }
        })
      }

      if (result.canIssue) {
        setCatalogLoading(true)
        const { data: sessionData, error: sessionError } = await getSupabaseBrowserClient().auth.getSession()
        if (sessionError) throw sessionError
        const accessToken = sessionData.session?.access_token
        if (!accessToken) throw new Error('Your session expired. Sign in again to load the product list.')

        const catalogResponse = await fetch('/api/products/templates', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const catalog = await catalogResponse.json() as { products?: ProductOption[]; error?: string }
        if (!catalogResponse.ok) throw new Error(catalog.error || 'Could not load products for this branch.')
        setProducts(Array.isArray(catalog.products) ? catalog.products : [])
      } else {
        setProducts([])
      }
    } catch (cause) {
      setError(messageFrom(cause, 'Could not load stock handover data.'))
    } finally {
      setCatalogLoading(false)
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
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: crypto.randomUUID(), productId, recipientUserId: recipientId, quantity: Number(quantity) }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not issue stock.')
      setQuantity('')
      await load()
    } catch (cause) {
      setError(messageFrom(cause, 'Could not issue stock.'))
    } finally {
      setBusy(false)
    }
  }

  const respond = async (handoverId: string, decision: 'accepted' | 'disputed') => {
    if (busy) return
    let reason: string | undefined
    if (decision === 'disputed') {
      reason = window.prompt(isAm ? 'እባክዎ የተለየውን ብዛት ያብራሩ' : 'Briefly explain the difference')?.trim()
      if (!reason) return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/handover/accept', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverId, decision, reason }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not update handover.')
      await load()
    } catch (cause) {
      setError(messageFrom(cause, 'Could not update handover.'))
    } finally {
      setBusy(false)
    }
  }

  const submitCustodyReconciliation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const custody = data?.custody
    if (!custody?.canReconcile || busy) return
    const lines = custody.lines.map((line) => {
      const amounts = custodyForm.amounts[line.productId]
      return {
        productId: line.productId,
        usedQuantity: Number(amounts?.used),
        returnedQuantity: Number(amounts?.returned),
        wastedQuantity: Number(amounts?.wasted),
        physicalCount: Number(amounts?.counted),
      }
    })
    if (lines.some((line) => ![line.usedQuantity, line.returnedQuantity, line.wastedQuantity, line.physicalCount].every((value) => Number.isFinite(value) && value >= 0))) {
      setError(isAm ? 'ለእያንዳንዱ ምርት ትክክለኛ ቆጠራ ያስገቡ።' : 'Enter a valid count for every product.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/handover/reconcile', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: crypto.randomUUID(), lines }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not save the stock count.')
      await load()
    } catch (cause) {
      setError(messageFrom(cause, 'Could not save the stock count.'))
    } finally {
      setBusy(false)
    }
  }

  const pendingHandovers = useMemo(
    () => data?.handovers.filter((handover) => handover.canVerify) ?? [],
    [data?.handovers],
  )
  const resolvedHandovers = useMemo(
    () => data?.handovers.filter((handover) => !handover.canVerify) ?? [],
    [data?.handovers],
  )

  if (!data && !error) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-cream-200 bg-white text-coffee-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {isAm ? 'በመጫን ላይ...' : 'Loading stock handovers...'}
      </div>
    )
  }

  const statusLabel = (status: Handover['status']) => {
    if (isAm) {
      if (status === 'accepted') return 'ተቀባይነት አግኝቷል'
      if (status === 'disputed') return 'አለመግባባት'
      return 'ማረጋገጫ ይጠበቃል'
    }
    if (status === 'accepted') return 'Confirmed'
    if (status === 'disputed') return 'Disputed'
    return 'Waiting for confirmation'
  }

  const voucherCard = (handover: Handover, isPending: boolean) => (
    <li
      key={handover.id}
      className={`rounded-2xl border p-4 ${isPending ? 'border-gold-300 bg-gold-50/70 shadow-sm' : 'border-cream-200 bg-white'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isPending ? 'bg-gold-100 text-gold-700' : 'bg-cream-100 text-coffee-500'}`}>
            {isPending ? <TriangleAlert className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-black text-coffee-800">
              {isAm && handover.product.nameAm ? handover.product.nameAm : handover.product.name}
            </p>
            <p className="mt-0.5 text-sm font-bold text-coffee-600">
              {isAm ? 'የተሰጠ ብዛት' : 'Quantity'}: {handover.quantity_issued}
            </p>
            <p className="mt-1 text-xs text-coffee-500">
              {handover.issuerName} → {handover.recipientName}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-coffee-400">
              <Clock3 className="h-3 w-3" />
              {new Date(handover.issued_at).toLocaleString(isAm ? 'am-ET' : 'en-ET')}
            </p>
            {handover.dispute_reason && (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-gold-700">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {handover.dispute_reason}
              </p>
            )}
          </div>
        </div>
        {!isPending && (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${handover.status === 'accepted' ? 'bg-berbere-50 text-berbere-700' : 'bg-gold-100 text-gold-800'}`}>
            {statusLabel(handover.status)}
          </span>
        )}
      </div>
      {isPending && (
        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(handover.id, 'accepted')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white transition hover:bg-berbere-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isAm ? 'እቃውን ተቀብያለሁ' : 'Confirm stock'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(handover.id, 'disputed')}
            className="min-h-11 rounded-xl border border-gold-400 bg-white px-4 text-sm font-black text-gold-800 transition hover:bg-gold-50 disabled:opacity-50"
          >
            {isAm ? 'ችግር አለ' : 'Dispute'}
          </button>
        </div>
      )}
    </li>
  )

  if (data?.isStationRecipient) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
          <header className="flex items-start gap-3 border-b border-cream-200 pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-coffee-800">
                {isAm ? 'የሚጠብቁ የእቃ ርክክቦች' : 'Pending Station Custody Inbox'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-coffee-500">
                {isAm ? 'የተሰጠዎትን እቃ ብዛት ያረጋግጡ።' : 'Check the quantity before confirming that you received it.'}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-gold-100 px-2.5 py-1 text-xs font-black text-gold-800">
              {pendingHandovers.length}
            </span>
          </header>
          {error && <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-3 py-2.5 text-sm font-bold text-danger">{error}</p>}
          {pendingHandovers.length ? (
            <ul className="mt-4 space-y-3">{pendingHandovers.map((handover) => voucherCard(handover, true))}</ul>
          ) : (
            <div className="mt-4 rounded-xl bg-cream-50 px-4 py-8 text-center">
              <Check className="mx-auto h-6 w-6 text-berbere-600" />
              <p className="mt-2 text-sm font-bold text-coffee-700">
                {isAm ? 'የሚጠብቅ እቃ የለም።' : 'No stock is waiting for your confirmation.'}
              </p>
            </div>
          )}
        </div>
        {data.custody?.canReconcile && (
          <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
            <header className="flex items-start gap-3 border-b border-cream-200 px-4 py-4 sm:px-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ClipboardCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-black text-coffee-800">{isAm ? 'የእቃ ቆጠራ እና ማስረከቢያ' : 'Reconcile your stock'}</h2>
                <p className="mt-1 text-xs leading-5 text-coffee-500">{isAm ? 'የተሸጠውን፣ የተመለሰውን፣ የተበላሸውን እና የቀረውን ይመዝግቡ።' : 'For each item, record used, returned, wasted, and physically counted stock.'}</p>
              </div>
            </header>
            <form onSubmit={(event) => void submitCustodyReconciliation(event)} className="space-y-3 p-4 sm:p-6">
              {data.custody.lines.map((line) => {
                const amounts = custodyForm.amounts[line.productId] ?? { used: '0', returned: '0', wasted: '0', counted: '' }
                const expected = line.quantityIssued - Number(amounts.used || 0) - Number(amounts.returned || 0) - Number(amounts.wasted || 0)
                const counted = amounts.counted === '' ? null : Number(amounts.counted)
                const difference = counted == null || !Number.isFinite(counted) ? null : counted - expected
                const setAmount = (key: 'used' | 'returned' | 'wasted' | 'counted', value: string) => setCustodyForm((current) => ({
                  ...current,
                  amounts: { ...current.amounts, [line.productId]: { ...amounts, [key]: value } },
                }))
                return (
                  <article key={line.productId} className="rounded-xl border border-cream-200 bg-cream-50 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-coffee-800">{isAm && line.productNameAm ? line.productNameAm : line.productName}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-coffee-600">{isAm ? 'የተረከቡ' : 'Issued'}: {line.quantityIssued}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        ['used', isAm ? 'የተጠቀሙ' : 'Used'],
                        ['returned', isAm ? 'የተመለሰ' : 'Returned'],
                        ['wasted', isAm ? 'የተበላሸ' : 'Wasted'],
                        ['counted', isAm ? 'በእጅ የቀረ' : 'Counted now'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="min-w-0 space-y-1">
                          <span className="block text-[11px] font-bold text-coffee-500">{label}</span>
                          <input type="number" min="0" step="0.01" inputMode="decimal" required value={amounts[key]} onChange={(event) => setAmount(key, event.target.value)} className="h-10 w-full rounded-lg border border-cream-300 bg-white px-2 text-sm font-bold text-coffee-800" />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-bold text-coffee-600">
                      {isAm ? 'መጠበቅ ያለበት' : 'Expected remaining'}: {Number.isFinite(expected) ? expected : '—'}
                      {' · '}{isAm ? 'ልዩነት' : 'Difference'}: {difference == null ? '—' : `${difference > 0 ? '+' : ''}${difference}`}
                    </p>
                  </article>
                )
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="max-w-xl text-[11px] leading-5 text-coffee-500">{isAm ? 'ልዩነት ከታየ ለኃላፊው ይታያል። ይህ ቆጠራ የቅርንጫፉን አጠቃላይ ክምችት አይቀይርም።' : 'Any difference is saved for the owner or manager to review. This report does not change branch-wide stock.'}</p>
                <button type="submit" disabled={busy || data.custody.lines.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-5 text-sm font-black text-white transition hover:bg-berbere-700 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                  {isAm ? 'ቆጠራውን አስቀምጥ እና ዝጋ' : 'Save count and close custody'}
                </button>
              </div>
            </form>
          </section>
        )}
        {data.custody?.reconciliation && (
          <section className="rounded-2xl border border-berbere-200 bg-berbere-50/60 p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-black text-coffee-800">{isAm ? 'የእቃ ቆጠራ ተመዝግቧል' : 'Stock reconciliation submitted'}</h2>
            {data.custody.reconciliation.reconciledAt && <p className="mt-1 text-xs text-coffee-500">{new Date(data.custody.reconciliation.reconciledAt).toLocaleString(isAm ? 'am-ET' : 'en-ET')}</p>}
            <div className="mt-3 space-y-2">
              {data.custody.reconciliation.lines.map((line) => (
                <div key={line.product_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                  <span className="font-bold text-coffee-700">{line.product_name}</span>
                  <span className="text-coffee-600">{isAm ? 'የሚጠበቅ' : 'Expected'} {line.expected_remaining} · {isAm ? 'ቆጠራ' : 'Counted'} {line.physical_count}</span>
                  <span className={`font-black ${line.difference === 0 ? 'text-berbere-700' : 'text-gold-700'}`}>{isAm ? 'ልዩነት' : 'Difference'}: {line.difference > 0 ? '+' : ''}{line.difference}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {resolvedHandovers.length > 0 && (
          <section className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-sm font-black text-coffee-800">{isAm ? 'ያለፉ ርክክቦች' : 'Recent handovers'}</h3>
            <ul className="mt-3 space-y-2">{resolvedHandovers.map((handover) => voucherCard(handover, false))}</ul>
          </section>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2.5 text-sm font-bold text-danger">{error}</p>}
      {data?.canIssue && (
        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white px-4 py-4 sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ArrowLeftRight className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-black text-coffee-800">{isAm ? 'እቃ ለሰራተኛ መስጠት' : 'Issue stock to staff'}</h2>
              <p className="mt-0.5 text-xs text-coffee-500">{isAm ? 'ሰራተኛው ብዛቱን እንዲያረጋግጥ ይላኩ።' : 'Choose a product, recipient, and quantity.'}</p>
            </div>
          </header>
          <form onSubmit={(event) => void issue(event)} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1.25fr_1.25fr_0.7fr_auto] lg:items-end">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-xs font-bold text-coffee-600">{isAm ? 'ምርት' : 'Product'}</span>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} required disabled={catalogLoading} className="h-11 w-full min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm text-coffee-800 outline-none focus:border-berbere-400">
                <option value="">{catalogLoading ? (isAm ? 'ምርቶችን በመጫን ላይ...' : 'Loading products...') : (isAm ? 'ምርት ይምረጡ' : 'Choose product')}</option>
                {products.map((product) => <option key={product.id} value={product.id}>{isAm && product.name_am ? product.name_am : product.name}</option>)}
              </select>
              {!catalogLoading && products.length === 0 && <span className="block text-[11px] text-gold-700">{isAm ? 'ንቁ ምርቶች አልተገኙም።' : 'No active products were returned for this branch.'}</span>}
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-xs font-bold text-coffee-600">{isAm ? 'ተቀባይ' : 'Staff member'}</span>
              <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required className="h-11 w-full min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm text-coffee-800 outline-none focus:border-berbere-400">
                <option value="">{isAm ? 'ሰራተኛ ይምረጡ' : 'Choose staff member'}</option>
                {data.recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
              </select>
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-xs font-bold text-coffee-600">{isAm ? 'ብዛት' : 'Quantity'}</span>
              <input type="number" min="0.01" step="0.01" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" required className="h-11 w-full min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-sm text-coffee-800 outline-none focus:border-berbere-400" />
            </label>
            <button type="submit" disabled={busy || catalogLoading || !products.length || !data.recipients.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-5 text-sm font-black text-white transition hover:bg-berbere-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
              {isAm ? 'እቃ ስጥ' : 'Issue stock'}
            </button>
            {!data.recipients.length && <p className="text-xs text-coffee-500 sm:col-span-2 lg:col-span-4">{isAm ? 'በዚህ ቅርንጫፍ የነቁ ተቀባዮች የሉም።' : 'No active eligible staff member is available in this branch.'}</p>}
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 pb-4">
          <div>
            <h2 className="text-base font-black text-coffee-800">
              {data?.canIssue
                ? (isAm ? 'የእቃ ርክክብ ታሪክ' : 'Global Chain of Custody History')
                : (isAm ? 'ያለፉ ርክክቦች' : 'Recent handovers')}
            </h2>
            <p className="mt-1 text-xs text-coffee-500">
              {isAm ? 'በዚህ ቅርንጫፍ የተመዘገቡ ርክክቦች' : 'Branch handovers and recipient confirmations.'}
            </p>
          </div>
          <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-black text-coffee-600">{data?.handovers.length ?? 0}</span>
        </header>
        {data?.handovers.length ? (
          <ul className="mt-4 space-y-2">{data.handovers.map((handover) => voucherCard(handover, handover.canVerify))}</ul>
        ) : (
          <p className="py-9 text-center text-sm text-coffee-400">{isAm ? 'ገና ርክክብ አልተመዘገበም።' : 'No handovers have been recorded yet.'}</p>
        )}
        {data?.canIssue && data.custodyReports.length > 0 && (
          <div className="mt-6 border-t border-cream-200 pt-5">
            <h3 className="text-sm font-black text-coffee-800">{isAm ? 'የተዘጉ የእቃ ቆጠራዎች' : 'Custody counts and differences'}</h3>
            <div className="mt-3 space-y-3">
              {data.custodyReports.map((report) => (
                <article key={report.id} className="rounded-xl border border-cream-200 bg-cream-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-coffee-800">{report.recipientName}</p>
                      <p className="text-[11px] text-coffee-500">{new Date(report.closedAt ?? report.openedAt).toLocaleString(isAm ? 'am-ET' : 'en-ET')}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.status === 'submitted' ? 'bg-berbere-50 text-berbere-700' : 'bg-gold-100 text-gold-800'}`}>
                      {report.status === 'submitted' ? (isAm ? 'ተቆጥሯል' : 'Count submitted') : (isAm ? 'ቆጠራ ይጠበቃል' : 'Count pending')}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {report.lines.map((line, index) => {
                      const issued = Number(line.quantity_issued ?? line.quantity_received ?? 0)
                      const expected = line.expected_remaining == null ? null : Number(line.expected_remaining)
                      const physical = line.physical_count == null ? null : Number(line.physical_count)
                      const difference = line.difference == null ? null : Number(line.difference)
                      return (
                        <div key={line.product_id ?? `${line.product_name ?? 'item'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[11px]">
                          <span className="font-bold text-coffee-700">{line.product_name ?? 'Product'}</span>
                          <span className="text-coffee-500">{isAm ? 'ተረክበዋል' : 'Issued'} {issued}</span>
                          <span className="text-coffee-500">{isAm ? 'ይጠበቅ' : 'Expected'} {expected ?? '—'}</span>
                          <span className="text-coffee-500">{isAm ? 'ተቆጥሯል' : 'Counted'} {physical ?? '—'}</span>
                          <span className={`font-black ${difference === 0 ? 'text-berbere-700' : difference == null ? 'text-coffee-400' : 'text-gold-700'}`}>
                            {isAm ? 'ልዩነት' : 'Difference'}: {difference == null ? '—' : `${difference > 0 ? '+' : ''}${difference}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

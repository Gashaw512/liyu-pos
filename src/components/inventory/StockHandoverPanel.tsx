'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Route } from 'next'
import {
  ArrowLeftRight,
  Check,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  TriangleAlert,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { calculateExpectedCustodyRemaining } from '@/lib/kitchen/custody-stock'

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
type CachedStock = { quantity: number; updatedAt: string | null }
type CustodyLine = { productId: string; productName: string; productNameAm: string | null; quantityIssued: number; soldQuantity: number; remainingQuantity: number }
type ReconciledLine = {
  product_id: string
  product_name: string
  quantity_issued: number
  quantity_sold?: number
  quantity_used: number
  quantity_returned: number
  quantity_wasted: number
  expected_remaining: number
  overdrawn_quantity?: number
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
  canReceive: boolean
  isStationRecipient: boolean
  recipients: Recipient[]
  handovers: Handover[]
  custody: CustodyData | null
  custodyReports: CustodyAudit[]
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export type StockHandoverView = 'home' | 'issue' | 'inbox' | 'count' | 'history'

export default function StockHandoverPanel({ isAm, view = 'home' }: { isAm: boolean; view?: StockHandoverView }) {
  const params = useParams()
  const locale = String(params.locale ?? 'en')
  const [data, setData] = useState<HandoverData | null>(null)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [branchStock, setBranchStock] = useState<Record<string, CachedStock>>({})
  const [productId, setProductId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [custodyForm, setCustodyForm] = useState<{ shiftId: string; amounts: Record<string, { used: string; returned: string; wasted: string; counted: string }> }>({ shiftId: '', amounts: {} })
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [historyVisible, setHistoryVisible] = useState(true)

  const load = useCallback(async () => {
    setRefreshing(true)
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
        const catalog = await catalogResponse.json() as {
          products?: ProductOption[]
          inventory?: Array<{ product_id: string; quantity: number; updated_at: string | null }>
          error?: string
        }
        if (!catalogResponse.ok) throw new Error(catalog.error || 'Could not load products for this branch.')
        setProducts(Array.isArray(catalog.products) ? catalog.products : [])
        setBranchStock(Object.fromEntries((catalog.inventory ?? []).map((row) => [row.product_id, {
          quantity: Number(row.quantity),
          updatedAt: row.updated_at,
        }])))
      } else {
        setProducts([])
        setBranchStock({})
      }
    } catch (cause) {
      setError(messageFrom(cause, 'Could not load stock handover data.'))
    } finally {
      setCatalogLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productId || !recipientId || Number(quantity) <= 0 || busy) return
    const selectedProduct = products.find((product) => product.id === productId)
    const selectedRecipient = data?.recipients.find((recipient) => recipient.id === recipientId)
    const stock = branchStock[productId]
    const fingerprint = `${productId}:${recipientId}:${Number(quantity)}`
    const requestKey = 'liyu:stock-handover:pending-request'
    let requestId: string
    try {
      const saved = sessionStorage.getItem(requestKey)
      const parsed = saved ? JSON.parse(saved) as { fingerprint?: string; requestId?: string } : null
      requestId = parsed?.fingerprint === fingerprint && parsed.requestId ? parsed.requestId : crypto.randomUUID()
      sessionStorage.setItem(requestKey, JSON.stringify({ fingerprint, requestId }))
    } catch {
      requestId = crypto.randomUUID()
    }
    const productName = selectedProduct
      ? isAm && selectedProduct.name_am ? selectedProduct.name_am : selectedProduct.name
      : 'Product'
    const stockNote = stock
      ? `Branch stock at last refresh: ${stock.quantity}. Issuing does not deduct branch inventory; a sale does.`
      : 'Branch stock is not available in this snapshot. The server will check availability. Issuing does not deduct branch inventory.'
    if (!window.confirm(`Issue ${quantity} ${productName} to ${selectedRecipient?.name ?? 'staff'}? ${stockNote}`)) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/inventory/handover/issue', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, productId, recipientUserId: recipientId, quantity: Number(quantity) }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not issue stock.')
      try { sessionStorage.removeItem(requestKey) } catch { /* session storage is optional */ }
      setSuccess(isAm
        ? `እቃው ለ${selectedRecipient?.name ?? 'ሰራተኛ'} ተሰጥቷል። የቅርንጫፍ ክምችት በዚህ ርክክብ አልተቀነሰም።`
        : `Stock issued to ${selectedRecipient?.name ?? 'staff'}. Custody is assigned; branch inventory was not deducted by this handover.`)
      setQuantity('')
      await load()
    } catch (cause) {
      setError(messageFrom(cause, 'Could not issue stock.'))
    } finally {
      setBusy(false)
    }
  }

  const clearIssueForm = () => {
    if (busy) return
    setProductId('')
    setRecipientId('')
    setQuantity('')
    setError('')
    setSuccess('')
  }

  const respond = async (handoverId: string, decision: 'accepted' | 'disputed') => {
    if (busy) return
    let reason: string | undefined
    if (decision === 'disputed') {
      reason = window.prompt(isAm ? 'እባክዎ የተለየውን ብዛት ያብራሩ' : 'Briefly explain the difference')?.trim()
      if (!reason) return
    }
    setBusy(true)
    setRespondingTo(handoverId)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/inventory/handover/accept', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverId, decision, reason }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not update handover.')
      setSuccess(decision === 'accepted'
        ? (isAm ? 'እቃው ተቀብሏል። አሁን በእርስዎ እቃ ኃላፊነት ስር ነው።' : 'Stock received. The quantity is now listed under your name.')
        : (isAm ? 'ልዩነቱ ተመዝግቧል።' : 'Difference recorded for review.'))
      await load()
    } catch (cause) {
      setError(messageFrom(cause, 'Could not update handover.'))
    } finally {
      setRespondingTo(null)
      setBusy(false)
    }
  }

  const submitCustodyReconciliation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const custody = data?.custody
    if (!custody?.canReconcile || busy) return
    const lines = custody.lines.map((line) => {
      const amounts = custodyForm.amounts[line.productId]
      const expected = calculateExpectedCustodyRemaining(
        line.quantityIssued,
        line.soldQuantity,
        Number(amounts?.used || 0),
        Number(amounts?.returned || 0),
        Number(amounts?.wasted || 0),
      )
      return {
        productId: line.productId,
        usedQuantity: Number(amounts?.used),
        returnedQuantity: Number(amounts?.returned),
        wastedQuantity: Number(amounts?.wasted),
        physicalCount: amounts?.counted.trim() ? Number(amounts.counted) : Math.max(0, expected),
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

  const activeView: StockHandoverView = view === 'home'
    ? data?.canIssue ? 'issue' : 'inbox'
    : view
  const pageActions = [
    ...(data?.canIssue ? [{ view: 'issue' as const, path: 'issue', label: isAm ? 'እቃ ስጥ' : 'Issue stock', shortLabel: isAm ? 'ስጥ' : 'Issue' }] : []),
    ...(data?.canReceive ? [{ view: 'inbox' as const, path: 'inbox', label: isAm ? 'የሚጠብቀኝ' : 'Waiting for me', shortLabel: isAm ? 'የእኔ' : 'Inbox' }] : []),
    ...(data?.custody?.canReconcile ? [{ view: 'count' as const, path: 'count', label: isAm ? 'ቆጠራ' : 'Count stock', shortLabel: isAm ? 'ቆጠራ' : 'Count' }] : []),
    ...((data?.canIssue || data?.canReceive) ? [{ view: 'history' as const, path: 'history', label: isAm ? 'ታሪክ' : 'History', shortLabel: isAm ? 'ታሪክ' : 'History' }] : []),
  ]
  const viewAllowed = activeView === 'issue'
    ? Boolean(data?.canIssue)
    : activeView === 'inbox'
      ? Boolean(data?.canReceive)
      : activeView === 'count'
        ? Boolean(data?.canReceive && (data.custody?.canReconcile || data.custody?.reconciliation))
        : Boolean(data?.canIssue || data?.canReceive)
  const viewTitle: Record<StockHandoverView, string> = {
    home: isAm ? 'የእቃ ርክክብ' : 'Stock',
    issue: isAm ? 'እቃ ስጥ' : 'Issue stock',
    inbox: isAm ? 'የተሰጠኝ እቃ' : 'My stock',
    count: isAm ? 'እቃ ቆጥር' : 'Count stock',
    history: isAm ? 'የእቃ ታሪክ' : 'Stock history',
  }
  const pageHeader = (
    <header className="sticky top-0 z-40 -mx-3 -mt-4 mb-4 border-b border-cream-200 bg-white px-3 py-2 shadow-sm sm:-mx-5 sm:px-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <h1 className="shrink-0 text-sm font-black text-coffee-800 sm:text-base">{viewTitle[activeView]}</h1>
        {pageActions.length > 0 && (
          <nav aria-label={isAm ? 'የእቃ ስራዎች' : 'Stock actions'} className="ml-auto flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
            {pageActions.map((action) => (
              <Link
                key={action.path}
                href={`/${locale}/stock-handover/${action.path}` as Route}
                aria-current={activeView === action.view ? 'page' : undefined}
                style={activeView === action.view
                  ? { backgroundColor: '#7a1f2d', borderColor: '#7a1f2d', color: '#ffffff' }
                  : { backgroundColor: '#ffffff', borderColor: '#8a756d', color: '#2b1e1a' }}
                className="inline-flex min-h-10 min-w-max shrink-0 items-center justify-center rounded-md border-2 px-3 text-xs font-bold shadow-sm transition hover:brightness-95 sm:px-3.5"
              >
                {action.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )

  if (!data && !error) {
    return (
      <div className="min-h-screen">
        {pageHeader}
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-cream-200 bg-white text-coffee-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {isAm ? 'በመጫን ላይ...' : 'Loading stock handovers...'}
        </div>
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
            {respondingTo === handover.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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


  if (data?.isStationRecipient || (activeView === 'count' && data?.canReceive)) {
    return (
      <section className="space-y-5">
        {pageHeader}
        {error && <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2.5 text-sm font-bold text-danger">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-berbere-50 px-3 py-2.5 text-sm font-bold text-berbere-700">{success}</p>}
        {!viewAllowed && <p role="status" className="rounded-xl bg-cream-50 px-4 py-5 text-center text-sm font-bold text-coffee-600">{isAm ? 'ይህ ገጽ ለእርስዎ አይገኝም።' : 'This page is not available for your account.'}</p>}
        {activeView === 'inbox' && <div className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
          <header id="handover-inbox" className="scroll-mt-24 flex items-start gap-3 border-b border-cream-200 pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-coffee-800">
                {isAm ? 'የሚጠብቁ የእቃ ርክክቦች' : 'Waiting for me'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-coffee-500">
                {isAm ? 'የተሰጠዎትን እቃ ብዛት ያረጋግጡ።' : 'Check the quantity before confirming that you received it.'}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-gold-100 px-2.5 py-1 text-xs font-black text-gold-800">
              {pendingHandovers.length}
            </span>
            <button type="button" onClick={() => void load()} disabled={refreshing} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-600 disabled:opacity-60" aria-label={isAm ? 'አድስ' : 'Refresh handovers'}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAm ? 'አድስ' : 'Refresh'}</span>
            </button>
          </header>
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
        </div>}
        {activeView === 'count' && data.custody?.canReconcile && (
          <section id="handover-reconcile" className="scroll-mt-24 overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
            <header className="flex items-start gap-3 border-b border-cream-200 px-4 py-4 sm:px-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ClipboardCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-black text-coffee-800">{isAm ? 'የእቃ ቆጠራ እና ማስረከቢያ' : 'Count my stock'}</h2>
                <p className="mt-1 text-xs leading-5 text-coffee-500">{isAm ? 'የተሸጠውን፣ የተመለሰውን፣ የተበላሸውን እና የቀረውን ይመዝግቡ።' : 'Enter what you count. Add any returns or damaged stock below.'}</p>
              </div>
            </header>
            <p className="mx-4 mt-3 rounded-lg bg-cream-50 px-3 py-2 text-[11px] leading-5 text-coffee-600 sm:mx-6">
              {isAm
                ? 'የሽያጭ ገጹ የቅርንጫፍ ክምችትን ያሳያል፤ ይህ ቆጠራ እርስዎ የተቀበሉትን ይከታተላል። ማስረከብ የቅርንጫፍ ክምችትን አይቀንስም።'
                : 'This is stock you received. Enter what you count now; include returns and damaged items below.'}
            </p>
            <form onSubmit={(event) => void submitCustodyReconciliation(event)} className="space-y-3 p-4 sm:p-6">
              {data.custody.lines.map((line) => {
                const amounts = custodyForm.amounts[line.productId] ?? { used: '0', returned: '0', wasted: '0', counted: '' }
                const expected = calculateExpectedCustodyRemaining(
                  line.quantityIssued,
                  line.soldQuantity,
                  Number(amounts.used || 0),
                  Number(amounts.returned || 0),
                  Number(amounts.wasted || 0),
                )
                const suggestedCount = String(Math.max(0, expected))
                const countedValue = amounts.counted === '' ? suggestedCount : amounts.counted
                const counted = Number(countedValue)
                const difference = Number.isFinite(counted) ? counted - expected : null
                const setAmount = (key: 'used' | 'returned' | 'wasted' | 'counted', value: string) => setCustodyForm((current) => ({
                  ...current,
                  amounts: { ...current.amounts, [line.productId]: { ...amounts, [key]: value } },
                }))
                return (
                  <article key={line.productId} className="rounded-xl border border-cream-200 bg-cream-50 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-coffee-800">{isAm && line.productNameAm ? line.productNameAm : line.productName}</h3>
                      <span className="rounded-full bg-berbere-50 px-3 py-1 text-xs font-black text-berbere-700">
                        {isAm ? 'በእጅዎ የሚቀር' : 'Expected with you'}: {Number.isFinite(expected) ? expected : '—'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-coffee-600">{isAm ? 'የተረከቡ' : 'Issued'}: {line.quantityIssued}</span>
                      <span className="rounded-full bg-berbere-50 px-3 py-1 text-xs font-bold text-berbere-700">{isAm ? 'የተሸጡ' : 'Sold'}: {line.soldQuantity}</span>
                    </div>
                    {expected < 0 && <p role="status" className="mb-2 rounded-lg bg-gold-50 px-3 py-2 text-xs font-bold text-gold-800">Recorded sales and use exceed accepted stock by {Math.abs(expected)}. This shortage will be saved for review.</p>}
                    <p className="mb-2 text-[10px] leading-4 text-coffee-500">
                      {isAm ? 'የቆጠራ መጠኑ በተቀበሉት እቃ እና በተመዘገቡ ሽያጮች ላይ ተመስርቶ ይሞላል፤ እርስዎ ማስተካከል ይችላሉ።' : 'Check the suggested number against the items in front of you. Change it if needed.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        ['used', isAm ? 'የተጠቀሙ' : 'Used'],
                        ['returned', isAm ? 'የተመለሰ' : 'Returned'],
                        ['wasted', isAm ? 'የተበላሸ' : 'Wasted'],
                        ['counted', isAm ? 'በእጅ የቀረ' : 'Counted now'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="min-w-0 space-y-1">
                          <span className="block text-[11px] font-bold text-coffee-500">{label}</span>
                          <input type="number" min="0" step="0.01" inputMode="decimal" required value={key === 'counted' ? countedValue : amounts[key]} onChange={(event) => setAmount(key, event.target.value)} className="h-10 w-full rounded-lg border border-cream-300 bg-white px-2 text-sm font-bold text-coffee-800" />
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
                  {isAm ? 'ቆጠራውን አስቀምጥ እና ዝጋ' : 'Save count'}
                </button>
              </div>
            </form>
          </section>
        )}
        {(activeView === 'history' || activeView === 'count') && data.custody?.reconciliation && (
          <section className="rounded-2xl border border-berbere-200 bg-berbere-50/60 p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-black text-coffee-800">{isAm ? 'የእቃ ቆጠራ ተመዝግቧል' : 'Count saved'}</h2>
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
        {activeView === 'history' && resolvedHandovers.length > 0 && (
          <section className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-coffee-800">{isAm ? 'ያለፉ ርክክቦች' : 'Recent handovers'}</h3>
              <button type="button" onClick={() => setHistoryVisible((visible) => !visible)} className="min-h-10 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-600" aria-expanded={historyVisible}>{historyVisible ? 'Hide list' : 'Show list'}</button>
            </header>
            {historyVisible && <div className="mt-3 overflow-hidden rounded-xl border border-cream-200">
              <ul className="divide-y divide-cream-200">{resolvedHandovers.map((handover) => (
                <li key={handover.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2.5 text-xs sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0"><p className="truncate font-bold text-coffee-700">{isAm && handover.product.nameAm ? handover.product.nameAm : handover.product.name}</p><p className="truncate text-[10px] text-coffee-500">{handover.issuerName}</p></div>
                  <span className="text-[10px] text-coffee-500">{new Date(handover.issued_at).toLocaleDateString(isAm ? 'am-ET' : 'en-ET')}</span>
                  <span className="font-black text-coffee-700">{handover.quantity_issued}</span>
                  <span className={`text-[10px] font-black ${handover.status === 'accepted' ? 'text-berbere-700' : 'text-gold-700'}`}>{statusLabel(handover.status)}</span>
                </li>
              ))}</ul>
            </div>}
          </section>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {pageHeader}
      {error && <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2.5 text-sm font-bold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-berbere-50 px-3 py-2.5 text-sm font-bold text-berbere-700">{success}</p>}
        {!viewAllowed && <p role="status" className="rounded-xl bg-cream-50 px-4 py-5 text-center text-sm font-bold text-coffee-600">{isAm ? 'ይህ ገጽ ለእርስዎ አይገኝም።' : 'This page is not available for your account.'}</p>}
      {data?.canIssue && activeView === 'issue' && (
        <section id="handover-issue" className="scroll-mt-24 overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
          <header className="flex flex-wrap items-center gap-3 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white px-4 py-4 sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><ArrowLeftRight className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-black text-coffee-800">{isAm ? 'እቃ ለሰራተኛ መስጠት' : 'Issue stock to staff'}</h2>
              <p className="mt-0.5 text-xs text-coffee-500">{isAm ? 'ሰራተኛው ብዛቱን እንዲያረጋግጥ ይላኩ።' : 'Choose an item, staff member, and amount.'}</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={refreshing || busy} className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-600 disabled:opacity-60" aria-label={isAm ? 'አድስ' : 'Refresh stock and handovers'}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{refreshing ? (isAm ? 'በማደስ ላይ' : 'Refreshing') : (isAm ? 'አድስ' : 'Refresh')}</span>
            </button>
          </header>
          <form onSubmit={(event) => void issue(event)} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1.25fr_1.25fr_0.7fr_auto_auto] lg:items-end">
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
            {productId && (() => {
              const stock = branchStock[productId]
              return (
                <p className="text-xs leading-5 text-coffee-500 sm:col-span-2 lg:col-span-5">
                  {stock
                    ? `${isAm ? 'የቅርንጫፍ ክምችት' : 'Branch stock'}: ${stock.quantity}${stock.updatedAt ? ` · ${isAm ? 'የተዘመነው' : 'updated'} ${new Date(stock.updatedAt).toLocaleString(isAm ? 'am-ET' : 'en-ET')}` : ''}. `
                    : `${isAm ? 'የቅርንጫፍ ክምችት' : 'Branch stock'}: ${isAm ? 'በመሣሪያው ላይ አልተጫነም' : 'unavailable in this snapshot'}. `}
                  {isAm ? 'ርክክብ ክምችትን አይቀንስም፤ ሽያጭ አንድ ጊዜ ይቀንሳል።' : 'Stock given to staff stays on the branch count. Recorded sales reduce branch stock.'}
                  {quantity && ` ${isAm ? 'የሚሰጠው' : 'To issue'}: ${quantity}.`}
                </p>
              )
            })()}
            <button type="submit" disabled={busy || catalogLoading || !products.length || !data.recipients.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-5 text-sm font-black text-white transition hover:bg-berbere-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
              {busy ? (isAm ? 'በማስረከብ ላይ' : 'Issuing…') : (isAm ? 'እቃ ስጥ' : 'Issue stock')}
            </button>
            <button type="button" onClick={clearIssueForm} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 px-4 text-sm font-bold text-coffee-600 transition hover:bg-cream-50 disabled:opacity-50" aria-label={isAm ? 'ምርጫውን አጥራ' : 'Clear issue form'}>
              <RotateCcw className="h-4 w-4" />{isAm ? 'አጥራ' : 'Clear'}
            </button>
            {!data.recipients.length && <p className="text-xs text-coffee-500 sm:col-span-2 lg:col-span-4">{isAm ? 'በዚህ ቅርንጫፍ የነቁ ተቀባዮች የሉም።' : 'No active staff are available to receive stock.'}</p>}
          </form>
        </section>
      )}

      {data?.canIssue && data.canReceive && activeView === 'inbox' && (
        <section id="handover-inbox" className="scroll-mt-24 rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-5">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-coffee-800">{isAm ? 'የሚጠብቁ የእቃ ርክክቦች' : 'Waiting for me'}</h2>
              <p className="mt-1 text-xs text-coffee-500">{isAm ? 'ለእርስዎ የተሰጠውን እቃ ያረጋግጡ።' : 'Confirm stock assigned to you.'}</p>
            </div>
            <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-black text-gold-800">{pendingHandovers.length}</span>
          </header>
          {pendingHandovers.length ? (
            <ul className="mt-3 space-y-2">{pendingHandovers.map((handover) => voucherCard(handover, true))}</ul>
          ) : (
            <p className="mt-3 rounded-xl bg-cream-50 px-3 py-4 text-center text-xs text-coffee-500">{isAm ? 'የሚያረጋግጡት እቃ የለም።' : 'No stock is waiting for your confirmation.'}</p>
          )}
        </section>
      )}

      {data?.canIssue && activeView === 'count' && data.custody?.lines.length ? (
        <section id="handover-reconcile" className="scroll-mt-24 rounded-2xl border border-berbere-200 bg-berbere-50/60 p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-black text-coffee-800">{isAm ? 'የእኔ የተረከብኩት እቃ' : 'Stock with me'}</h2>
          <p className="mt-1 text-[11px] leading-5 text-coffee-600">{isAm ? 'ይህ የእርስዎ የእቃ ኃላፊነት ነው፤ ከቅርንጫፍ ክምችት ጋር አትደምሩት።' : 'This is the stock you have received.'}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.custody.lines.map((line) => (
              <div key={line.productId} className="rounded-xl border border-white bg-white px-3 py-2.5">
                <p className="truncate text-xs font-black text-coffee-800">{isAm && line.productNameAm ? line.productNameAm : line.productName}</p>
                <p className="mt-1 text-[11px] text-coffee-600">{isAm ? 'የተቀበሉ' : 'Issued'} {line.quantityIssued} · {isAm ? 'የተሸጡ' : 'Recorded sold'} {line.soldQuantity}</p>
                <p className="mt-1 text-xs font-black text-berbere-700">{isAm ? 'የሚቀሩ' : 'Expected with you'}: {line.remainingQuantity}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === 'history' && <section id="handover-history" className="scroll-mt-24 rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 pb-4">
          <div>
            <h2 className="text-base font-black text-coffee-800">
              {data?.canIssue
                ? (isAm ? 'የእቃ ርክክብ ታሪክ' : 'Stock handovers')
                : (isAm ? 'ያለፉ ርክክቦች' : 'Recent handovers')}
            </h2>
            <p className="mt-1 text-xs text-coffee-500">
              {isAm ? 'በዚህ ቅርንጫፍ የተመዘገቡ ርክክቦች' : 'Stock given to staff and the quantities they confirmed.'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-black text-coffee-600">{data?.handovers.length ?? 0}</span>
            <button type="button" onClick={() => setHistoryVisible((visible) => !visible)} className="min-h-10 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-600" aria-expanded={historyVisible}>{historyVisible ? (isAm ? 'ዝጋ' : 'Hide list') : (isAm ? 'አሳይ' : 'Show list')}</button>
            <button type="button" onClick={() => void load()} disabled={refreshing || busy} className="flex h-10 items-center gap-2 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-600 disabled:opacity-60" aria-label={isAm ? 'አድስ' : 'Refresh handover history'}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">{refreshing ? (isAm ? 'በማደስ ላይ' : 'Refreshing') : (isAm ? 'አድስ' : 'Refresh')}</span>
            </button>
          </div>
        </header>
        {data?.handovers.length ? (
          <>
            {historyVisible ? (
              data.canIssue ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-cream-200">
                  <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] gap-3 bg-cream-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-coffee-500 sm:grid">
                    <span>Product / staff</span><span>Issued</span><span>Qty</span><span>Status</span>
                  </div>
                  <ul className="divide-y divide-cream-200">
                    {data.handovers.map((handover) => (
                      <li key={handover.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-coffee-800">{isAm && handover.product.nameAm ? handover.product.nameAm : handover.product.name}</p>
                          <p className="truncate text-[11px] text-coffee-500">{handover.issuerName} → {handover.recipientName}</p>
                        </div>
                        <span className="text-[10px] text-coffee-500 sm:text-xs">{new Date(handover.issued_at).toLocaleDateString(isAm ? 'am-ET' : 'en-ET')}</span>
                        <span className="text-xs font-black text-coffee-700">{handover.quantity_issued}</span>
                        <span className={`text-[10px] font-black ${handover.status === 'accepted' ? 'text-berbere-700' : handover.status === 'disputed' ? 'text-danger' : 'text-gold-700'}`}>{statusLabel(handover.status)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">{data.handovers.slice(0, 5).map((handover) => voucherCard(handover, handover.canVerify))}</ul>
              )
            ) : (
              <p className="mt-4 rounded-xl bg-cream-50 px-3 py-4 text-center text-xs text-coffee-500">{isAm ? 'ታሪኩ ተደብቋል።' : 'History is hidden on this screen. The saved audit records are unchanged.'}</p>
            )}
            {!data.canIssue && data.handovers.length > 5 && (
              <details className="mt-3 rounded-xl border border-cream-200 bg-cream-50 px-3">
                <summary className="min-h-11 cursor-pointer py-3 text-xs font-black text-coffee-700">
                  {isAm ? 'የቆዩ ርክክቦች' : `View ${data.handovers.length - 5} older handovers`}
                </summary>
                <ul className="space-y-2 pb-3">{data.handovers.slice(5).map((handover) => voucherCard(handover, handover.canVerify))}</ul>
              </details>
            )}
          </>
        ) : (
          <p className="py-9 text-center text-sm text-coffee-400">{isAm ? 'ገና ርክክብ አልተመዘገበም።' : 'No handovers have been recorded yet.'}</p>
        )}
        {data?.canIssue && data.custodyReports.length > 0 && (
          <details id="handover-count-history" className="mt-5 scroll-mt-24 border-t border-cream-200 pt-3">
            <summary className="min-h-11 cursor-pointer text-sm font-black text-coffee-800">{isAm ? 'የተዘጉ የእቃ ቆጠራዎች' : `Staff stock counts (${data.custodyReports.length})`}</summary>
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
                      const returned = Number(line.quantity_returned ?? 0)
                      const expected = line.expected_remaining == null ? null : Number(line.expected_remaining)
                      const physical = line.physical_count == null ? null : Number(line.physical_count)
                      const difference = line.difference == null ? null : Number(line.difference)
                      return (
                        <div key={line.product_id ?? `${line.product_name ?? 'item'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[11px]">
                          <span className="font-bold text-coffee-700">{line.product_name ?? 'Product'}</span>
                          <span className="text-coffee-500">{isAm ? 'የተመለሰ' : 'Returned'} {returned}</span>
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
          </details>
        )}
      </section>}
    </div>
  )
}

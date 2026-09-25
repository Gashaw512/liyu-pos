'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Share2, Wifi, WifiOff } from 'lucide-react'

import { getDB } from '@/lib/offline/db'
import createClient from '@/lib/supabase/client'

type StatementSale = {
  id: string
  offlineId: string | null
  receiptNumber: string
  subtotal: number
  totalAmount: number
  tipAmount: number
  createdAt: string
  pending: boolean
  items: StatementItem[]
}

type StatementItem = {
  key: string
  productName: string
  quantity: number
  total: number
}

type RemoteSaleItemRow = {
  sale_id: string
  product_id: string
  product_name: string
  quantity: number | string
  unit_price: number | string
  discount: number | string | null
  total_amount: number | string | null
}

type RemoteSaleRow = {
  id: string
  offline_id: string | null
  receipt_number: string
  subtotal: number | string | null
  total_amount: number | string | null
  tip_amount: number | string | null
  created_at: string
}

interface Props {
  businessId: string | null
  branchId: string | null
  cashierId: string | null
  locale: string
  isAm: boolean
}

const SALES_UPDATED_EVENT = 'liyu:inventory-updated'

function localDayBounds(now: Date) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )

  return { start: start.toISOString(), end: end.toISOString() }
}

function amount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function SellerDailyStatement({
  businessId,
  branchId,
  cashierId,
  locale,
  isAm,
}: Props) {
  const [sales, setSales] = useState<StatementSale[]>([])
  const [loading, setLoading] = useState(true)
  const [remoteAvailable, setRemoteAvailable] = useState(false)
  const [productDetailsAvailable, setProductDetailsAvailable] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const t = useCallback(
    (en: string, am: string) => isAm ? am : en,
    [isAm],
  )

  const refresh = useCallback(async () => {
    if (!businessId || !branchId || !cashierId) {
      setSales([])
      setRemoteAvailable(false)
      setLoading(false)
      return
    }

    const { start, end } = localDayBounds(new Date())
    let remoteSales: StatementSale[] = []
    let remoteLoaded = false
    let remoteItemsLoaded = true

    try {
      const { data, error } = await createClient()
        .from('sales')
        .select('id, offline_id, receipt_number, subtotal, total_amount, tip_amount, created_at')
        .eq('business_id', businessId)
        .eq('branch_id', branchId)
        .eq('cashier_id', cashierId)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = (data ?? []) as unknown as RemoteSaleRow[]
      remoteSales = rows.map((sale) => ({
        id: sale.id,
        offlineId: sale.offline_id,
        receiptNumber: sale.receipt_number,
        subtotal: amount(sale.subtotal),
        totalAmount: amount(sale.total_amount),
        tipAmount: amount(sale.tip_amount),
        createdAt: sale.created_at,
        pending: false,
        items: [],
      }))
      remoteLoaded = true

      if (remoteSales.length > 0) {
        try {
          const { data: itemData, error: itemError } = await createClient()
            .from('sale_items')
            .select('sale_id, product_id, product_name, quantity, unit_price, discount, total_amount')
            .in('sale_id', remoteSales.map((sale) => sale.id))

          if (itemError) throw itemError

          const itemsBySale = new Map<string, StatementItem[]>()
          for (const item of (itemData ?? []) as unknown as RemoteSaleItemRow[]) {
            const quantity = amount(item.quantity)
            const total = item.total_amount == null
              ? (amount(item.unit_price) - amount(item.discount)) * quantity
              : amount(item.total_amount)
            const saleItems = itemsBySale.get(item.sale_id) ?? []
            saleItems.push({
              key: item.product_id || item.product_name,
              productName: item.product_name,
              quantity,
              total,
            })
            itemsBySale.set(item.sale_id, saleItems)
          }

          remoteSales = remoteSales.map((sale) => ({
            ...sale,
            items: itemsBySale.get(sale.id) ?? [],
          }))
        } catch (error) {
          remoteItemsLoaded = false
          console.warn('[SellerDailyStatement] Product details unavailable:', error)
        }
      }
    } catch (error) {
      console.warn('[SellerDailyStatement] Remote sales unavailable:', error)
    }

    try {
      const db = await getDB()
      const pendingSales = db.objectStoreNames.contains('pending_sales')
        ? await db.getAll('pending_sales')
        : []

      const remoteOfflineIds = new Set(
        remoteSales
          .map((sale) => sale.offlineId)
          .filter((id): id is string => Boolean(id)),
      )

      const localSales: StatementSale[] = pendingSales
        .filter((sale) => {
          const createdAt = sale.createdAt
          const created = new Date(createdAt)

          return sale.business_id === businessId &&
            sale.branch_id === branchId &&
            sale.cashier_id === cashierId &&
            sale.status === 'completed' &&
            Number.isFinite(created.getTime()) &&
            created >= new Date(start) &&
            created < new Date(end) &&
            !remoteOfflineIds.has(sale.offline_id ?? sale.localId)
        })
        .map((sale) => {
          const subtotal = amount(sale.subtotal)
          const tipAmount = amount(sale.tip_amount)

          return {
            id: sale.localId,
            offlineId: sale.offline_id ?? sale.localId,
            receiptNumber: sale.receipt_number ?? sale.localId,
            subtotal,
            totalAmount: amount(sale.total_amount) || subtotal + tipAmount,
            tipAmount,
            createdAt: sale.createdAt,
            pending: true,
            items: (sale.items ?? []).map((item) => {
              const quantity = amount(item.quantity)
              const unitPrice = amount(item.unit_price)
              const total = (unitPrice - amount(item.discount)) * quantity

              return {
                key: item.product_id || item.product_name,
                productName: item.product_name,
                quantity,
                total,
              }
            }),
          }
        })

      setSales(
        [...remoteSales, ...localSales].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      )
      setRemoteAvailable(remoteLoaded)
      setProductDetailsAvailable(remoteItemsLoaded)
    } catch (error) {
      console.error('[SellerDailyStatement] Could not load local sales:', error)
      setSales(remoteSales)
      setRemoteAvailable(remoteLoaded)
      setProductDetailsAvailable(remoteItemsLoaded)
    } finally {
      setLoading(false)
    }
  }, [businessId, branchId, cashierId])

  useEffect(() => {
    let active = true
    const runRefresh = () => {
      if (active) void refresh()
    }

    runRefresh()
    const interval = window.setInterval(runRefresh, 60_000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') runRefresh()
    }

    window.addEventListener(SALES_UPDATED_EVENT, runRefresh)
    window.addEventListener('focus', runRefresh)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener(SALES_UPDATED_EVENT, runRefresh)
      window.removeEventListener('focus', runRefresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  const summary = useMemo(() => sales.reduce(
    (result, sale) => ({
      sales: result.sales + sale.subtotal,
      tips: result.tips + sale.tipAmount,
      collected: result.collected + sale.totalAmount,
    }),
    { sales: 0, tips: 0, collected: 0 },
  ), [sales])

  const productSummary = useMemo(() => {
    const byProduct = new Map<string, StatementItem>()

    for (const sale of sales) {
      for (const item of sale.items) {
        const current = byProduct.get(item.key) ?? {
          ...item,
          quantity: 0,
          total: 0,
        }
        current.quantity += item.quantity
        current.total += item.total
        byProduct.set(item.key, current)
      }
    }

    const items = [...byProduct.values()].sort(
      (a, b) => b.quantity - a.quantity,
    )

    return {
      items,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.total, 0),
    }
  }, [sales])

  const formatMoney = (value: number) =>
    `${value.toLocaleString(locale === 'am' ? 'am-ET' : 'en-ET', { maximumFractionDigits: 2 })} ETB`

  const formatQuantity = (value: number) =>
    value.toLocaleString(locale === 'am' ? 'am-ET' : 'en-ET', { maximumFractionDigits: 2 })

  const shareStatement = async () => {
    setSharing(true)

    const dateLabel = new Intl.DateTimeFormat(
      isAm ? 'am-ET' : 'en-ET',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    ).format(new Date())

    const text = [
      t('SELLER DAILY STATEMENT', 'የዕለት ሻጭ ሪፖርት'),
      dateLabel,
      `${t('Sales', 'ሽያጭ')}: ${formatMoney(summary.sales)}`,
      `${t('Tips', 'ጉርሻ')}: ${formatMoney(summary.tips)}`,
      `${t('Total collected', 'ጠቅላላ የተሰበሰበ')}: ${formatMoney(summary.collected)}`,
      `${t('Completed sales', 'የተጠናቀቁ ሽያጮች')}: ${sales.length}`,
      `${t('Total items sold', 'የተሸጡ እቃ ብዛት')}: ${formatQuantity(productSummary.quantity)}`,
      `${t('Products total', 'የምርቶች ጠቅላላ')}: ${formatMoney(productSummary.total)}`,
      ...productSummary.items.map((item) =>
        `${item.productName} · ${formatQuantity(item.quantity)} · ${formatMoney(item.total)}`,
      ),
      ...(!productDetailsAvailable
        ? [t('Some product details could not be loaded.', 'አንዳንድ የምርት ዝርዝሮች አልተጫኑም።')]
        : []),
      remoteAvailable
        ? t('Includes synced and unsynced sales.', 'የተመሳሰሉ እና ያልተመሳሰሉ ሽያጮችን ያካትታል።')
        : t('Offline summary: includes unsynced sales only.', 'ከመስመር ውጭ ማጠቃለያ፦ ያልተመሳሰሉ ሽያጮችን ብቻ ያካትታል።'),
    ].join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: t('Daily sales statement', 'የዕለት ሽያጭ ሪፖርት'), text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2500)
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        console.error('[SellerDailyStatement] Share failed:', error)
      }
    } finally {
      setSharing(false)
    }
  }

  const dateLabel = new Intl.DateTimeFormat(
    isAm ? 'am-ET' : 'en-ET',
    { weekday: 'short', month: 'short', day: 'numeric' },
  ).format(new Date())

  return (
    <section className="mb-1.5 rounded-lg border border-coffee-700/10 bg-white shadow-sm">
      <div className="flex min-h-10 items-center gap-1.5 px-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-[11px] font-black text-coffee-800">
            {t('Today', 'ዛሬ')} · {dateLabel}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-coffee-500">
            {loading
              ? '—'
              : `${formatQuantity(productSummary.quantity)} ${t('items', 'እቃ')} · ${formatMoney(productSummary.total)}`}
          </span>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-coffee-400" />
            : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-coffee-400" />}
        </button>

        <span
          className="shrink-0"
          title={remoteAvailable
            ? t('Synced sales included', 'የተመሳሰሉ ሽያጮች ተካተዋል')
            : t('Offline · unsynced sales only', 'ከመስመር ውጭ · ያልተመሳሰሉ ብቻ')}
          aria-label={remoteAvailable ? 'Online sales included' : 'Offline summary'}
        >
          {remoteAvailable
            ? <Wifi className="h-3 w-3 text-berbere-500" />
            : <WifiOff className="h-3 w-3 text-gold-600" />}
        </span>

        <button
          type="button"
          onClick={() => void shareStatement()}
          disabled={sharing || loading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-coffee-600 transition hover:bg-cream-100 disabled:opacity-50"
          aria-label={copied ? t('Copied', 'ተቀድቷል') : t('Share today’s statement', 'የዛሬን ሪፖርት አጋራ')}
          title={copied ? t('Copied', 'ተቀድቷል') : t('Share', 'አጋራ')}
        >
          {sharing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Share2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-cream-200 px-2 py-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <div className="min-w-0 rounded-md bg-cream-50 px-2 py-1.5">
              <p className="truncate text-[9px] font-bold text-coffee-400">{t('Sales', 'ሽያጭ')}</p>
              <p className="mt-0.5 truncate text-[11px] font-black text-coffee-800">
                {loading ? '—' : formatMoney(summary.sales)}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-cream-50 px-2 py-1.5">
              <p className="truncate text-[9px] font-bold text-coffee-400">{t('Orders', 'ትዕዛዞች')}</p>
              <p className="mt-0.5 truncate text-[11px] font-black text-coffee-800">
                {loading ? '—' : sales.length.toLocaleString(locale === 'am' ? 'am-ET' : 'en-ET')}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-cream-50 px-2 py-1.5">
              <p className="truncate text-[9px] font-bold text-coffee-400">{t('Items sold', 'የተሸጡ እቃዎች')}</p>
              <p className="mt-0.5 truncate text-[11px] font-black text-coffee-800">
                {loading ? '—' : formatQuantity(productSummary.quantity)}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-cream-50 px-2 py-1.5">
              <p className="truncate text-[9px] font-bold text-coffee-400">{t('Tips', 'ጉርሻ')}</p>
              <p className="mt-0.5 truncate text-[11px] font-black text-coffee-800">
                {loading ? '—' : formatMoney(summary.tips)}
              </p>
            </div>
          </div>

          <div className="mt-2 overflow-hidden rounded-md border border-cream-200">
            <div className="grid grid-cols-[minmax(0,1fr)_44px_88px] gap-2 bg-cream-50 px-2 py-1 text-[9px] font-black text-coffee-400">
              <span>{t('Product', 'ምርት')}</span>
              <span className="text-right">{t('Qty', 'ብዛት')}</span>
              <span className="text-right">{t('Total', 'ጠቅላላ')}</span>
            </div>

            {!productDetailsAvailable ? (
              <p className="px-2 py-2 text-[10px] text-gold-700">
                {t('Product details are unavailable right now.', 'የምርት ዝርዝር አሁን አልተገኘም።')}
              </p>
            ) : productSummary.items.length === 0 ? (
              <p className="px-2 py-2 text-[10px] text-coffee-400">
                {t('No products sold today.', 'ዛሬ የተሸጠ ምርት የለም።')}
              </p>
            ) : (
              <div className="max-h-40 divide-y divide-cream-100 overflow-y-auto">
                {productSummary.items.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[minmax(0,1fr)_44px_88px] items-center gap-2 px-2 py-1.5 text-[10px]"
                  >
                    <span className="truncate font-semibold text-coffee-700" title={item.productName}>
                      {item.productName}
                    </span>
                    <span className="text-right font-mono text-coffee-600">
                      {formatQuantity(item.quantity)}
                    </span>
                    <span className="truncate text-right font-mono font-bold text-coffee-800">
                      {formatMoney(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {productDetailsAvailable && productSummary.items.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-cream-200 bg-cream-50 px-2 py-1.5 text-[10px] font-black text-coffee-800">
                <span>{t('Products total', 'የምርቶች ጠቅላላ')}</span>
                <span className="font-mono">{formatMoney(productSummary.total)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Clock3, Loader2, MapPin, Package, Wallet, X } from 'lucide-react'

type OpenShift = {
  id: string
  cashierName: string
  branchName: string
  shiftLabel: string
  openedAt: string
  openingCash: number
  salesTotal: number
  transactionCount: number
  products: Array<{ name: string; quantity: number; revenue: number }>
}

interface OpenShiftsPreviewProps {
  locale: string
  count: number
  isOwner: boolean
  onNavigate: () => void
}

function formatMoney(value: number, locale: string) {
  return `${value.toLocaleString(locale === 'am' ? 'am-ET' : 'en-ET', { maximumFractionDigits: 2 })} ETB`
}

export default function OpenShiftsPreview({ locale, count, isOwner, onNavigate }: OpenShiftsPreviewProps) {
  const isAm = locale === 'am'
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shifts, setShifts] = useState<OpenShift[]>([])
  const [retryCount, setRetryCount] = useState(0)

  const t = (en: string, am: string) => isAm ? am : en

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    void fetch('/api/dashboard/open-shifts', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { shifts?: OpenShift[]; error?: string }
        if (!response.ok) throw new Error(result.error || 'Unable to load open shifts.')
        setShifts(result.shifts ?? [])
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return
        setError(isAm
          ? 'የፈረቃ ዝርዝሩን መጫን አልተቻለም። እንደገና ይሞክሩ።'
          : 'Could not load shift details. Please try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [open, retryCount, isAm])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const retry = () => {
    setError(null)
    setLoading(true)
    setRetryCount((value) => value + 1)
  }

  const openPreview = () => {
    if (!isOwner) {
      onNavigate()
      return
    }
    setError(null)
    setLoading(true)
    setOpen(true)
  }

  const dialog = open && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-coffee-900/55 p-0 pt-[env(safe-area-inset-top)] backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-shifts-title"
        className="flex max-h-[calc(100dvh-env(safe-area-inset-top))] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-cream-200 bg-cream-50 shadow-modal sm:max-h-[88dvh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start gap-3 bg-coffee-900 p-4 text-white sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-400">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="open-shifts-title" className="text-base font-black">
              {t('Open shifts', 'ክፍት ፈረቃዎች')}
            </h2>
            <p className="mt-1 text-xs text-cream-300">
              {t('See who is working and what has been sold.', 'ማን እየሠራ እንደሆነ እና የተሸጠውን ይመልከቱ።')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-cream-300 transition hover:bg-white/10 hover:text-white"
            aria-label={t('Close open shifts preview', 'የፈረቃ ዝርዝሩን ዝጋ')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-coffee-500">
              <Loader2 className="h-5 w-5 animate-spin text-berbere-500" />
              {t('Loading shifts...', 'ፈረቃዎችን በመጫን ላይ...')}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-center">
              <p className="text-sm font-bold text-coffee-700">{error}</p>
              <button type="button" onClick={retry} className="mt-3 rounded-xl bg-coffee-800 px-4 py-2.5 text-xs font-black text-white">
                {t('Try again', 'እንደገና ሞክር')}
              </button>
            </div>
          )}

          {!loading && !error && shifts.length === 0 && (
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-10 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-coffee-300" />
              <p className="mt-3 text-sm font-bold text-coffee-700">{t('There are no open shifts.', 'ክፍት ፈረቃ የለም።')}</p>
            </div>
          )}

          {!loading && !error && shifts.map((shift) => (
            <article key={shift.id} className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-100 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-coffee-800">{shift.cashierName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-coffee-500">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{shift.branchName}</span>
                    <span>{shift.shiftLabel}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-coffee-400">
                    {t('Started', 'የጀመረበት')}: {new Date(shift.openedAt).toLocaleString(isAm ? 'am-ET' : 'en-ET', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span className="rounded-full bg-berbere-50 px-2.5 py-1 text-[10px] font-black text-berbere-700">{t('Working', 'በሥራ ላይ')}</span>
              </div>

              <div className="grid grid-cols-2 divide-x divide-cream-100 sm:grid-cols-3">
                <div className="p-3">
                  <p className="text-[10px] font-bold text-coffee-400">{t('Sales', 'ሽያጭ')}</p>
                  <p className="mt-1 font-mono text-sm font-black text-berbere-600">{formatMoney(shift.salesTotal, locale)}</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold text-coffee-400">{t('Bills', 'ደረሰኞች')}</p>
                  <p className="mt-1 font-mono text-sm font-black text-coffee-800">{shift.transactionCount.toLocaleString(isAm ? 'am-ET' : 'en-ET')}</p>
                </div>
                <div className="col-span-2 border-t border-cream-100 p-3 sm:col-span-1 sm:border-l sm:border-t-0">
                  <p className="inline-flex items-center gap-1 text-[10px] font-bold text-coffee-400"><Wallet className="h-3 w-3" />{t('Opening cash', 'የመነሻ ካሽ')}</p>
                  <p className="mt-1 font-mono text-sm font-black text-coffee-800">{formatMoney(shift.openingCash, locale)}</p>
                </div>
              </div>

              <div className="border-t border-cream-100 px-4 py-3">
                <h4 className="inline-flex items-center gap-1.5 text-[11px] font-black text-coffee-700">
                  <Package className="h-3.5 w-3.5 text-berbere-500" />
                  {t('Items sold', 'የተሸጡ ዕቃዎች')}
                </h4>
                {shift.products.length ? (
                  <div className="mt-2 divide-y divide-cream-100">
                    {shift.products.map((product) => (
                      <div key={product.name} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span className="min-w-0 flex-1 truncate font-bold text-coffee-700">{product.name}</span>
                        <span className="shrink-0 text-right text-coffee-500">× {product.quantity.toLocaleString(isAm ? 'am-ET' : 'en-ET')}</span>
                        <span className="w-28 shrink-0 text-right font-mono font-black text-coffee-700">{formatMoney(product.revenue, locale)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg bg-cream-50 px-3 py-2 text-[11px] text-coffee-400">{t('No completed sales recorded yet.', 'ገና የተጠናቀቀ ሽያጭ አልተመዘገበም።')}</p>
                )}
              </div>
            </article>
          ))}

          {!loading && !error && shifts.length > 0 && (
            <p className="px-1 text-[10px] leading-4 text-coffee-400">
              {t('Sales shown are completed and synced. Offline sales appear after the device reconnects.', 'የታዩት የተጠናቀቁና የተመሳሰሉ ሽያጮች ናቸው። Offline ሽያጮች መሣሪያው ከተገናኘ በኋላ ይታያሉ።')}
            </p>
          )}
        </div>

        <footer className="shrink-0 border-t border-cream-200 bg-cream-100/70 p-3 sm:p-4">
          <button type="button" onClick={() => setOpen(false)} className="h-11 w-full rounded-xl border border-cream-300 bg-white text-xs font-black text-coffee-700">
            {t('Done', 'ጨርስ')}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        className="flex items-center justify-between rounded-xl border border-coffee-100 bg-coffee-50 px-3 py-3 text-left transition hover:bg-coffee-100 sm:col-span-2"
      >
        <div className="flex items-center gap-3">
          <Wallet className={`h-4 w-4 ${count > 0 ? 'text-berbere-600' : 'text-coffee-500'}`} />
          <div>
            <p className="text-xs font-black text-coffee-800">
              {count > 0
                ? `${count.toLocaleString(isAm ? 'am-ET' : 'en-ET')} ${count === 1 ? t('shift is open', 'ፈረቃ ክፍት ነው') : t('shifts are open', 'ፈረቃዎች ክፍት ናቸው')}`
                : t('No shift is open', 'ምንም ፈረቃ ክፍት የለም')}
            </p>
            <p className="mt-0.5 text-[9px] text-coffee-500">
              {count > 0
                ? isOwner
                  ? t('Tap to see staff and sales', 'ሰራተኞችንና ሽያጭን ለማየት ይጫኑ')
                  : t('Business is active', 'ንግዱ እየሰራ ነው')
                : isOwner
                  ? t('View shift details', 'የፈረቃ ዝርዝር ይመልከቱ')
                  : t('Open a shift to start', 'ለመጀመር ፈረቃ ይክፈቱ')}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-coffee-300" />
      </button>
      {dialog}
    </>
  )
}

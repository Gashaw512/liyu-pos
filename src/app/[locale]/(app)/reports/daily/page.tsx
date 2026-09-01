// src/app/[locale]/(app)/reports/daily/page.tsx
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { getDB } from '../../../../../lib/offline/db'
import createClient from '../../../../../lib/supabase/client'
interface SaleItem {
  id?: string
  sale_id?: string
  saleId?: string

  product_id?: string
  productId?: string

  category_id?: string
  categoryId?: string

  product_name?: string
  productName?: string
  name?: string

  quantity?: number

  unit_price?: number
  unitPrice?: number
  price?: number

  total?: number
  total_amount?: number
}

interface Payment {
  id?: string
  sale_id?: string
  saleId?: string

  method?: string
  payment_method?: string

  amount?: number
}

interface SaleRecord {
  id?: string
  sale_id?: string

  created_at?: string
  createdAt?: string

  subtotal?: number
  total_amount?: number
  totalAmount?: number

  tip_amount?: number
  tipAmount?: number

  payment_method?: string
  paymentMethod?: string

  items?: SaleItem[]
  sale_items?: SaleItem[]

  payments?: Payment[]

  synced?: boolean
  sync_status?: string
  status?: string
}

interface ProductRecord {
  id: string
  name?: string
  stock_quantity?: number
  quantity?: number
  reorder_level?: number
  low_stock_threshold?: number
}

interface CategoryRecord {
  id: string
  name?: string
}

interface ShiftRecord {
  id?: string
  opening_cash?: number
  actual_cash?: number | null
  opened_by?: string
  opened_at?: string
  closed_at?: string
  status?: string
}

interface ExpenseRecord {
  id?: string
  amount?: number
  total_amount?: number

  description?: string
  note?: string
  category?: string
  expense_category?: string

  expense_date?: string
  date?: string
  created_at?: string

  status?: string
}

interface ProductSummary {
  id: string
  name: string
  quantity: number
  revenue: number
}

interface CategorySummary {
  id: string
  name: string
  quantity: number
  revenue: number
}

interface PaymentSummary {
  method: string
  amount: number
}

function numberValue(value: unknown): number {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}
function getSaleId(sale: SaleRecord): string {
  return String(sale.id || sale.sale_id || '')
}
function getSaleDate(sale: SaleRecord): string {
  return String(sale.created_at || sale.createdAt || '')
}
function getSaleTotal(sale: SaleRecord): number {
  return numberValue(
    sale.total_amount ??
      sale.totalAmount ??
      sale.subtotal ??
      0,
  )
}
function getSaleTip(sale: SaleRecord): number {
  return numberValue(
    sale.tip_amount ??
      sale.tipAmount ??
      0,
  )
}

function getSaleItems(sale: SaleRecord): SaleItem[] {
  if (Array.isArray(sale.items)) {
    return sale.items
  }

  if (Array.isArray(sale.sale_items)) {
    return sale.sale_items
  }

  return []
}

function getPaymentMethod(payment: Payment): string {
  return String(
    payment.method ||
      payment.payment_method ||
      'other',
  )
    .trim()
    .toLowerCase()
}

function getSalePaymentMethod(sale: SaleRecord): string {
  return String(
    sale.payment_method ||
      sale.paymentMethod ||
      'other',
  )
    .trim()
    .toLowerCase()
}

function getItemRevenue(item: SaleItem): number {
  const quantity = numberValue(item.quantity)

  if (item.total != null) {
    return numberValue(item.total)
  }

  if (item.total_amount != null) {
    return numberValue(item.total_amount)
  }

  return (
    quantity *
    numberValue(
      item.unit_price ??
        item.unitPrice ??
        item.price ??
        0,
    )
  )
}

function getExpenseAmount(expense: ExpenseRecord): number {
  return numberValue(
    expense.amount ??
      expense.total_amount ??
      0,
  )
}

function getExpenseDate(expense: ExpenseRecord): string {
  return String(
    expense.expense_date ||
      expense.date ||
      expense.created_at ||
      '',
  )
}
function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString()} ETB`
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}

function formatPaymentName(method: string): string {
  const normalized = method.toLowerCase()

  if (normalized === 'cash') return 'Cash'
  if (normalized === 'telebirr') return 'Telebirr'

  if (
    normalized === 'bank' ||
    normalized === 'bank_transfer' ||
    normalized === 'transfer'
  ) {
    return 'Bank Transfer'
  }

  if (normalized === 'card') return 'Card'

  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isToday(dateString: string): boolean {
  if (!dateString) return false

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function getTodayRange() {
  const start = new Date()

  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  end.setDate(end.getDate() + 1)

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

function addPayment(
  totals: Record<string, number>,
  method: string,
  amount: number,
) {
  const normalized = method.toLowerCase()

  if (normalized === 'cash') {
    totals.cash += amount
  } else if (normalized === 'telebirr') {
    totals.telebirr += amount
  } else if (
    normalized === 'bank' ||
    normalized === 'bank_transfer' ||
    normalized === 'transfer'
  ) {
    totals.bank += amount
  } else if (normalized === 'card') {
    totals.card += amount
  } else {
    totals.other += amount
  }
}

export default function DailyReportPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale || 'en')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [sales, setSales] = useState<SaleRecord[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])

  const [products, setProducts] = useState<ProductRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])

  const [activeShift, setActiveShift] =
    useState<ShiftRecord | null>(null)

  const [remoteSalesCount, setRemoteSalesCount] = useState(0)
  const [localOnlySalesCount, setLocalOnlySalesCount] = useState(0)

  const [remoteExpenseCount, setRemoteExpenseCount] = useState(0)

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null)

  const [remoteAvailable, setRemoteAvailable] =
    useState(true)
  const t = (en: string, am: string) =>
    isAm ? am : en

  const loadReport = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        const db = await getDB()
        const supabase = createClient()

        const {
          start,
          end,
          startISO,
          endISO,
        } = getTodayRange()

        let localHistory: SaleRecord[] = []

        try {
          localHistory =
            ((await db.getAll(
              'completed_sales_history',
            )) || []) as SaleRecord[]
        } catch {
          localHistory = []
        }

        const localTodaySales =
          localHistory.filter((sale) =>
            isToday(getSaleDate(sale)),
          )
        try {
          const currentShift = await db.get(
            'active_shift',
            'current',
          )

          setActiveShift(
            currentShift
              ? (currentShift as ShiftRecord)
              : null,
          )
        } catch {
          setActiveShift(null)
        }

        try {
          const [
            cachedProducts,
            cachedCategories,
          ] = await Promise.all([
            db.getAll('products'),
            db.getAll('categories'),
          ])

          setProducts(
            (cachedProducts || []) as ProductRecord[],
          )

          setCategories(
            (cachedCategories || []) as CategoryRecord[],
          )
        } catch {
          setProducts([])
          setCategories([])
        }
        let remoteSales: SaleRecord[] = []

        try {
          const {
            data,
            error,
          } = await supabase
            .from('sales')
            .select('*')
            .gte('created_at', startISO)
            .lt('created_at', endISO)
            .order('created_at', {
              ascending: false,
            })

          if (error) {
            throw error
          }

          remoteSales =
            ((data || []) as SaleRecord[])

          setRemoteAvailable(true)
          setRemoteSalesCount(remoteSales.length)
        } catch (error) {
          console.error(
            'Unable to load remote sales:',
            error,
          )

          setRemoteAvailable(false)
          setRemoteSalesCount(0)
        }

        const mergedSalesMap =
          new Map<string, SaleRecord>()

        remoteSales.forEach((sale) => {
          const id = getSaleId(sale)

          if (id) {
            mergedSalesMap.set(id, sale)
          }
        })

        let localOnlyCount = 0

        localTodaySales.forEach((sale) => {
          const id = getSaleId(sale)

          if (!id) {
            return
          }

          if (!mergedSalesMap.has(id)) {
            mergedSalesMap.set(id, sale)
            localOnlyCount += 1
          }
        })

        const mergedSales =
          Array.from(
            mergedSalesMap.values(),
          ).sort(
            (a, b) =>
              new Date(
                getSaleDate(b),
              ).getTime() -
              new Date(
                getSaleDate(a),
              ).getTime(),
          )

        setSales(mergedSales)
        setLocalOnlySalesCount(localOnlyCount)
        if (remoteSales.length > 0) {
          try {
            const remoteSaleIds =
              remoteSales
                .map(getSaleId)
                .filter(Boolean)

            if (remoteSaleIds.length > 0) {
              const {
                data: remoteItems,
                error: itemsError,
              } = await supabase
                .from('sale_items')
                .select('*')
                .in(
                  'sale_id',
                  remoteSaleIds,
                )

              if (!itemsError && remoteItems) {
                const itemsBySale =
                  new Map<string, SaleItem[]>()

                ;(remoteItems as SaleItem[]).forEach(
                  (item) => {
                    const saleId = String(
                      item.sale_id ||
                        item.saleId ||
                        '',
                    )

                    if (!saleId) return

                    const existing =
                      itemsBySale.get(saleId) ||
                      []

                    existing.push(item)

                    itemsBySale.set(
                      saleId,
                      existing,
                    )
                  },
                )

                mergedSales.forEach((sale) => {
                  const id = getSaleId(sale)

                  const remoteItemsForSale =
                    itemsBySale.get(id)

                  if (
                    remoteItemsForSale &&
                    remoteItemsForSale.length > 0
                  ) {
                    sale.items =
                      remoteItemsForSale
                  }
                })
              }
            }
          } catch (error) {
            console.warn(
              'Unable to load remote sale items:',
              error,
            )
          }

          try {
            const remoteSaleIds =
              remoteSales
                .map(getSaleId)
                .filter(Boolean)

            if (remoteSaleIds.length > 0) {
              const {
                data: remotePayments,
                error: paymentsError,
              } = await supabase
                .from('payments')
                .select('*')
                .in(
                  'sale_id',
                  remoteSaleIds,
                )

              if (
                !paymentsError &&
                remotePayments
              ) {
                const paymentsBySale =
                  new Map<string, Payment[]>()

                ;(
                  remotePayments as Payment[]
                ).forEach((payment) => {
                  const saleId = String(
                    payment.sale_id ||
                      payment.saleId ||
                      '',
                  )

                  if (!saleId) return

                  const existing =
                    paymentsBySale.get(
                      saleId,
                    ) || []

                  existing.push(payment)

                  paymentsBySale.set(
                    saleId,
                    existing,
                  )
                })

                mergedSales.forEach((sale) => {
                  const id = getSaleId(sale)

                  const remotePaymentsForSale =
                    paymentsBySale.get(id)

                  if (
                    remotePaymentsForSale &&
                    remotePaymentsForSale.length > 0
                  ) {
                    sale.payments =
                      remotePaymentsForSale
                  }
                })
              }
            }
          } catch (error) {
            console.warn(
              'Unable to load remote payments:',
              error,
            )
          }
        }

        let remoteExpenses: ExpenseRecord[] = []

        try {
          const {
            data,
            error,
          } = await supabase
            .from('expenses')
            .select('*')
            .gte(
              'created_at',
              startISO,
            )
            .lt(
              'created_at',
              endISO,
            )

          if (!error && data) {
            remoteExpenses =
              data as ExpenseRecord[]
          }
        } catch (error) {
          console.warn(
            'Remote expenses table unavailable:',
            error,
          )
        }

        setRemoteExpenseCount(
          remoteExpenses.length,
        )

        let localExpenses: ExpenseRecord[] = []

        try {
          const local =
            await db.getAll('expenses')

          localExpenses =
            ((local || []) as ExpenseRecord[])
              .filter((expense) =>
                isToday(
                  getExpenseDate(expense),
                ),
              )
        } catch {
          localExpenses = []
        }

        const expenseMap =
          new Map<string, ExpenseRecord>()

        remoteExpenses.forEach(
          (expense, index) => {
            const id = String(
              expense.id ||
                `remote-expense-${index}`,
            )

            expenseMap.set(id, expense)
          },
        )

        localExpenses.forEach(
          (expense, index) => {
            const id = String(
              expense.id ||
                `local-expense-${index}`,
            )

            if (!expenseMap.has(id)) {
              expenseMap.set(id, expense)
            }
          },
        )

        setExpenses(
          Array.from(
            expenseMap.values(),
          ),
        )

        setLastUpdated(new Date())

        void start
        void end
      } catch (error) {
        console.error(
          'Failed to load daily report:',
          error,
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()

    categories.forEach((category) => {
      map.set(
        String(category.id),
        category.name || 'General',
      )
    })

    return map
  }, [categories])

  const productMap = useMemo(() => {
    const map = new Map<string, string>()

    products.forEach((product) => {
      map.set(
        String(product.id),
        product.name || 'Unknown Product',
      )
    })

    return map
  }, [products])

  const financials = useMemo(() => {
    let salesTotal = 0
    let tips = 0

    const payments = {
      cash: 0,
      telebirr: 0,
      bank: 0,
      card: 0,
      other: 0,
    }

    sales.forEach((sale) => {
      salesTotal += getSaleTotal(sale)
      tips += getSaleTip(sale)

      const salePayments =
        Array.isArray(sale.payments)
          ? sale.payments
          : []

      if (salePayments.length > 0) {
        salePayments.forEach(
          (payment) => {
            addPayment(
              payments,
              getPaymentMethod(payment),
              numberValue(
                payment.amount,
              ),
            )
          },
        )
      } else {
        addPayment(
          payments,
          getSalePaymentMethod(sale),
          getSaleTotal(sale),
        )
      }
    })

    const totalReceived =
      salesTotal + tips

    const paymentTotal =
      payments.cash +
      payments.telebirr +
      payments.bank +
      payments.card +
      payments.other

    return {
      salesTotal,
      tips,
      totalReceived,

      cash: payments.cash,
      telebirr: payments.telebirr,
      bank: payments.bank,
      card: payments.card,
      other: payments.other,

      paymentTotal,
    }
  }, [sales])

  const expenseSummary = useMemo(() => {
    const total = expenses.reduce(
      (sum, expense) =>
        sum + getExpenseAmount(expense),
      0,
    )

    const byCategory =
      new Map<string, number>()

    expenses.forEach((expense) => {
      const category =
        String(
          expense.category ||
            expense.expense_category ||
            'Other',
        ).trim() || 'Other'

      byCategory.set(
        category,
        (byCategory.get(category) || 0) +
          getExpenseAmount(expense),
      )
    })

    return {
      total,
      byCategory:
        Array.from(
          byCategory.entries(),
        )
          .map(
            ([category, amount]) => ({
              category,
              amount,
            }),
          )
          .sort(
            (a, b) =>
              b.amount - a.amount,
          ),
    }
  }, [expenses])

  const netResult =
    financials.totalReceived -
    expenseSummary.total
  const itemsSold = useMemo(() => {
    return sales.reduce(
      (total, sale) =>
        total +
        getSaleItems(sale).reduce(
          (itemTotal, item) =>
            itemTotal +
            numberValue(item.quantity),
          0,
        ),
      0,
    )
  }, [sales])

  const productReport =
    useMemo(() => {
      const map =
        new Map<string, ProductSummary>()

      sales.forEach((sale) => {
        getSaleItems(sale).forEach(
          (item) => {
            const productId = String(
              item.product_id ||
                item.productId ||
                item.name ||
                item.id ||
                'unknown',
            )

            const productName =
              item.product_name ||
              item.productName ||
              item.name ||
              productMap.get(
                productId,
              ) ||
              'Unknown Product'

            const quantity =
              numberValue(
                item.quantity,
              )

            const revenue =
              getItemRevenue(item)

            const existing =
              map.get(productId)

            if (existing) {
              existing.quantity +=
                quantity

              existing.revenue +=
                revenue
            } else {
              map.set(productId, {
                id: productId,
                name: productName,
                quantity,
                revenue,
              })
            }
          },
        )
      })

      return Array.from(
        map.values(),
      ).sort(
        (a, b) =>
          b.revenue - a.revenue,
      )
    }, [sales, productMap])

  const categoryReport =
    useMemo(() => {
      const map =
        new Map<string, CategorySummary>()

      sales.forEach((sale) => {
        getSaleItems(sale).forEach(
          (item) => {
            const categoryId =
              String(
                item.category_id ||
                  item.categoryId ||
                  'general',
              )

            const categoryName =
              categoryMap.get(
                categoryId,
              ) || 'General'

            const quantity =
              numberValue(
                item.quantity,
              )

            const revenue =
              getItemRevenue(item)

            const existing =
              map.get(categoryId)

            if (existing) {
              existing.quantity +=
                quantity

              existing.revenue +=
                revenue
            } else {
              map.set(categoryId, {
                id: categoryId,
                name: categoryName,
                quantity,
                revenue,
              })
            }
          },
        )
      })

      return Array.from(
        map.values(),
      ).sort(
        (a, b) =>
          b.revenue - a.revenue,
      )
    }, [sales, categoryMap])

  const paymentReport =
    useMemo(() => {
      const values: PaymentSummary[] =
        [
          {
            method: 'Cash',
            amount:
              financials.cash,
          },
          {
            method: 'Telebirr',
            amount:
              financials.telebirr,
          },
          {
            method: 'Bank Transfer',
            amount:
              financials.bank,
          },
          {
            method: 'Card',
            amount:
              financials.card,
          },
          {
            method: 'Other',
            amount:
              financials.other,
          },
        ]

      return values.filter(
        (item) => item.amount > 0,
      )
    }, [financials])

  const lowStockProducts =
    useMemo(() => {
      return products
        .map((product) => {
          const stock =
            numberValue(
              product.stock_quantity ??
                product.quantity ??
                0,
            )

          const threshold =
            numberValue(
              product.low_stock_threshold ??
                product.reorder_level ??
                5,
            )

          return {
            ...product,
            stock,
            threshold,
          }
        })
        .filter(
          (product) =>
            product.stock <=
            product.threshold,
        )
        .sort(
          (a, b) =>
            a.stock - b.stock,
        )
        .slice(0, 8)
    }, [products])

  const expectedCash = useMemo(() => {
    return (
      numberValue(
        activeShift?.opening_cash,
      ) + financials.cash
    )
  }, [
    activeShift,
    financials.cash,
  ])

  const actualCash =
    activeShift?.actual_cash != null
      ? numberValue(
          activeShift.actual_cash,
        )
      : null

  const cashDifference =
    actualCash != null
      ? actualCash - expectedCash
      : null

  const shareReport = async () => {
    const date =
      new Date().toLocaleDateString(
        isAm ? 'am-ET' : 'en-ET',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )

    const text = [
      'LIYU POS — DAILY REPORT',
      date,
      '',
      `Sales: ${formatMoney(
        financials.salesTotal,
      )}`,
      `Tips: ${formatMoney(
        financials.tips,
      )}`,
      `Total Received: ${formatMoney(
        financials.totalReceived,
      )}`,
      `Expenses: ${formatMoney(
        expenseSummary.total,
      )}`,
      `Net Result: ${formatMoney(
        netResult,
      )}`,
      '',
      `Orders: ${formatNumber(
        sales.length,
      )}`,
      `Items Sold: ${formatNumber(
        itemsSold,
      )}`,
      '',
      'PAYMENTS',
      `Cash: ${formatMoney(
        financials.cash,
      )}`,
      `Telebirr: ${formatMoney(
        financials.telebirr,
      )}`,
      `Bank: ${formatMoney(
        financials.bank,
      )}`,
      `Card: ${formatMoney(
        financials.card,
      )}`,
      '',
      `Shift: ${
        activeShift
          ? 'Open'
          : 'Closed'
      }`,
    ].join('\n')

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            'Liyu POS Daily Report',
          text,
        })
      } else {
        await navigator.clipboard.writeText(
          text,
        )

        window.alert(
          t(
            'Report copied to clipboard.',
            'ሪፖርቱ ወደ clipboard ተቀድቷል።',
          ),
        )
      }
    } catch (error) {
      console.error(
        'Unable to share report:',
        error,
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8B2635] flex items-center justify-center shadow-sm">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>

          <p className="text-sm font-black text-[#5A3E38]">
            {t(
              'Preparing today’s report...',
              'የዛሬን ሪፖርት በማዘጋጀት ላይ...',
            )}
          </p>

          <p className="text-[10px] text-slate-400">
            {t(
              'Checking local and remote records',
              'የlocal እና remote መረጃዎችን በመፈተሽ ላይ',
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F4EB] pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${locale}/reports`,
                )
              }
              className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[#2B1E1A]/10 shadow-sm flex items-center justify-center text-[#5A3E38] hover:bg-[#FAF8F2] active:scale-95 transition"
              aria-label={t(
                'Back',
                'ተመለስ',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#2B1E1A]">
                  {t(
                    'Daily Business Report',
                    'የዕለት የንግድ ሪፖርት',
                  )}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black ${
                    activeShift
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeShift
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />

                  {activeShift
                    ? t(
                        'Shift Open',
                        'ፈረቃ ክፍት',
                      )
                    : t(
                        'Shift Closed',
                        'ፈረቃ ተዘግቷል',
                      )}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />

                  {new Date().toLocaleDateString(
                    isAm
                      ? 'am-ET'
                      : 'en-ET',
                    {
                      weekday:
                        'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </span>

                {lastUpdated && (
                  <span className="hidden sm:flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />

                    {lastUpdated.toLocaleTimeString(
                      isAm
                        ? 'am-ET'
                        : 'en-ET',
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl border text-[10px] font-bold ${
                remoteAvailable
                  ? 'bg-white border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {remoteAvailable ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}

              {remoteAvailable
                ? t(
                    'Remote connected',
                    'Remote ተገናኝቷል',
                  )
                : t(
                    'Remote unavailable',
                    'Remote አልተገናኘም',
                  )}
            </div>

            <button
              type="button"
              onClick={() =>
                loadReport(true)
              }
              disabled={refreshing}
              className="h-10 px-3 rounded-xl bg-white border border-[#2B1E1A]/10 shadow-sm text-[#5A3E38] text-xs font-bold flex items-center gap-2 hover:bg-[#FAF8F2] disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              {t(
                'Refresh',
                'አድስ',
              )}
            </button>

            <button
              type="button"
              onClick={shareReport}
              className="h-10 px-3 rounded-xl bg-[#8B2635] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-[#76202E] active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />

              {t(
                'Share',
                'አጋራ',
              )}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Revenue */}

          <div className="rounded-2xl bg-[#8B2635] p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-white/60">
                  {t(
                    'Total Received',
                    'ጠቅላላ የተቀበለ',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-white font-mono">
                  {formatMoney(
                    financials.totalReceived,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-white" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-white/55">
              {formatMoney(
                financials.salesTotal,
              )}{' '}
              {t(
                'sales + tips',
                'ሽያጭ + ጉርሻ',
              )}
            </p>
          </div>

          {/* Expenses */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Expenses',
                    'ወጪ',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-[#2B1E1A] font-mono">
                  {formatMoney(
                    expenseSummary.total,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {formatNumber(
                expenses.length,
              )}{' '}
              {t(
                'expense records',
                'የወጪ መዝገቦች',
              )}
            </p>
          </div>

          {/* Net */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Net Result',
                    'የተጣራ ውጤት',
                  )}
                </p>

                <p
                  className={`mt-2 text-xl sm:text-2xl font-black font-mono ${
                    netResult >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatMoney(
                    netResult,
                  )}
                </p>
              </div>

              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  netResult >= 0
                    ? 'bg-emerald-50'
                    : 'bg-rose-50'
                }`}
              >
                {netResult >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                )}
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {t(
                'Received minus expenses',
                'የተቀበለ − ወጪ',
              )}
            </p>
          </div>

          {/* Orders */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Orders',
                    'ትዕዛዞች',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-[#2B1E1A] font-mono">
                  {formatNumber(
                    sales.length,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {formatNumber(
                itemsSold,
              )}{' '}
              {t(
                'items sold',
                'እቃዎች ተሸጡ',
              )}
            </p>
          </div>
        </section>
        <section className="rounded-2xl bg-white border border-[#2B1E1A]/10 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {t(
                  'Report Data',
                  'የሪፖርት መረጃ',
                )}
              </p>

              <p className="mt-1 text-xs font-bold text-[#2B1E1A]">
                {t(
                  'Today’s report combines remote records with genuinely local-only offline records.',
                  'የዛሬ ሪፖርት remote መረጃን እና በእውነት local-only የሆኑ offline መረጃዎችን ያጣምራል።',
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">
                <Wifi className="w-3 h-3" />
                {formatNumber(
                  remoteSalesCount,
                )}{' '}
                {t(
                  'remote sales',
                  'remote ሽያጭ',
                )}
              </span>

              {localOnlySalesCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5 text-[9px] font-bold text-amber-700">
                  <WifiOff className="w-3 h-3" />
                  {formatNumber(
                    localOnlySalesCount,
                  )}{' '}
                  {t(
                    'offline only',
                    'offline ብቻ',
                  )}
                </span>
              )}
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8B2635]" />

              <div>
                <h2 className="text-sm font-black text-[#2B1E1A]">
                  {t(
                    'Financial Overview',
                    'የገንዘብ አጠቃላይ እይታ',
                  )}
                </h2>

                <p className="text-[10px] text-slate-400">
                  {t(
                    'Where the business stands today',
                    'የንግዱ የዛሬ ሁኔታ',
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Sales',
                    'ሽያጭ',
                  )}
                </span>

                <span className="font-mono text-sm font-black text-[#2B1E1A]">
                  {formatMoney(
                    financials.salesTotal,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Tips',
                    'ጉርሻ',
                  )}
                </span>

                <span className="font-mono text-sm font-bold text-[#2B1E1A]">
                  {formatMoney(
                    financials.tips,
                  )}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2B1E1A]">
                  {t(
                    'Total Received',
                    'ጠቅላላ የተቀበለ',
                  )}
                </span>

                <span className="font-mono text-base font-black text-[#8B2635]">
                  {formatMoney(
                    financials.totalReceived,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Expenses',
                    'ወጪ',
                  )}
                </span>

                <span className="font-mono text-sm font-black text-rose-600">
                  -{' '}
                  {formatMoney(
                    expenseSummary.total,
                  )}
                </span>
              </div>

              <div className="rounded-xl bg-[#F7F4EB] px-3.5 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-[#2B1E1A]">
                  {t(
                    'Net Result',
                    'የተጣራ ውጤት',
                  )}
                </span>

                <span
                  className={`font-mono text-base font-black ${
                    netResult >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatMoney(
                    netResult,
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />

              <div>
                <h2 className="text-sm font-black text-[#2B1E1A]">
                  {t(
                    'Today’s Expenses',
                    'የዛሬ ወጪዎች',
                  )}
                </h2>

                <p className="text-[10px] text-slate-400">
                  {t(
                    'Money spent by expense category',
                    'በወጪ ምድብ የወጣ ገንዘብ',
                  )}
                </p>
              </div>
            </div>

            <div className="p-4">
              {expenseSummary.byCategory.length ===
              0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-slate-400">
                    {t(
                      'No expenses recorded today.',
                      'ዛሬ ምንም ወጪ አልተመዘገበም።',
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseSummary.byCategory.map(
                    (item) => {
                      const percentage =
                        expenseSummary.total >
                        0
                          ? (item.amount /
                              expenseSummary.total) *
                            100
                          : 0

                      return (
                        <div
                          key={
                            item.category
                          }
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#2B1E1A]">
                              {
                                item.category
                              }
                            </span>

                            <span className="font-mono text-xs font-black text-rose-600">
                              {formatMoney(
                                item.amount,
                              )}
                            </span>
                          </div>

                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-400"
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

              {expenses.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black">
                    {t(
                      'Total Expenses',
                      'ጠቅላላ ወጪ',
                    )}
                  </span>

                  <span className="font-mono font-black text-rose-600">
                    {formatMoney(
                      expenseSummary.total,
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Payment Summary',
                  'የክፍያ ማጠቃለያ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'How customers paid today',
                  'ደንበኞች ዛሬ እንዴት እንደከፈሉ',
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100">
            {[
              {
                label: 'Cash',
                am: 'ካሽ',
                value:
                  financials.cash,
              },
              {
                label: 'Telebirr',
                am: 'ቴሌብር',
                value:
                  financials.telebirr,
              },
              {
                label: 'Bank',
                am: 'ባንክ',
                value:
                  financials.bank,
              },
              {
                label: 'Card',
                am: 'ካርድ',
                value:
                  financials.card,
              },
              {
                label: 'Other',
                am: 'ሌላ',
                value:
                  financials.other,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4"
              >
                <p className="text-[9px] font-bold text-slate-400">
                  {t(
                    item.label,
                    item.am,
                  )}
                </p>

                <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                  {formatMoney(
                    item.value,
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-[#F7F4EB]/60 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black">
              {t(
                'Payment Total',
                'ጠቅላላ ክፍያ',
              )}
            </span>

            <span className="font-mono font-black text-[#8B2635]">
              {formatMoney(
                financials.paymentTotal,
              )}
            </span>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Products Sold Today',
                  'ዛሬ የተሸጡ ምርቶች',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Best-selling products by quantity and revenue',
                  'በብዛትና በገቢ የተሸጡ ምርቶች',
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    #
                  </th>

                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Product',
                      'ምርት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Qty',
                      'ብዛት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Revenue',
                      'ገቢ',
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {productReport.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-xs text-slate-400"
                    >
                      {t(
                        'No product sales recorded today.',
                        'ዛሬ ምንም የምርት ሽያጭ አልተመዘገበም።',
                      )}
                    </td>
                  </tr>
                ) : (
                  productReport.map(
                    (
                      product,
                      index,
                    ) => (
                      <tr
                        key={
                          product.id
                        }
                        className="border-t border-slate-100 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-[#2B1E1A]">
                            {
                              product.name
                            }
                          </p>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-[#5A3E38]">
                          {formatNumber(
                            product.quantity,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                          {formatMoney(
                            product.revenue,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Sales by Category',
                  'ሽያጭ በምድብ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Which category generated the most sales',
                  'የትኛው ምድብ ብዙ ሽያጭ እንዳመጣ',
                )}
              </p>
            </div>
          </div>

          <div className="p-4">
            {categoryReport.length ===
            0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t(
                  'No category data available.',
                  'የምድብ መረጃ የለም።',
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {categoryReport.map(
                  (category) => {
                    const percentage =
                      financials.salesTotal >
                      0
                        ? (category.revenue /
                            financials.salesTotal) *
                          100
                        : 0

                    return (
                      <div
                        key={
                          category.id
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-xs font-black text-[#2B1E1A]">
                              {
                                category.name
                              }
                            </p>

                            <p className="text-[9px] text-slate-400">
                              {formatNumber(
                                category.quantity,
                              )}{' '}
                              {t(
                                'items',
                                'እቃዎች',
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-black font-mono text-emerald-700">
                              {formatMoney(
                                category.revenue,
                              )}
                            </p>

                            <p className="text-[9px] text-slate-400">
                              {Math.round(
                                percentage,
                              )}
                              %
                            </p>
                          </div>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#8B2635] rounded-full"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </div>
        </section>


        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Shift & Cash Check',
                  'የፈረቃና የካሽ ማረጋገጫ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Expected cash compared with counted cash',
                  'መኖር ያለበት ካሽ ከተቆጠረው ካሽ ጋር',
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Opening Cash',
                  'የመነሻ ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {formatMoney(
                  numberValue(
                    activeShift?.opening_cash,
                  ),
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Cash Sales',
                  'የካሽ ሽያጭ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {formatMoney(
                  financials.cash,
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Expected Cash',
                  'መኖር ያለበት ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#8B2635]">
                {formatMoney(
                  expectedCash,
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Actual Cash',
                  'ትክክለኛ ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {actualCash == null
                  ? '—'
                  : formatMoney(
                      actualCash,
                    )}
              </p>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-[#F7F4EB]/50 flex items-center justify-between">
            <span className="text-xs font-black">
              {t(
                'Difference',
                'ልዩነት',
              )}
            </span>

            {cashDifference ==
            null ? (
              <span className="text-[10px] text-slate-400 font-bold">
                {t(
                  'Cash has not been counted yet',
                  'ካሽ ገና አልተቆጠረም',
                )}
              </span>
            ) : cashDifference ===
              0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />

                {t(
                  'Balanced',
                  'ተመጣጣኝ',
                )}
              </span>
            ) : (
              <span
                className={`font-mono text-xs font-black ${
                  cashDifference < 0
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}
              >
                {cashDifference >
                0
                  ? '+'
                  : ''}
                {formatMoney(
                  cashDifference,
                )}
              </span>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#8B2635]" />

            <div className="flex-1">
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Inventory Alert',
                  'የክምችት ማስጠንቀቂያ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Products approaching or below their minimum stock',
                  'ዝቅተኛ ክምችት ላይ ያሉ ምርቶች',
                )}
              </p>
            </div>

            {lowStockProducts.length >
              0 && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Product',
                      'ምርት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Current',
                      'አሁን',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Minimum',
                      'ዝቅተኛ',
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {lowStockProducts.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center"
                    >
                      <span className="text-xs font-bold text-emerald-700">
                        {t(
                          'Inventory levels look healthy.',
                          'የክምችት መጠን ጥሩ ነው።',
                        )}
                      </span>
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map(
                    (product) => (
                      <tr
                        key={
                          product.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-bold text-[#2B1E1A]">
                          {product.name ||
                            'Unknown Product'}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-mono font-black ${
                            product.stock <=
                            0
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {formatNumber(
                            product.stock,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {formatNumber(
                            product.threshold,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="px-4 pt-1 text-center">
          <p className="text-[10px] leading-relaxed text-slate-400">
            {t(
              'Remote synced records are used as the primary source. Local records are included only when their transaction ID does not already exist remotely, preventing duplicate sales after synchronization.',
              'Remote የተመሳሰሉ መረጃዎች ዋና የሪፖርት ምንጭ ናቸው። Local መረጃ የሚጨመረው የግብይቱ ID remote ላይ ከሌለ ብቻ ነው፣ ይህም ከsync በኋላ ድግግሞሽን ይከላከላል።',
            )}
          </p>
          <p className="mt-1 text-[9px] text-slate-300">
            Liyu POS • {remoteAvailable
              ? t(
                  'Remote + Offline',
                  'Remote + Offline',
                )
              : t(
                  'Offline mode',
                  'Offline ሁኔታ',
                )}
          </p>
        </footer>
      </div>
    </main>
  )
}
// src/queries/useSalesQuery.ts

'use client'

import { useQuery } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

import type {
  CategoryPerformance,
  PaymentMethodSummary,
  ProductPerformance,
  Sale,
  SaleItem,
  SalesReport,
  SalesSummary,
} from '@/types/database/sales'
import type { PaymentMethod } from '@/types/enum'

/* ============================================================
   TYPES
   ============================================================ */

interface SalesQueryOptions {
  businessId: string
  branchId?: string | null

  /**
   * Date range must be ISO strings.
   * Example:
   * 2026-08-14T00:00:00.000Z
   */
  from: string
  to: string

  enabled?: boolean
}

interface SaleItemWithProduct extends SaleItem {
  product?: {
    id: string
    category_id: string | null
    category?: {
      id: string
      name: string
      name_am: string | null
    } | null
  } | null
}

/* ============================================================
   HELPERS
   ============================================================ */

const toNumber = (value: unknown): number => {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

/* ============================================================
   FETCH SALES
   ============================================================ */

export async function getSales(
  options: SalesQueryOptions
): Promise<Sale[]> {
  const {
    businessId,
    branchId,
    from,
    to,
  } = options

  if (!businessId) {
    throw new Error('Business ID is required')
  }

  const supabase =
    getSupabaseBrowserClient()

  let query = supabase
    .from('sales')
    .select(`
      id,
      business_id,
      branch_id,
      shift_id,
      cashier_id,
      receipt_number,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      status,
      customer_name,
      customer_phone,
      notes,
      is_offline_sync,
      offline_id,
      created_at,
      voided_at,
      voided_by,
      deleted_at,
      table_id,
      table_name,
      tip_amount
    `)
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', {
      ascending: false,
    })

  if (branchId) {
    query = query.eq(
      'branch_id',
      branchId
    )
  }

  const { data, error } =
    await query

  if (error) {
    console.error(
      '[getSales]',
      error
    )

    throw new Error(
      `Failed to fetch sales: ${error.message}`
    )
  }

  return (data ?? []) as Sale[]
}

/* ============================================================
   FETCH SALE ITEMS
   ============================================================ */

export async function getSaleItems(
  saleIds: string[]
): Promise<SaleItemWithProduct[]> {
  if (!saleIds.length) {
    return []
  }

  const supabase =
    getSupabaseBrowserClient()

  const { data, error } =
    await supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        product_id,
        product_name,
        unit_price,
        cost_price,
        quantity,
        discount,
        total_amount,
        gross_profit,
        created_at,

        product:products (
          id,
          category_id,

          category:categories (
            id,
            name,
            name_am
          )
        )
      `)
      .in('sale_id', saleIds)

  if (error) {
    console.error(
      '[getSaleItems]',
      error
    )

    throw new Error(
      `Failed to fetch sale items: ${error.message}`
    )
  }

  return (
    data ?? []
  ) as SaleItemWithProduct[]
}

/* ============================================================
   FETCH PAYMENT BREAKDOWN
   ============================================================ */

export async function getPaymentSummary(
  businessId: string,
  saleIds: string[]
): Promise<PaymentMethodSummary[]> {
  if (!saleIds.length) {
    return []
  }

  const supabase =
    getSupabaseBrowserClient()

  const { data, error } =
    await supabase
      .from('payments')
      .select(`
        sale_id,
        method,
        amount,
        status
      `)
      .eq('business_id', businessId)
      .in('sale_id', saleIds)
      .eq('status', 'completed')

  if (error) {
    console.error(
      '[getPaymentSummary]',
      error
    )

    throw new Error(
      `Failed to fetch payments: ${error.message}`
    )
  }

  const result =
    new Map<
      PaymentMethod,
      PaymentMethodSummary
    >()

  for (const payment of data ?? []) {
    const method =
      payment.method as PaymentMethod

    const existing =
      result.get(method)

    if (existing) {
      existing.amount +=
        toNumber(payment.amount)

      existing.transactions += 1
    } else {
      result.set(method, {
        method,
        amount:
          toNumber(payment.amount),
        transactions: 1,
      })
    }
  }

  return Array.from(
    result.values()
  )
}

/* ============================================================
   BUILD SALES REPORT
   ============================================================ */

export async function getSalesReport(
  options: SalesQueryOptions
): Promise<SalesReport> {
  const sales =
    await getSales(options)

  const saleIds =
    sales.map(
      sale => sale.id
    )

  const [
    saleItems,
    paymentMethods,
  ] = await Promise.all([
    getSaleItems(saleIds),

    getPaymentSummary(
      options.businessId,
      saleIds
    ),
  ])

  let revenue = 0
  let tax = 0
  let discounts = 0
  let itemsSold = 0
  let grossProfit = 0

  for (const sale of sales) {
    revenue +=
      toNumber(
        sale.total_amount
      )

    tax +=
      toNumber(
        sale.tax_amount
      )

    discounts +=
      toNumber(
        sale.discount_amount
      )
  }

  const categories =
    new Map<
      string,
      CategoryPerformance
    >()

  const products =
    new Map<
      string,
      ProductPerformance
    >()

  for (const item of saleItems) {
    const quantity =
      toNumber(item.quantity)

    const itemRevenue =
      toNumber(
        item.total_amount
      )

    const itemProfit =
      toNumber(
        item.gross_profit
      )

    itemsSold += quantity
    grossProfit += itemProfit

    /* ---------------- CATEGORY ---------------- */

    const category =
      item.product?.category

    const categoryId =
      category?.id ??
      item.product?.category_id ??
      null

    const categoryKey =
      categoryId ??
      'uncategorized'

    const existingCategory =
      categories.get(
        categoryKey
      )

    if (existingCategory) {
      existingCategory.itemsSold +=
        quantity

      existingCategory.revenue +=
        itemRevenue

      existingCategory.grossProfit +=
        itemProfit
    } else {
      categories.set(
        categoryKey,
        {
          categoryId,
          name:
            category?.name ??
            'Uncategorized',
          nameAm:
            category?.name_am ??
            null,
          itemsSold: quantity,
          revenue: itemRevenue,
          grossProfit: itemProfit,
        }
      )
    }

    /* ---------------- PRODUCT ---------------- */

    const productId =
      item.product_id

    const existingProduct =
      products.get(productId)

    if (existingProduct) {
      existingProduct.quantitySold +=
        quantity

      existingProduct.revenue +=
        itemRevenue

      existingProduct.grossProfit +=
        itemProfit
    } else {
      products.set(
        productId,
        {
          productId,
          productName:
            item.product_name,
          quantitySold: quantity,
          revenue: itemRevenue,
          grossProfit: itemProfit,
        }
      )
    }
  }

  const averageSale =
    sales.length > 0
      ? revenue / sales.length
      : 0

  const grossMargin =
    revenue > 0
      ? (grossProfit / revenue) *
        100
      : 0

  return {
    summary: {
      revenue,
      transactions:
        sales.length,
      itemsSold,

      grossProfit,
      grossMargin,

      averageSale,

      discounts,
      tax,
    },

    categories:
      Array.from(
        categories.values()
      ).sort(
        (a, b) =>
          b.revenue -
          a.revenue
      ),

    products:
      Array.from(
        products.values()
      ).sort(
        (a, b) =>
          b.revenue -
          a.revenue
      ),

    paymentMethods,

    pendingOfflineSales:
      sales.filter(
        sale =>
          sale.is_offline_sync
      ).length,
  }
}

/* ============================================================
   REACT QUERY HOOK
   ============================================================ */

export function useSalesQuery(
  options: SalesQueryOptions
) {
  return useQuery({
    queryKey: [
      'sales',
      options.businessId,
      options.branchId ?? 'all',
      options.from,
      options.to,
    ],

    queryFn: () =>
      getSalesReport(
        options
      ),

    enabled:
      Boolean(
        options.businessId
      ) &&
      (options.enabled ?? true),

    staleTime:
      30_000,

    refetchInterval:
      60_000,

    refetchOnWindowFocus:
      true,
  })
}
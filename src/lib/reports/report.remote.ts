import createClient from '@/lib/supabase/client'

import type {
  DailyReportOptions,
  ReportExpense,
  ReportSale,
} from './report.types'

import {
  getReportDateRange,
} from './report.helpers'

export interface RemoteReportData {
  sales: ReportSale[]
  expenses: ReportExpense[]
  remoteAvailable: boolean
}

/* ============================================================
 * REMOTE REPORT
 * ============================================================ */

export async function loadRemoteReportData(
  options: DailyReportOptions,
): Promise<RemoteReportData> {
  if (options.allowRemote === false) {
    return {
      sales: [],
      expenses: [],
      remoteAvailable: false,
    }
  }

  const supabase = createClient()

  const range = getReportDateRange(options.date)

  try {
    /* --------------------------------------------------------
     * SALES
     *
     * IMPORTANT:
     * Payment method does NOT come from sales.
     * Payment information is loaded from payments below.
     * -------------------------------------------------------- */

    let salesQuery = supabase
      .from('sales')
      .select('*')
      .eq(
        'business_id',
        options.businessId,
      )
      .eq(
        'status',
        'completed',
      )
      .is(
        'deleted_at',
        null,
      )
      .gte(
        'created_at',
        range.fromISO,
      )
      .lt(
        'created_at',
        range.toISO,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

    if (options.branchId) {
      salesQuery = salesQuery.eq(
        'branch_id',
        options.branchId,
      )
    }

    const {
      data: salesData,
      error: salesError,
    } = await salesQuery

    if (salesError) {
      throw salesError
    }

    const sales = (
      salesData || []
    ) as ReportSale[]

    /* --------------------------------------------------------
     * SALE IDS
     * -------------------------------------------------------- */

    const saleIds = sales
      .map(
        (sale) =>
          sale.id ||
          sale.sale_id,
      )
      .filter(
        (
          id,
        ): id is string =>
          Boolean(id),
      )

    /* --------------------------------------------------------
     * SALE ITEMS
     * -------------------------------------------------------- */

    if (saleIds.length > 0) {
      const {
        data: items,
        error: itemsError,
      } = await supabase
        .from('sale_items')
        .select('*')
        .in(
          'sale_id',
          saleIds,
        )

      if (itemsError) {
        throw itemsError
      }

      const itemsBySale =
        new Map<string, any[]>()

      for (const item of items || []) {
        const saleId = String(
          item.sale_id || '',
        )

        if (!saleId) {
          continue
        }

        const existing =
          itemsBySale.get(
            saleId,
          ) || []

        existing.push(item)

        itemsBySale.set(
          saleId,
          existing,
        )
      }

      for (const sale of sales) {
        const id = String(
          sale.id ||
            sale.sale_id ||
            '',
        )

        sale.items =
          itemsBySale.get(id) || []
      }
    } else {
      for (const sale of sales) {
        sale.items = []
      }
    }

    /* --------------------------------------------------------
     * PAYMENTS
     *
     * Payment method belongs here, not on sales.
     * Using * keeps this compatible with the actual schema.
     * -------------------------------------------------------- */

    if (saleIds.length > 0) {
      const {
        data: payments,
        error: paymentsError,
      } = await supabase
        .from('payments')
        .select('*')
        .in(
          'sale_id',
          saleIds,
        )

      if (paymentsError) {
        throw paymentsError
      }

      const paymentsBySale =
        new Map<string, any[]>()

      for (const payment of payments || []) {
        const saleId = String(
          payment.sale_id || '',
        )

        if (!saleId) {
          continue
        }

        const existing =
          paymentsBySale.get(
            saleId,
          ) || []

        existing.push(payment)

        paymentsBySale.set(
          saleId,
          existing,
        )
      }

      for (const sale of sales) {
        const id = String(
          sale.id ||
            sale.sale_id ||
            '',
        )

        sale.payments =
          paymentsBySale.get(id) || []
      }
    } else {
      for (const sale of sales) {
        sale.payments = []
      }
    }

    /* --------------------------------------------------------
     * EXPENSES
     * -------------------------------------------------------- */

    let expenseQuery = supabase
      .from('expenses')
      .select('*')
      .eq(
        'business_id',
        options.businessId,
      )
      .is(
        'deleted_at',
        null,
      )
      .gte(
        'expense_date',
        range.fromDate,
      )
      .lt(
        'expense_date',
        range.toDate,
      )

    if (options.branchId) {
      expenseQuery =
        expenseQuery.eq(
          'branch_id',
          options.branchId,
        )
    }

    const {
      data: expenseData,
      error: expenseError,
    } = await expenseQuery

    if (expenseError) {
      throw expenseError
    }

    /* --------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------- */

    console.log(
      '[DailyReport] Remote loaded:',
      {
        sales: sales.length,
        expenses:
          expenseData?.length || 0,
        saleItems: sales.reduce(
          (
            total,
            sale,
          ) =>
            total +
            (
              sale.items
                ?.length || 0
            ),
          0,
        ),
        payments: sales.reduce(
          (
            total,
            sale,
          ) =>
            total +
            (
              sale.payments
                ?.length || 0
            ),
          0,
        ),
      },
    )

    return {
      sales,
      expenses:
        (
          expenseData || []
        ) as ReportExpense[],
      remoteAvailable: true,
    }
  } catch (error) {
    console.warn(
      '[DailyReport] Remote unavailable:',
      error,
    )

    return {
      sales: [],
      expenses: [],
      remoteAvailable: false,
    }
  }
}

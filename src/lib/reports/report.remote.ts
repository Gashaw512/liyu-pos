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
  if (
    options.allowRemote === false
  ) {
    return {
      sales: [],
      expenses: [],
      remoteAvailable: false,
    }
  }

  const supabase =
    createClient()

  const range =
    getReportDateRange(
      options.date,
    )

  try {
    /* --------------------------------------------------------
     * SALES
     * -------------------------------------------------------- */

    let salesQuery =
      supabase
        .from('sales')
        .select(`
          id,
          business_id,
          branch_id,
          created_at,
          subtotal,
          total_amount,
          tip_amount,
          payment_method,
          status,
          is_offline_sync,
          deleted_at
        `)
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

    if (
      options.branchId
    ) {
      salesQuery =
        salesQuery.eq(
          'branch_id',
          options.branchId,
        )
    }

    const {
      data: salesData,
      error: salesError,
    } =
      await salesQuery

    if (
      salesError
    ) {
      throw salesError
    }

    const sales =
      (
        salesData ||
        []
      ) as ReportSale[]

    /* --------------------------------------------------------
     * SALE ITEMS
     * -------------------------------------------------------- */

    const saleIds =
      sales
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

    if (
      saleIds.length > 0
    ) {
      const {
        data: items,
      } =
        await supabase
          .from('sale_items')
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            total_amount,
            gross_profit
          `)
          .in(
            'sale_id',
            saleIds,
          )

      if (items) {
        const itemsBySale =
          new Map<
            string,
            any[]
          >()

        for (
          const item of items
        ) {
          const saleId =
            String(
              item.sale_id ||
                '',
            )

          if (
            !saleId
          ) {
            continue
          }

          const existing =
            itemsBySale.get(
              saleId,
            ) || []

          existing.push(
            item,
          )

          itemsBySale.set(
            saleId,
            existing,
          )
        }

        for (
          const sale of sales
        ) {
          const id =
            String(
              sale.id ||
                sale.sale_id ||
                '',
            )

          const saleItems =
            itemsBySale.get(
              id,
            )

          if (
            saleItems
          ) {
            sale.items =
              saleItems
          }
        }
      }
    }

    /* --------------------------------------------------------
     * PAYMENTS
     * -------------------------------------------------------- */

    if (
      saleIds.length > 0
    ) {
      const {
        data: payments,
      } =
        await supabase
          .from('payments')
          .select(`
            id,
            sale_id,
            method,
            payment_method,
            amount
          `)
          .in(
            'sale_id',
            saleIds,
          )

      if (
        payments
      ) {
        const paymentsBySale =
          new Map<
            string,
            any[]
          >()

        for (
          const payment of payments
        ) {
          const saleId =
            String(
              payment.sale_id ||
                '',
            )

          if (
            !saleId
          ) {
            continue
          }

          const existing =
            paymentsBySale.get(
              saleId,
            ) || []

          existing.push(
            payment,
          )

          paymentsBySale.set(
            saleId,
            existing,
          )
        }

        for (
          const sale of sales
        ) {
          const id =
            String(
              sale.id ||
                sale.sale_id ||
                '',
            )

          const salePayments =
            paymentsBySale.get(
              id,
            )

          if (
            salePayments
          ) {
            sale.payments =
              salePayments
          }
        }
      }
    }

    /* --------------------------------------------------------
     * EXPENSES
     * -------------------------------------------------------- */

    let expenseQuery =
      supabase
        .from('expenses')
        .select(`
          id,
          business_id,
          branch_id,
          amount,
          description,
          category,
          expense_category,
          expense_date,
          created_at,
          status,
          deleted_at
        `)
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
          range.from
            .toISOString()
            .slice(0, 10),
        )
        .lt(
          'expense_date',
          range.to
            .toISOString()
            .slice(0, 10),
        )

    if (
      options.branchId
    ) {
      expenseQuery =
        expenseQuery.eq(
          'branch_id',
          options.branchId,
        )
    }

    const {
      data: expenseData,
    } =
      await expenseQuery

    return {
      sales,

      expenses:
        (
          expenseData ||
          []
        ) as ReportExpense[],

      remoteAvailable:
        true,
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
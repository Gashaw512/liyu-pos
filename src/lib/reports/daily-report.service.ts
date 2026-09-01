import type {
  DailyReport,
  DailyReportOptions,
  CategorySummary,
  ProductSummary,
  ReportSale,
} from './report.types'

import {
  getExpenseAmount,
  getItemGrossProfit,
  getItemRevenue,
  getPaymentMethod,
  getSaleId,
  getSaleItems,
  getSalePaymentMethod,
  getSaleTip,
  getSaleTotal,
  getSaleDate,
  normalizePaymentMethod,
  toNumber,
} from './report.helpers'

import {
  loadLocalReportData,
} from './report.local'

import {
  loadRemoteReportData,
} from './report.remote'

/* ============================================================
 * MERGE SALES
 * ============================================================ */

function mergeSales(
  localSales: ReportSale[],
  remoteSales: ReportSale[],
) {
  const map =
    new Map<
      string,
      ReportSale
    >()

  /*
   * Remote is preferred when available.
   */
  for (
    const sale of remoteSales
  ) {
    const id =
      getSaleId(
        sale,
      )

    if (
      id
    ) {
      map.set(
        id,
        sale,
      )
    }
  }

  /*
   * Local fills anything remote does not have yet.
   */
  let localOnly = 0

  for (
    const sale of localSales
  ) {
    const id =
      getSaleId(
        sale,
      )

    if (
      !id
    ) {
      continue
    }

    if (
      !map.has(id)
    ) {
      map.set(
        id,
        sale,
      )

      localOnly++
    }
  }

  return {
    sales:
      Array.from(
        map.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          new Date(
            getSaleDate(
              b,
            ),
          ).getTime() -
          new Date(
            getSaleDate(
              a,
            ),
          ).getTime(),
      ),

    localOnly,
  }
}

/* ============================================================
 * MERGE EXPENSES
 * ============================================================ */

function mergeExpenses(
  localExpenses: any[],
  remoteExpenses: any[],
) {
  const map =
    new Map<
      string,
      any
    >()

  /*
   * Remote is preferred when available.
   */
  for (
    const expense of remoteExpenses
  ) {
    const id =
      String(
        expense.id ||
          '',
      )

    if (
      id
    ) {
      map.set(
        id,
        expense,
      )
    }
  }

  /*
   * Local fills anything remote does not have yet.
   */
  for (
    const expense of localExpenses
  ) {
    const id =
      String(
        expense.id ||
          '',
      )

    if (
      id &&
      !map.has(id)
    ) {
      map.set(
        id,
        expense,
      )
    }
  }

  return Array.from(
    map.values(),
  )
}

/* ============================================================
 * BUILD REPORT
 * ============================================================ */

function buildReport(
  sales: ReportSale[],
  expenses: any[],
  localData: any,
  options: DailyReportOptions,
): DailyReport {
  /* ==========================================================
   * PRODUCT NAMES
   * ========================================================== */

  const productNames =
    new Map<
      string,
      string
    >()

  for (
    const product of
      localData.products
  ) {
    productNames.set(
      String(
        product.id,
      ),
      product.name ||
        'Unknown Product',
    )
  }

  /* ==========================================================
   * CATEGORY NAMES
   * ========================================================== */

  const categoryNames =
    new Map<
      string,
      {
        name: string
        nameAm: string | null
      }
    >()

  for (
    const category of
      localData.categories
  ) {
    categoryNames.set(
      String(
        category.id,
      ),
      {
        name:
          category.name ||
          'General',

        nameAm:
          category.name_am ??
          null,
      },
    )
  }

  /* ==========================================================
   * FINANCIALS
   * ========================================================== */

  let revenue = 0
  let tips = 0
  let itemsSold = 0
  let grossProfit = 0

  const paymentTotals = {
    cash: 0,
    telebirr: 0,
    bank: 0,
    card: 0,
    other: 0,
  }

  const productsMap =
    new Map<
      string,
      ProductSummary
    >()

  const categoriesMap =
    new Map<
      string,
      CategorySummary
    >()

  /* ==========================================================
   * PROCESS SALES
   * ========================================================== */

  for (
    const sale of sales
  ) {
    /* --------------------------------------------------------
     * SALE TOTALS
     * -------------------------------------------------------- */

    revenue +=
      getSaleTotal(
        sale,
      )

    tips +=
      getSaleTip(
        sale,
      )

    /* --------------------------------------------------------
     * PAYMENTS
     * -------------------------------------------------------- */

    const payments =
      Array.isArray(
        sale.payments,
      )
        ? sale.payments
        : []

    if (
      payments.length > 0
    ) {
      for (
        const payment of payments
      ) {
        const method =
          normalizePaymentMethod(
            getPaymentMethod(
              payment,
            ),
          )

        paymentTotals[
          method
        ] +=
          toNumber(
            payment.amount,
          )
      }
    } else {
      /*
       * Some locally stored sales may not have
       * individual payment rows.
       */
      const method =
        normalizePaymentMethod(
          getSalePaymentMethod(
            sale,
          ),
        )

      paymentTotals[
        method
      ] +=
        getSaleTotal(
          sale,
        )
    }

    /* --------------------------------------------------------
     * SALE ITEMS
     * -------------------------------------------------------- */

    for (
      const item of
        getSaleItems(
          sale,
        )
    ) {
      const quantity =
        toNumber(
          item.quantity,
        )

      const itemRevenue =
        getItemRevenue(
          item,
        )

      const itemProfit =
        getItemGrossProfit(
          item,
        )

      itemsSold +=
        quantity

      grossProfit +=
        itemProfit

      /* ------------------------------------------------------
       * PRODUCT SUMMARY
       * ------------------------------------------------------ */

      const productId =
        String(
          item.product_id ||
            item.productId ||
            item.id ||
            'unknown',
        )

      const productName =
        item.product_name ||
        item.productName ||
        item.name ||
        productNames.get(
          productId,
        ) ||
        'Unknown Product'

      const existingProduct =
        productsMap.get(
          productId,
        )

      if (
        existingProduct
      ) {
        existingProduct.quantity +=
          quantity

        existingProduct.revenue +=
          itemRevenue

        existingProduct.grossProfit +=
          itemProfit
      } else {
        productsMap.set(
          productId,
          {
            id:
              productId,

            name:
              productName,

            quantity,

            revenue:
              itemRevenue,

            grossProfit:
              itemProfit,
          },
        )
      }

      /* ------------------------------------------------------
       * CATEGORY SUMMARY
       * ------------------------------------------------------ */

      const categoryId =
        String(
          item.category_id ||
            item.categoryId ||
            'general',
        )

      const category =
        categoryNames.get(
          categoryId,
        )

      const categoryName =
        category?.name ||
        'General'

      const existingCategory =
        categoriesMap.get(
          categoryId,
        )

      if (
        existingCategory
      ) {
        existingCategory.quantity +=
          quantity

        existingCategory.revenue +=
          itemRevenue

        existingCategory.grossProfit +=
          itemProfit
      } else {
        categoriesMap.set(
          categoryId,
          {
            id:
              categoryId,

            name:
              categoryName,

            nameAm:
              category?.nameAm ??
              null,

            quantity,

            revenue:
              itemRevenue,

            grossProfit:
              itemProfit,
          },
        )
      }
    }
  }

  /* ==========================================================
   * EXPENSES
   * ========================================================== */

  let expenseTotal = 0

  const expensesByCategory =
    new Map<
      string,
      number
    >()

  for (
    const expense of expenses
  ) {
    const amount =
      getExpenseAmount(
        expense,
      )

    expenseTotal +=
      amount

    const category =
      String(
        expense.category ||
          expense.expense_category ||
          'Other',
      ).trim() ||
      'Other'

    expensesByCategory.set(
      category,
      (
        expensesByCategory.get(
          category,
        ) || 0
      ) + amount,
    )
  }

  /* ==========================================================
   * PROFIT / FINANCIAL CALCULATIONS
   * ========================================================== */

  const totalReceived =
    revenue + tips

  const paymentTotal =
    Object.values(
      paymentTotals,
    ).reduce(
      (
        sum,
        value,
      ) =>
        sum + value,
      0,
    )

  const transactions =
    sales.length

  const averageSale =
    transactions > 0
      ? revenue /
        transactions
      : 0

  const netProfit =
    grossProfit -
    expenseTotal

  const grossMargin =
    revenue > 0
      ? (
          grossProfit /
          revenue
        ) * 100
      : 0

  const netMargin =
    revenue > 0
      ? (
          netProfit /
          revenue
        ) * 100
      : 0

  /* ==========================================================
   * INVENTORY
   * ========================================================== */

  const lowStock =
    localData.products
      .map(
        (
          product: any,
        ) => {
          const quantity =
            toNumber(
              product.stock_quantity ??
                product.quantity ??
                0,
            )

          const alertLevel =
            toNumber(
              product.low_stock_alert ??
                product.low_stock_threshold ??
                product.reorder_level ??
                0,
            )

          return {
            id:
              String(
                product.id,
              ),

            productId:
              String(
                product.id,
              ),

            name:
              product.name ||
              'Unknown Product',

            nameAm:
              product.name_am ??
              null,

            quantity,

            alertLevel,

            shortage:
              Math.max(
                alertLevel -
                  quantity,
                0,
              ),
          }
        },
      )
      .filter(
        (
          product: any,
        ) =>
          product.alertLevel >
            0 &&
          product.quantity <=
            product.alertLevel,
      )
      .sort(
        (
          a: any,
          b: any,
        ) =>
          a.quantity -
          b.quantity,
      )

  /* ==========================================================
   * ACTIVE PRODUCTS
   * ========================================================== */

  const activeProducts =
    localData.products.filter(
      (
        product: any,
      ) =>
        product.is_active !==
          false &&
        !product.deleted_at,
    )

  /* ==========================================================
   * CATEGORY COUNT
   * ========================================================== */

  const categoryIds =
    new Set<string>()

  for (
    const product of
      activeProducts
  ) {
    const categoryId =
      product.category_id

    if (
      categoryId
    ) {
      categoryIds.add(
        String(
          categoryId,
        ),
      )
    }
  }

  /* ==========================================================
   * TOTAL INVENTORY UNITS
   * ========================================================== */

  const totalInventoryUnits =
    localData.inventory.reduce(
      (
        total: number,
        row: any,
      ) =>
        total +
        toNumber(
          row.quantity,
        ),
      0,
    )

  /* ==========================================================
   * RETURN COMPLETE REPORT
   * ========================================================== */

  return {
    date:
      options.date
        ? new Date(
            options.date,
          )
            .toISOString()
            .slice(0, 10)
        : new Date()
            .toISOString()
            .slice(0, 10),

    /* --------------------------------------------------------
     * FINANCIAL SUMMARY
     * -------------------------------------------------------- */

    financials: {
      revenue,

      tips,

      totalReceived,

      transactions,

      itemsSold,

      averageSale,

      cash:
        paymentTotals.cash,

      telebirr:
        paymentTotals.telebirr,

      bank:
        paymentTotals.bank,

      card:
        paymentTotals.card,

      other:
        paymentTotals.other,

      paymentTotal,

      grossProfit,

      grossMargin,

      expenses:
        expenseTotal,

      netProfit,

      netMargin,
    },

    /* --------------------------------------------------------
     * EXPENSE SUMMARY
     * -------------------------------------------------------- */

    expenses: {
      total:
        expenseTotal,

      transactions:
        expenses.length,

      byCategory:
        Array.from(
          expensesByCategory.entries(),
        )
          .map(
            ([
              category,
              amount,
            ]) => ({
              category,
              amount,
            }),
          )
          .sort(
            (
              a,
              b,
            ) =>
              b.amount -
              a.amount,
          ),
    },

    /* --------------------------------------------------------
     * INVENTORY SUMMARY
     * -------------------------------------------------------- */

    inventory: {
      totalProducts:
        activeProducts.length,

      totalCategories:
        categoryIds.size,

      totalInventoryUnits,

      lowStockCount:
        lowStock.length,

      outOfStockCount:
        activeProducts.filter(
          (
            product: any,
          ) =>
            toNumber(
              product.stock_quantity ??
                product.quantity ??
                0,
            ) <= 0,
        ).length,

      lowStock,
    },

    /* --------------------------------------------------------
     * PRODUCT PERFORMANCE
     * -------------------------------------------------------- */

    products:
      Array.from(
        productsMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          b.revenue -
          a.revenue,
      ),

    /* --------------------------------------------------------
     * CATEGORY PERFORMANCE
     * -------------------------------------------------------- */

    categories:
      Array.from(
        categoriesMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          b.revenue -
          a.revenue,
      ),

    /* --------------------------------------------------------
     * PAYMENT BREAKDOWN
     * -------------------------------------------------------- */

    payments: [
      {
        method:
          'Cash',

        amount:
          paymentTotals.cash,
      },

      {
        method:
          'Telebirr',

        amount:
          paymentTotals.telebirr,
      },

      {
        method:
          'Bank Transfer',

        amount:
          paymentTotals.bank,
      },

      {
        method:
          'Card',

        amount:
          paymentTotals.card,
      },

      {
        method:
          'Other',

        amount:
          paymentTotals.other,
      },
    ].filter(
      (
        payment,
      ) =>
        payment.amount >
        0,
    ),

    /* --------------------------------------------------------
     * ACTUAL SALES
     *
     * IMPORTANT:
     * DailyReport.sales is ReportSale[].
     *
     * Do NOT put the sales financial summary here.
     * -------------------------------------------------------- */

    sales,

    /* --------------------------------------------------------
     * ACTIVE SHIFT
     * -------------------------------------------------------- */

    activeShift:
      localData.activeShift,

    /* --------------------------------------------------------
     * SYNC STATE
     * -------------------------------------------------------- */

    sync: {
      source:
        'local',

      remoteAvailable:
        false,

      localOnlySales:
        0,

      remoteSales:
        0,

      remoteExpenses:
        0,

      lastUpdated:
        new Date().toISOString(),
    },
  }
}

/* ============================================================
 * PUBLIC SERVICE
 * ============================================================ */

export async function getDailyReport(
  options: DailyReportOptions,
): Promise<DailyReport> {
  /* ----------------------------------------------------------
   * STEP 1
   *
   * LOCAL FIRST
   * ---------------------------------------------------------- */

  const localData =
    await loadLocalReportData(
      options.date,
    )

  /* ----------------------------------------------------------
   * STEP 2
   *
   * BUILD IMMEDIATELY FROM LOCAL DATA
   *
   * This guarantees that the report works offline.
   * ---------------------------------------------------------- */

  let report =
    buildReport(
      localData.sales,
      localData.expenses,
      localData,
      options,
    )

  /* ----------------------------------------------------------
   * STEP 3
   *
   * OPTIONAL REMOTE RECONCILIATION
   * ---------------------------------------------------------- */

  if (
    options.allowRemote !== false
  ) {
    const remoteData =
      await loadRemoteReportData(
        options,
      )

    if (
      remoteData.remoteAvailable
    ) {
      /* ------------------------------------------------------
       * MERGE SALES
       * ------------------------------------------------------ */

      const merged =
        mergeSales(
          localData.sales,
          remoteData.sales,
        )

      /* ------------------------------------------------------
       * MERGE EXPENSES
       * ------------------------------------------------------ */

      const expenses =
        mergeExpenses(
          localData.expenses,
          remoteData.expenses,
        )

      /* ------------------------------------------------------
       * REBUILD REPORT FROM MERGED DATA
       * ------------------------------------------------------ */

      report =
        buildReport(
          merged.sales,
          expenses,
          localData,
          options,
        )

      /* ------------------------------------------------------
       * UPDATE SYNC INFORMATION
       * ------------------------------------------------------ */

      report.sync = {
        source:
          merged.localOnly >
            0
            ? 'merged'
            : 'remote',

        remoteAvailable:
          true,

        localOnlySales:
          merged.localOnly,

        remoteSales:
          remoteData.sales.length,

        remoteExpenses:
          remoteData.expenses.length,

        lastUpdated:
          new Date().toISOString(),
      }
    }
  }

  return report
}


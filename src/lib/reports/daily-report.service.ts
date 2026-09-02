import type {
    DailyReport,
    DailyReportOptions,
    CategorySummary,
    ProductSummary,
    ReportSale,
} from './report.types'

import {
    getExpenseAmount,
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
    const map = new Map<string, ReportSale>()

    /*
     * Remote is preferred when available.
     */
    for (const sale of remoteSales) {
        const id = getSaleId(sale)

        if (id) {
            map.set(id, sale)
        }
    }

    /*
     * Local fills anything remote does not have yet.
     */
    let localOnly = 0

    for (const sale of localSales) {
        const id = getSaleId(sale)

        if (!id) {
            continue
        }

        if (!map.has(id)) {
            map.set(id, sale)
            localOnly++
        }
    }

    return {
        sales: Array.from(map.values()).sort(
            (a, b) =>
                new Date(getSaleDate(b)).getTime() -
                new Date(getSaleDate(a)).getTime(),
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
    const map = new Map<string, any>()

    /*
     * Remote is preferred.
     */
    for (const expense of remoteExpenses) {
        const id = String(expense.id || '')

        if (id) {
            map.set(id, expense)
        }
    }

    /*
     * Local fills anything remote does not have yet.
     */
    for (const expense of localExpenses) {
        const id = String(expense.id || '')

        if (id && !map.has(id)) {
            map.set(id, expense)
        }
    }

    return Array.from(map.values())
}

/* ============================================================
 * SALE ITEM PROFIT
 *
 * IMPORTANT:
 *
 * Do NOT blindly trust sale_items.gross_profit for reporting.
 *
 * The database already gives us:
 *   unit_price
 *   cost_price
 *   quantity
 *   total_amount
 *
 * Therefore:
 *
 *   revenue = actual line total
 *   cost    = cost_price × quantity
 *   profit  = revenue - cost
 *
 * Example:
 *   selling = 50
 *   cost    = 10
 *   qty     = 1
 *
 *   profit = 50 - 10 = 40
 * ============================================================ */

function getCalculatedItemProfit(item: any): number {
    const quantity = Math.max(
        toNumber(item?.quantity),
        0,
    )

    if (quantity <= 0) {
        return 0
    }

    /*
     * Prefer actual line revenue because it already represents
     * the final amount for the sold quantity and can include
     * discounts correctly.
     */
    let revenue = toNumber(
        item?.total_amount ??
        item?.total ??
        item?.line_total,
    )

    /*
     * If total_amount is unavailable, calculate it from
     * selling price × quantity.
     */
    if (revenue === 0) {
        const unitPrice = toNumber(
            item?.unit_price ??
            item?.unitPrice ??
            item?.price,
        )

        revenue = unitPrice * quantity
    }

    /*
     * cost_price is the authoritative cost for this sale item.
     */
    const costPrice = Math.max(
        toNumber(
            item?.cost_price ??
            item?.costPrice ??
            item?.unit_cost ??
            item?.unitCost,
        ),
        0,
    )

    const totalCost = costPrice * quantity

    return Math.max(
        revenue - totalCost,
        0,
    )
}

/* ============================================================
 * INVENTORY HELPERS
 * ============================================================ */

/**
 * Get the current inventory quantity for a product.
 *
 * Inventory is branch-specific, so the report must not use
 * product.stock_quantity when branch inventory is available.
 */
function getBranchInventoryQuantity(
    productId: string,
    inventory: any[],
    branchId?: string | null,
): number {
    const matchingRows = inventory.filter(
        (row: any) =>
            String(
                row.product_id ??
                row.productId ??
                '',
            ) === productId &&
            (
                !branchId ||
                String(
                    row.branch_id ??
                    row.branchId ??
                    '',
                ) === String(branchId)
            ),
    )

    if (matchingRows.length === 0) {
        return 0
    }

    /*
     * Normally there should be one inventory row per
     * product/branch.
     *
     * Summing is safer if the local database temporarily
     * contains more than one matching inventory record.
     */
    return matchingRows.reduce(
        (total: number, row: any) =>
            total +
            toNumber(row.quantity),
        0,
    )
}

/**
 * Get the configured low-stock/reorder level.
 */
function getProductAlertLevel(
    product: any,
): number {
    return Math.max(
        toNumber(
            product.low_stock_alert ??
            product.low_stock_threshold ??
            product.reorder_level ??
            0,
        ),
        0,
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
     * SAFE LOCAL DATA
     * ========================================================== */

    const products = Array.isArray(
        localData?.products,
    )
        ? localData.products
        : []

    const categories = Array.isArray(
        localData?.categories,
    )
        ? localData.categories
        : []

    const inventory = Array.isArray(
        localData?.inventory,
    )
        ? localData.inventory
        : []

    /* ==========================================================
     * PRODUCT NAMES
     * ========================================================== */

    const productNames = new Map<string, string>()

    for (const product of products) {
        productNames.set(
            String(product.id),
            product.name || 'Unknown Product',
        )
    }

    /* ==========================================================
     * CATEGORY NAMES
     * ========================================================== */

    const categoryNames = new Map<
        string,
        {
            name: string
            nameAm: string | null
        }
    >()

    for (const category of categories) {
        categoryNames.set(
            String(category.id),
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

    const productsMap = new Map<
        string,
        ProductSummary
    >()

    const categoriesMap = new Map<
        string,
        CategorySummary
    >()

    /* ==========================================================
     * PROCESS SALES
     * ========================================================== */

    for (const sale of sales) {
        /* --------------------------------------------------------
         * SALE TOTAL
         * -------------------------------------------------------- */

        const saleTotal = getSaleTotal(sale)

        revenue += saleTotal

        tips += getSaleTip(sale)

        /* --------------------------------------------------------
         * PAYMENTS
         * -------------------------------------------------------- */

        const payments = Array.isArray(
            sale.payments,
        )
            ? sale.payments
            : []

        if (payments.length > 0) {
            for (const payment of payments) {
                /*
                 * Only completed payment rows should contribute
                 * to received money.
                 */
                const method =
                    normalizePaymentMethod(
                        getPaymentMethod(payment),
                    )

                paymentTotals[method] +=
                    toNumber(payment.amount)
            }
        } else {
            /*
             * Local offline sales may not yet have payment rows.
             */
            const method =
                normalizePaymentMethod(
                    getSalePaymentMethod(sale),
                )

            paymentTotals[method] +=
                saleTotal
        }

        /* --------------------------------------------------------
         * SALE ITEMS
         * -------------------------------------------------------- */

        const saleItems = getSaleItems(sale)

        for (const item of saleItems) {
            const quantity = Math.max(
                toNumber(item.quantity),
                0,
            )

            if (quantity <= 0) {
                continue
            }

            /*
             * Revenue for the product.
             *
             * Keep the existing helper because your total revenue
             * is already correct.
             */
            const itemRevenue =
                getItemRevenue(item)

            /*
             * IMPORTANT:
             *
             * Calculate profit from:
             *
             *   total_amount - (cost_price × quantity)
             *
             * instead of trusting sale_items.gross_profit.
             */
            const itemProfit =
                getCalculatedItemProfit(item)

            itemsSold += quantity

            grossProfit += itemProfit

            /* ------------------------------------------------------
             * PRODUCT SUMMARY
             * ------------------------------------------------------ */

            const productId = String(
                item.product_id ??
                item.productId ??
                'unknown',
            )

            const productName =
                item.product_name ||
                item.productName ||
                item.name ||
                productNames.get(productId) ||
                'Unknown Product'

            const existingProduct =
                productsMap.get(productId)

            if (existingProduct) {
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
                        id: productId,
                        name: productName,
                        quantity,
                        revenue: itemRevenue,
                        grossProfit: itemProfit,
                    },
                )
            }

            /* ------------------------------------------------------
             * CATEGORY SUMMARY
             * ------------------------------------------------------ */

            const categoryId = String(
                item.category_id ??
                item.categoryId ??
                'general',
            )

            const category =
                categoryNames.get(categoryId)

            const categoryName =
                category?.name ||
                'General'

            const existingCategory =
                categoriesMap.get(categoryId)

            if (existingCategory) {
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
                        id: categoryId,

                        name: categoryName,

                        nameAm:
                            category?.nameAm ??
                            null,

                        quantity,

                        revenue: itemRevenue,

                        grossProfit: itemProfit,
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
        new Map<string, number>()

    for (const expense of expenses) {
        const amount =
            Math.max(
                getExpenseAmount(expense),
                0,
            )

        if (amount <= 0) {
            continue
        }

        expenseTotal += amount

        const category =
            String(
                expense.category ||
                expense.expense_category ||
                'Other',
            ).trim() || 'Other'

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

    /*
     * Customer received amount.
     *
     * Revenue is the sale value.
     * Tips are additional money received.
     */
    const totalReceived =
        revenue + tips

    const paymentTotal =
        Object.values(
            paymentTotals,
        ).reduce(
            (sum, value) =>
                sum + value,
            0,
        )

    const transactions =
        sales.length

    const averageSale =
        transactions > 0
            ? revenue / transactions
            : 0

    /*
     * Gross profit:
     *
     *   Sales revenue
     *   -
     *   Product cost
     */
    const calculatedGrossProfit =
        Math.max(
            grossProfit,
            0,
        )

    /*
     * Net profit:
     *
     *   Gross profit
     *   -
     *   Operating expenses
     */
    const netProfit =
        calculatedGrossProfit -
        expenseTotal

    const grossMargin =
        revenue > 0
            ? (
                calculatedGrossProfit /
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
     * ACTIVE PRODUCTS
     * ========================================================== */

    const activeProducts =
        products.filter(
            (product: any) =>
                product.is_active !== false &&
                !product.deleted_at,
        )

    /* ==========================================================
     * INVENTORY BY SELECTED BRANCH
     * ========================================================== */

    /*
     * IMPORTANT:
     *
     * Do not use:
     *
     *   product.stock_quantity
     *
     * as the primary source.
     *
     * The real stock is stored in inventory and is
     * branch-specific.
     */

    const lowStock = activeProducts
        .map(
            (product: any) => {
                const productId =
                    String(product.id)

                const inventoryQuantity =
                    getBranchInventoryQuantity(
                        productId,
                        inventory,
                        options.branchId,
                    )

                /*
                 * If a branch is selected, inventory is the
                 * source of truth.
                 *
                 * If no branch is selected and there is no
                 * matching inventory row, preserve the old
                 * product-level fallback.
                 */
                const hasInventoryRow =
                    inventory.some(
                        (row: any) =>
                            String(
                                row.product_id ??
                                row.productId ??
                                '',
                            ) === productId &&
                            (
                                !options.branchId ||
                                String(
                                    row.branch_id ??
                                    row.branchId ??
                                    '',
                                ) ===
                                String(
                                    options.branchId,
                                )
                            ),
                    )

                const quantity =
                    hasInventoryRow
                        ? inventoryQuantity
                        : toNumber(
                            product.stock_quantity ??
                            product.quantity ??
                            0,
                        )

                const alertLevel =
                    getProductAlertLevel(
                        product,
                    )

                return {
                    id: productId,

                    productId,

                    name:
                        product.name ||
                        'Unknown Product',

                    nameAm:
                        product.name_am ??
                        null,

                    quantity,

                    alertLevel,

                    shortage: Math.max(
                        alertLevel -
                        quantity,
                        0,
                    ),
                }
            },
        )
        .filter(
            (product: any) =>
                product.alertLevel > 0 &&
                product.quantity <=
                product.alertLevel,
        )
        .sort(
            (a: any, b: any) =>
                a.quantity -
                b.quantity,
        )

    /* ==========================================================
     * OUT OF STOCK
     * ========================================================== */

    const outOfStockCount =
        activeProducts.filter(
            (product: any) => {
                const productId =
                    String(product.id)

                const hasInventoryRow =
                    inventory.some(
                        (row: any) =>
                            String(
                                row.product_id ??
                                row.productId ??
                                '',
                            ) === productId &&
                            (
                                !options.branchId ||
                                String(
                                    row.branch_id ??
                                    row.branchId ??
                                    '',
                                ) ===
                                String(
                                    options.branchId,
                                )
                            ),
                    )

                const quantity =
                    hasInventoryRow
                        ? getBranchInventoryQuantity(
                            productId,
                            inventory,
                            options.branchId,
                        )
                        : toNumber(
                            product.stock_quantity ??
                            product.quantity ??
                            0,
                        )

                return quantity <= 0
            },
        ).length

    /* ==========================================================
     * CATEGORY COUNT
     * ========================================================== */

    const categoryIds =
        new Set<string>()

    for (const product of activeProducts) {
        if (product.category_id) {
            categoryIds.add(
                String(
                    product.category_id,
                ),
            )
        }
    }

    /* ==========================================================
     * TOTAL INVENTORY UNITS
     * ========================================================== */

    /*
     * Only count inventory belonging to the selected branch.
     *
     * This prevents Branch A + Branch B stock from being
     * incorrectly combined in a branch report.
     */
    const branchInventoryRows =
        options.branchId
            ? inventory.filter(
                (row: any) =>
                    String(
                        row.branch_id ??
                        row.branchId ??
                        '',
                    ) ===
                    String(
                        options.branchId,
                    ),
            )
            : inventory

    const totalInventoryUnits =
        branchInventoryRows.reduce(
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
        date: options.date
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

            grossProfit:
                calculatedGrossProfit,

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
                        (a, b) =>
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

            outOfStockCount,

            lowStock,
        },

        /* --------------------------------------------------------
         * PRODUCT PERFORMANCE
         * -------------------------------------------------------- */

        products:
            Array.from(
                productsMap.values(),
            ).sort(
                (a, b) =>
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
                (a, b) =>
                    b.revenue -
                    a.revenue,
            ),

        /* --------------------------------------------------------
         * PAYMENT BREAKDOWN
         * -------------------------------------------------------- */

        payments: [
            {
                method: 'Cash',
                amount:
                    paymentTotals.cash,
            },

            {
                method: 'Telebirr',
                amount:
                    paymentTotals.telebirr,
            },

            {
                method: 'Bank Transfer',
                amount:
                    paymentTotals.bank,
            },

            {
                method: 'Card',
                amount:
                    paymentTotals.card,
            },

            {
                method: 'Other',
                amount:
                    paymentTotals.other,
            },
        ].filter(
            (payment) =>
                payment.amount > 0,
        ),

        /* --------------------------------------------------------
         * ACTUAL SALES
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
            source: 'local',

            remoteAvailable:
                false,

            localOnlySales: 0,

            remoteSales: 0,

            remoteExpenses: 0,

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
     * LOCAL FIRST
     * ---------------------------------------------------------- */

    const localData =
        await loadLocalReportData(
            options.date,
        )

    console.log(
        '[DailyReport] LOCAL DATA:',
        {
            sales:
                localData.sales.length,

            expenses:
                localData.expenses.length,

            products:
                localData.products.length,

            categories:
                localData.categories.length,

            inventory:
                localData.inventory.length,

            activeShift:
                !!localData.activeShift,
        },
    )

    /* ----------------------------------------------------------
     * STEP 2
     * BUILD FROM LOCAL DATA
     * ---------------------------------------------------------- */

    let report =
        buildReport(
            localData.sales,
            localData.expenses,
            localData,
            options,
        )

    console.log(
        '[DailyReport] LOCAL REPORT:',
        {
            sales:
                report.sales.length,

            revenue:
                report.financials.revenue,

            grossProfit:
                report.financials.grossProfit,

            expenses:
                report.financials.expenses,

            netProfit:
                report.financials.netProfit,

            lowStock:
                report.inventory.lowStockCount,

            outOfStock:
                report.inventory.outOfStockCount,
        },
    )

    /* ----------------------------------------------------------
     * STEP 3
     * OPTIONAL REMOTE RECONCILIATION
     * ---------------------------------------------------------- */

    if (
        options.allowRemote !== false
    ) {
        const remoteData =
            await loadRemoteReportData(
                options,
            )

        console.log(
            '[DailyReport] REMOTE DATA:',
            {
                remoteAvailable:
                    remoteData.remoteAvailable,

                sales:
                    remoteData.sales.length,

                expenses:
                    remoteData.expenses.length,
            },
        )

        if (
            remoteData.remoteAvailable
        ) {
            const merged =
                mergeSales(
                    localData.sales,
                    remoteData.sales,
                )

            console.log(
                '[DailyReport] MERGED SALES:',
                {
                    count:
                        merged.sales.length,

                    localOnly:
                        merged.localOnly,
                },
            )

            const expenses =
                mergeExpenses(
                    localData.expenses,
                    remoteData.expenses,
                )

            /*
             * Rebuild the entire report from the final
             * deduplicated sales/expenses.
             *
             * Inventory still comes from localData because
             * that is the offline inventory snapshot already
             * maintained by the POS.
             */
            report =
                buildReport(
                    merged.sales,
                    expenses,
                    localData,
                    options,
                )

            report.sync = {
                source:
                    merged.localOnly > 0
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

            console.log(
                '[DailyReport] FINAL REPORT:',
                {
                    sales:
                        report.sales.length,

                    revenue:
                        report.financials.revenue,

                    grossProfit:
                        report.financials.grossProfit,

                    expenses:
                        report.financials.expenses,

                    netProfit:
                        report.financials.netProfit,

                    lowStock:
                        report.inventory.lowStockCount,

                    outOfStock:
                        report.inventory.outOfStockCount,
                },
            )
        }
    }

    return report
}
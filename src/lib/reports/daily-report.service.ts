import type {
    DailyReport,
    DailyReportOptions,
    CategorySummary,
    ProductSummary,
    ReportSale,
    ReportExpense,
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

import { loadLocalReportData } from './report.local'
import { loadRemoteReportData } from './report.remote'

/* ============================================================
 * TYPES
 * ============================================================ */

type InventoryRow = Record<string, unknown>
type ProductRow = Record<string, unknown>
type CategoryRow = Record<string, unknown>

/* ============================================================
 * SMALL SAFE HELPERS
 * ============================================================ */

function stringValue(value: unknown): string {
    return value == null ? '' : String(value)
}

function getProductId(row: InventoryRow): string {
    return stringValue(
        row.product_id ??
            row.productId,
    )
}

function getBranchId(row: InventoryRow): string {
    return stringValue(
        row.branch_id ??
            row.branchId,
    )
}

function getInventoryQuantity(
    row: InventoryRow,
): number {
    return toNumber(row.quantity)
}

/* ============================================================
 * MERGE SALES
 *
 * Remote data is authoritative when available.
 * Local data fills sales that have not reached the server yet.
 *
 * Deduplication is done by stable sale ID.
 * ============================================================ */

function mergeSales(
    localSales: ReportSale[],
    remoteSales: ReportSale[],
): {
    sales: ReportSale[]
    localOnly: number
} {
    const map = new Map<string, ReportSale>()

    for (const sale of remoteSales) {
        const id = getSaleId(sale)

        if (id) {
            map.set(id, sale)
        }
    }

    let localOnly = 0

    for (const sale of localSales) {
        const id = getSaleId(sale)

        if (!id || map.has(id)) {
            continue
        }

        map.set(id, sale)
        localOnly++
    }

    const sales = Array.from(map.values())

    sales.sort(
        (a, b) =>
            new Date(getSaleDate(b)).getTime() -
            new Date(getSaleDate(a)).getTime(),
    )

    return {
        sales,
        localOnly,
    }
}

/* ============================================================
 * MERGE EXPENSES
 * ============================================================ */

function mergeExpenses(
    localExpenses: ReportExpense[],
    remoteExpenses: ReportExpense[],
): ReportExpense[] {
    const map = new Map<string, ReportExpense>()

    for (const expense of remoteExpenses) {
        const id = String(expense.id ?? '')

        if (id) {
            map.set(id, expense)
        }
    }

    for (const expense of localExpenses) {
        const id = String(expense.id ?? '')

        if (id && !map.has(id)) {
            map.set(id, expense)
        }
    }

    return Array.from(map.values())
}

/* ============================================================
 * INVENTORY INDEX
 *
 * Building indexes once makes inventory calculations O(n)
 * instead of repeatedly scanning the entire inventory array.
 * ============================================================ */

function buildInventoryIndex(
    inventory: InventoryRow[],
    branchId?: string | null,
): Map<string, number> {
    const index = new Map<string, number>()

    const selectedBranch =
        branchId
            ? String(branchId)
            : null

    for (const row of inventory) {
        const productId = getProductId(row)

        if (!productId) {
            continue
        }

        if (
            selectedBranch &&
            getBranchId(row) !== selectedBranch
        ) {
            continue
        }

        const quantity =
            getInventoryQuantity(row)

        index.set(
            productId,
            (index.get(productId) ?? 0) +
                quantity,
        )
    }

    return index
}

/* ============================================================
 * INVENTORY HELPERS
 * ============================================================ */

function getProductAlertLevel(
    product: ProductRow,
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
    expenses: ReportExpense[],
    localData: any,
    options: DailyReportOptions,
): DailyReport {
    /* ----------------------------------------------------------
     * SAFE DATA
     * ---------------------------------------------------------- */

    const products: ProductRow[] =
        Array.isArray(localData?.products)
            ? localData.products
            : []

    const categories: CategoryRow[] =
        Array.isArray(localData?.categories)
            ? localData.categories
            : []

    const inventory: InventoryRow[] =
        Array.isArray(localData?.inventory)
            ? localData.inventory
            : []

    /* ----------------------------------------------------------
     * PRODUCT INDEX
     * ---------------------------------------------------------- */

    const productNames =
        new Map<string, string>()

    for (const product of products) {
        const id = stringValue(product.id)

        if (!id) {
            continue
        }

        productNames.set(
            id,
            stringValue(product.name) ||
                'Unknown Product',
        )
    }

    /* ----------------------------------------------------------
     * CATEGORY INDEX
     * ---------------------------------------------------------- */

    const categoryNames =
        new Map<
            string,
            {
                name: string
                nameAm: string | null
            }
        >()

    for (const category of categories) {
        const id = stringValue(category.id)

        if (!id) {
            continue
        }

        categoryNames.set(id, {
            name:
                stringValue(category.name) ||
                'General',

            nameAm:
                category.name_am == null
                    ? null
                    : String(
                        category.name_am,
                    ),
        })
    }

    /* ----------------------------------------------------------
     * INVENTORY INDEX
     * ---------------------------------------------------------- */

    const inventoryIndex =
        buildInventoryIndex(
            inventory,
            options.branchId,
        )

    /* ----------------------------------------------------------
     * FINANCIAL STATE
     * ---------------------------------------------------------- */

    let revenue = 0
    let tips = 0
    let itemsSold = 0
    let grossProfit = 0
    let expenseTotal = 0

    const paymentTotals = {
        cash: 0,
        telebirr: 0,
        bank: 0,
        card: 0,
        other: 0,
    }

    const productsMap =
        new Map<string, ProductSummary>()

    const categoriesMap =
        new Map<string, CategorySummary>()

    /* ==========================================================
     * SALES
     * ========================================================== */

    for (const sale of sales) {
        const saleTotal =
            Math.max(
                getSaleTotal(sale),
                0,
            )

        revenue += saleTotal

        tips += Math.max(
            getSaleTip(sale),
            0,
        )

        /* ------------------------------------------------------
         * PAYMENTS
         * ------------------------------------------------------ */

        const payments =
            Array.isArray(sale.payments)
                ? sale.payments
                : []

        if (payments.length > 0) {
            for (const payment of payments) {
                const amount =
                    Math.max(
                        toNumber(
                            payment.amount,
                        ),
                        0,
                    )

                if (amount <= 0) {
                    continue
                }

                const method =
                    normalizePaymentMethod(
                        getPaymentMethod(
                            payment,
                        ),
                    )

                paymentTotals[method] +=
                    amount
            }
        } else {
            /*
             * Offline/local sales can temporarily exist
             * without separate payment rows.
             */
            const method =
                normalizePaymentMethod(
                    getSalePaymentMethod(
                        sale,
                    ),
                )

            paymentTotals[method] +=
                saleTotal
        }

        /* ------------------------------------------------------
         * SALE ITEMS
         * ------------------------------------------------------ */

        const saleItems =
            getSaleItems(sale)

        for (const item of saleItems) {
            const quantity =
                Math.max(
                    toNumber(
                        item.quantity,
                    ),
                    0,
                )

            if (quantity <= 0) {
                continue
            }

            const itemRevenue =
                Math.max(
                    getItemRevenue(item),
                    0,
                )

            /*
             * IMPORTANT:
             *
             * Historical profit must use the value stored
             * on sale_items.gross_profit.
             *
             * This is the cost snapshot captured when the
             * sale occurred.
             *
             * Do NOT use today's inventory cost here.
             */
            const itemProfit =
                getItemGrossProfit(item)

            itemsSold += quantity
            grossProfit += itemProfit

            /* --------------------------------------------------
             * PRODUCT
             * -------------------------------------------------- */

            const productId =
                stringValue(
                    item.product_id ??
                        item.productId,
                ) || 'unknown'

            const productName =
                stringValue(
                    item.product_name ??
                        item.productName ??
                        item.name,
                ) ||
                productNames.get(
                    productId,
                ) ||
                'Unknown Product'

            const existingProduct =
                productsMap.get(
                    productId,
                )

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
                        grossProfit:
                            itemProfit,
                    },
                )
            }

            /* --------------------------------------------------
             * CATEGORY
             * -------------------------------------------------- */

            const categoryId =
                stringValue(
                    item.category_id ??
                        item.categoryId,
                ) || 'general'

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

    const expensesByCategory =
        new Map<string, number>()

    for (const expense of expenses) {
        const amount =
            Math.max(
                getExpenseAmount(
                    expense,
                ),
                0,
            )

        if (amount <= 0) {
            continue
        }

        expenseTotal += amount

        const category =
            stringValue(
                expense.category ??
                    expense.expense_category,
            ).trim() || 'Other'

        expensesByCategory.set(
            category,
            (expensesByCategory.get(
                category,
            ) ?? 0) + amount,
        )
    }

    /* ==========================================================
     * FINANCIAL CALCULATIONS
     * ========================================================== */

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
     * Do not clamp gross profit to zero.
     *
     * If a historical sale was genuinely sold below cost,
     * the report must show the loss.
     */
    const calculatedGrossProfit =
        grossProfit

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
            (product) =>
                product.is_active !== false &&
                !product.deleted_at,
        )

    /* ==========================================================
     * INVENTORY
     * ========================================================== */

    const lowStock: Array<{
        id: string
        productId: string
        name: string
        nameAm: string | null
        quantity: number
        alertLevel: number
        shortage: number
    }> = []

    let outOfStockCount = 0

    const categoryIds =
        new Set<string>()

    for (const product of activeProducts) {
        const productId =
            stringValue(product.id)

        if (!productId) {
            continue
        }

        if (product.category_id) {
            categoryIds.add(
                String(
                    product.category_id,
                ),
            )
        }

        /*
         * Inventory is branch-specific.
         *
         * If a matching inventory row exists, it is
         * authoritative.
         *
         * Otherwise preserve the product-level fallback.
         */
        const hasInventory =
            inventoryIndex.has(
                productId,
            )

        const quantity =
            hasInventory
                ? inventoryIndex.get(
                    productId,
                ) ?? 0
                : toNumber(
                    product.stock_quantity ??
                        product.quantity ??
                        0,
                )

        if (quantity <= 0) {
            outOfStockCount++
        }

        const alertLevel =
            getProductAlertLevel(
                product,
            )

        if (
            alertLevel > 0 &&
            quantity <= alertLevel
        ) {
            lowStock.push({
                id: productId,
                productId,
                name:
                    stringValue(
                        product.name,
                    ) ||
                    'Unknown Product',
                nameAm:
                    product.name_am == null
                        ? null
                        : String(
                            product.name_am,
                        ),
                quantity,
                alertLevel,
                shortage: Math.max(
                    alertLevel -
                        quantity,
                    0,
                ),
            })
        }
    }

    lowStock.sort(
        (a, b) =>
            a.quantity -
            b.quantity,
    )

    /* ==========================================================
     * TOTAL INVENTORY UNITS
     * ========================================================== */

    let totalInventoryUnits = 0

    for (const quantity of inventoryIndex.values()) {
        totalInventoryUnits += quantity
    }

    /* ==========================================================
     * RETURN REPORT
     * ========================================================== */

    const reportDate =
        options.date
            ? new Date(
                options.date,
            )
                .toISOString()
                .slice(0, 10)
            : new Date()
                .toISOString()
                .slice(0, 10)

    return {
        date: reportDate,

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

        products:
            Array.from(
                productsMap.values(),
            ).sort(
                (a, b) =>
                    b.revenue -
                    a.revenue,
            ),

        categories:
            Array.from(
                categoriesMap.values(),
            ).sort(
                (a, b) =>
                    b.revenue -
                    a.revenue,
            ),

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

        sales,

        activeShift:
            localData.activeShift,

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
     * LOCAL FIRST
     * ---------------------------------------------------------- */

    const localData =
        await loadLocalReportData(
            options.date,
        )

    let report =
        buildReport(
            localData.sales,
            localData.expenses,
            localData,
            options,
        )

    /* ----------------------------------------------------------
     * REMOTE RECONCILIATION
     *
     * Local report is already available, so a remote failure
     * must never make the report fail.
     * ---------------------------------------------------------- */

    if (
        options.allowRemote !== false
    ) {
        try {
            const remoteData =
                await loadRemoteReportData(
                    options,
                )

            if (
                remoteData.remoteAvailable
            ) {
                const merged =
                    mergeSales(
                        localData.sales,
                        remoteData.sales,
                    )

                const expenses =
                    mergeExpenses(
                        localData.expenses,
                        remoteData.expenses,
                    )

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
            }
        } catch {
            /*
             * Local-first resilience:
             *
             * Remote reporting is an enhancement,
             * not a dependency.
             *
             * The already-built local report is returned.
             */
        }
    }

    return report
}
// src/lib/offline/saleService.ts

import { getDB } from './db'
import { isLegacyContextValue } from './shiftContext'
import { toLocalHistoricalSale } from './saleHistory'
import type { LocalOpenTab, PaymentMethod, PaymentSplit } from '@/types/models/pos-cart'

export interface FinalizeSaleInput {
  splitPayments: PaymentSplit

  manualTip: string

  activeShift?: {
    real_database_id?: string | null
    report_id?: string | null
    branch_id?: string | null
    cashier_id?: string | null
    business_id?: string | null
  } | null

  selectedTable?: {
    id: string
    name: string
  } | null

  cart: Array<{
    id: string
    name: string
    price: number
    quantity: number
    price_proof?: string
  }>

  totalBill: number
}

/* =========================================================
 * INVENTORY WARNING
 * ========================================================= */

export interface InventoryWarning {
  productId: string
  message: string
  currentQuantity?: number | null
  requestedQuantity?: number
  resultingQuantity?: number | null
  type:
    | 'not_tracked'
    | 'negative_stock'
    | 'insufficient_stock'
}

/* =========================================================
 * FINALIZE SALE
 * ========================================================= */

export async function finalizeSale(
  input: FinalizeSaleInput,
) {
  const db = await getDB()

  if (!input.cart.length) {
    throw new Error(
      'Cannot finalize an empty cart.',
    )
  }

  const localId =
    crypto.randomUUID()

  const parsedTip =
    Number(input.manualTip) || 0

  const subtotal =
    Number(input.totalBill) || 0

  const safeBusinessId =
    input.activeShift?.business_id && !isLegacyContextValue(input.activeShift.business_id)
      ? input.activeShift.business_id
      : null

  const safeBranchId =
    input.activeShift?.branch_id && !isLegacyContextValue(input.activeShift.branch_id)
      ? input.activeShift.branch_id
      : null

  const safeCashierId =
    input.activeShift?.cashier_id && !isLegacyContextValue(input.activeShift.cashier_id)
      ? input.activeShift.cashier_id
      : null

  if (!safeBusinessId || !safeBranchId || !safeCashierId) {
    throw new Error('Missing a valid active-shift context for this sale.')
  }

  const totalAmount =
    subtotal + parsedTip

  /* =======================================================
   * INVENTORY WARNINGS
   *
   * These are non-fatal warnings.
   *
   * A missing inventory record, zero stock, or negative
   * stock does NOT prevent the sale from being completed.
   * ======================================================= */

  const inventoryWarnings:
    InventoryWarning[] = []

  /* =======================================================
   * 1. BUILD LOCAL SALE
   * ======================================================= */

  const pendingSale = {
    localId,

    createdAt:
      new Date().toISOString(),

    retryCount: 0,

    syncStatus:
      'pending' as const,

    offline_id:
      localId,

    receipt_number:
      `REC-${Date.now()
        .toString()
        .substring(6)}`,

    shift_id:
      input.activeShift
        ?.real_database_id ??
      input.activeShift?.report_id ??
      null,

    branch_id:
      safeBranchId,

    cashier_id:
      safeCashierId,

    business_id:
      safeBusinessId,

    table_number:
      input.selectedTable?.name ??
      'Walk-in',

    table_id:
      input.selectedTable?.id ??
      null,

    table_name:
      input.selectedTable?.name ??
      null,

    customer_name: null,

    customer_phone: null,

    notes: null,

    device_id: null,

    total_amount:
      totalAmount,

    subtotal,

    tip_amount:
      parsedTip,

    discount_amount:
      0,

    tax_amount:
      0,

    status:
      'completed' as const,

    payment_status:
      'paid' as const,

    items:
      input.cart.map(
        (item) => ({
          product_id:
            item.id,

          product_name:
            item.name,

          quantity:
            Number(item.quantity),

          discount: 0,

          unit_price:
            Number(item.price),

          price_proof:
            item.price_proof,

          /*
           * Keep the existing fallback until
           * real product cost is available locally.
           */
          cost_price:
            Number(item.price) *
            0.7,

          total_price:
            Number(item.price) *
            Number(item.quantity),
        }),
      ),

    payments: (Object.entries(input.splitPayments) as [PaymentMethod, number][])
      .filter(([, amount]) => Number(amount) > 0)
      .map(([method, amount]) => ({
        id: crypto.randomUUID(),
        method,
        amount: Number(amount),
        reference_no: null,
        status: method === 'credit' ? 'pending' as const : 'completed' as const,
      })),
  }

  /* =======================================================
   * 2. COMBINE QUANTITIES BY PRODUCT
   *
   * Example:
   *
   * Coffee x2
   * Coffee x3
   *
   * becomes:
   *
   * Coffee x5
   * ======================================================= */

  const quantityByProduct =
    new Map<string, number>()

  for (
    const item of input.cart
  ) {
    const productId =
      String(item.id).trim()

    const quantity =
      Number(item.quantity)

    if (!productId) {
      throw new Error(
        'Sale contains a product without an ID.',
      )
    }

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for product ${productId}.`,
      )
    }

    quantityByProduct.set(
      productId,
      (
        quantityByProduct.get(
          productId,
        ) ?? 0
      ) + quantity,
    )
  }

  /* =======================================================
   * 3. INDEXEDDB TRANSACTION
   *
   * Sale + inventory + open tab are committed together.
   * ======================================================= */

  const hasOpenTabs =
    Boolean(input.selectedTable) &&
    db.objectStoreNames.contains(
      'open_tabs',
    )

  const hasPendingTableOrders =
    Boolean(input.selectedTable) &&
    db.objectStoreNames.contains('pending_table_orders')

  let completedTableBaseItems: LocalOpenTab['items'] = []

  if (input.selectedTable && hasPendingTableOrders) {
    const [tabs, tableOrderEvents] = await Promise.all([
      hasOpenTabs ? db.getAll('open_tabs') : Promise.resolve([]),
      db.getAll('pending_table_orders'),
    ])
    const savedTab = tabs.find((tab: { id: string }) => tab.id === input.selectedTable!.id)
    const tableEvents = tableOrderEvents
      .filter((event: { tableId: string }) => event.tableId === input.selectedTable!.id)
      .sort((first: { createdAt: string }, second: { createdAt: string }) => first.createdAt.localeCompare(second.createdAt))
    const firstPendingSave = tableEvents.find((event: { operation: string }) => event.operation === 'save')
    completedTableBaseItems = firstPendingSave?.baseItems ?? savedTab?.items ?? []
  }

  const stores:
    | [
        'pending_sales',
        'inventory',
        'completed_sales_history',
      ]
    | [
        'pending_sales',
        'inventory',
        'open_tabs',
        'completed_sales_history',
      ]
    | [
        'pending_sales',
        'inventory',
        'pending_table_orders',
        'completed_sales_history',
      ]
    | [
        'pending_sales',
        'inventory',
        'open_tabs',
        'pending_table_orders',
        'completed_sales_history',
      ] =
    hasOpenTabs
      ? hasPendingTableOrders
        ? ['pending_sales', 'inventory', 'open_tabs', 'pending_table_orders', 'completed_sales_history']
        : ['pending_sales', 'inventory', 'open_tabs', 'completed_sales_history']
      : hasPendingTableOrders
        ? ['pending_sales', 'inventory', 'pending_table_orders', 'completed_sales_history']
      : [
          'pending_sales',
          'inventory',
          'completed_sales_history',
        ]

  const tx =
    db.transaction(
      stores,
      'readwrite',
    )
  const inventoryStore = tx.objectStore('inventory')
  const inventoryIndex = inventoryStore.index('by-product')

  /* =======================================================
   * 4. SAVE SALE
   * ======================================================= */

  await tx
    .objectStore(
      'pending_sales',
    )
    .put(
      pendingSale as never,
    )

  await tx.objectStore('completed_sales_history').put(
    toLocalHistoricalSale(pendingSale as never) as never,
  )
  for (
    const [
      productId,
      quantityToDeduct,
    ] of quantityByProduct
  ) {
    const inventoryRecords =
      await inventoryIndex.getAll(
        productId,
      )

    /* =====================================================
     * NO INVENTORY RECORD
     *
     * Product still sells.
     * Nothing can be deducted locally.
     * ===================================================== */

    if (
      !inventoryRecords.length
    ) {
      inventoryWarnings.push({
        productId,

        message:
          `No local inventory found for product ${productId}. Local stock was not deducted.`,

        currentQuantity:
          null,

        requestedQuantity:
          quantityToDeduct,

        resultingQuantity:
          null,

        type:
          'not_tracked',
      })

      continue
    }

    /* =====================================================
     * ACTIVE CONTEXT
     * ===================================================== */

    const activeBusinessId =
      normalizeId(
        input.activeShift
          ?.business_id,
      )

    const activeBranchId =
      normalizeId(
        input.activeShift
          ?.branch_id,
      )

    let inventory:
      | (typeof inventoryRecords)[number]
      | undefined

    /* =====================================================
     * BUSINESS + BRANCH
     * ===================================================== */

    if (
      activeBusinessId &&
      activeBranchId
    ) {
      inventory =
        inventoryRecords.find(
          (record) =>
            normalizeId(
              record.business_id,
            ) ===
              activeBusinessId &&
            normalizeId(
              record.branch_id,
            ) ===
              activeBranchId,
        )
    }

    /* =====================================================
     * BRANCH ONLY
     * ===================================================== */

    if (
      !inventory &&
      activeBranchId
    ) {
      const branchMatches =
        inventoryRecords.filter(
          (record) =>
            normalizeId(
              record.branch_id,
            ) ===
            activeBranchId,
        )

      if (
        branchMatches.length ===
        1
      ) {
        inventory =
          branchMatches[0]
      }

      if (
        branchMatches.length >
        1
      ) {
        throw new Error(
          `Multiple inventory records found for product ${productId} in branch ${activeBranchId}.`,
        )
      }
    }

    /* =====================================================
     * BUSINESS ONLY
     * ===================================================== */

    if (
      !inventory &&
      activeBusinessId
    ) {
      const businessMatches =
        inventoryRecords.filter(
          (record) =>
            normalizeId(
              record.business_id,
            ) ===
            activeBusinessId,
        )

      if (
        businessMatches.length ===
        1
      ) {
        inventory =
          businessMatches[0]
      }

      if (
        businessMatches.length >
        1
      ) {
        throw new Error(
          `Multiple inventory records found for product ${productId} in business ${activeBusinessId}.`,
        )
      }
    }

    /* =====================================================
     * SINGLE SAFE FALLBACK
     * ===================================================== */

    if (
      !inventory &&
      inventoryRecords.length ===
        1
    ) {
      inventory =
        inventoryRecords[0]
    }

    /* =====================================================
     * AMBIGUOUS INVENTORY
     *
     * We refuse to modify an unknown record.
     * ===================================================== */

    if (!inventory) {
      throw new Error(
        `Unable to determine the correct inventory record for product ${productId}.`,
      )
    }

    /* =====================================================
     * CURRENT QUANTITY
     * ===================================================== */

    const currentQuantity =
      Number(
        inventory.quantity,
      )

    if (
      !Number.isFinite(
        currentQuantity,
      )
    ) {
      throw new Error(
        `Invalid local inventory quantity for product ${productId}.`,
      )
    }

    /* =====================================================
     * CALCULATE NEW QUANTITY
     *
     * IMPORTANT:
     *
     * Negative inventory is allowed.
     *
     * We do NOT block the sale when:
     *
     *   currentQuantity - quantityToDeduct < 0
     *
     * Example:
     *
     *   Current = 1
     *   Sale    = 2
     *   Result  = -1
     *
     * The sale succeeds and inventory becomes -1.
     * ===================================================== */

    const newQuantity =
      currentQuantity -
      quantityToDeduct

    /* =====================================================
     * NEGATIVE STOCK WARNING
     * ===================================================== */

    if (
      currentQuantity < 0
    ) {
      inventoryWarnings.push({
        productId,

        message:
          `Local inventory for product ${productId} is already negative (${currentQuantity}). Stock will become ${newQuantity}.`,

        currentQuantity,

        requestedQuantity:
          quantityToDeduct,

        resultingQuantity:
          newQuantity,

        type:
          'negative_stock',
      })
    } else if (
      newQuantity < 0
    ) {
      inventoryWarnings.push({
        productId,

        message:
          `Sale exceeds local stock for product ${productId}. Available: ${currentQuantity}, requested: ${quantityToDeduct}. Stock will become ${newQuantity}.`,

        currentQuantity,

        requestedQuantity:
          quantityToDeduct,

        resultingQuantity:
          newQuantity,

        type:
          'insufficient_stock',
      })
    }

    /* =====================================================
     * UPDATE INVENTORY
     *
     * Negative values are intentionally allowed.
     * ===================================================== */

    inventory.quantity =
      newQuantity

    inventory.updated_at =
      new Date().toISOString()

    await inventoryStore.put(
      inventory,
    )
  }

  /* =======================================================
   * 6. CLOSE TABLE TAB
   * ======================================================= */

  if (
    input.selectedTable &&
    db.objectStoreNames.contains(
      'open_tabs',
    )
  ) {
    await tx
      .objectStore(
        'open_tabs',
      )
      .delete(
        input.selectedTable.id,
      )
  }

  if (input.selectedTable && hasPendingTableOrders) {
    const tableOrderStore = tx.objectStore('pending_table_orders')
    const pendingForTable = await tableOrderStore.index('by-table').getAll(input.selectedTable.id)
    for (const orderEvent of pendingForTable) {
      if (orderEvent.operation === 'save') {
        await tableOrderStore.delete(orderEvent.localId)
      }
    }

    await tableOrderStore.put({
      localId: crypto.randomUUID(),
      tableId: input.selectedTable.id,
      tableNumber: input.selectedTable.name,
      businessId: safeBusinessId,
      branchId: safeBranchId,
      cashierId: safeCashierId,
      operation: 'complete',
      baseItems: completedTableBaseItems,
      items: input.cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        price_proof: item.price_proof,
      })),
      totalAmount: 0,
      saleId: localId,
      createdAt: pendingSale.createdAt,
      attempts: 0,
    })
  }

  /* =======================================================
   * 7. COMMIT
   * ======================================================= */

  await tx.done

  /* =======================================================
   * 8. RETURN SALE
   * ======================================================= */

  return {
    ...pendingSale,

    inventoryWarnings,
  }
}

/* =========================================================
 * NORMALIZE IDS
 * ========================================================= */

function normalizeId(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const normalized =
    String(value).trim()

  return normalized || null
}

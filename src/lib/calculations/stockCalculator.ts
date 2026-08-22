// src/lib/calculator/stockCalculator.ts

import { IDBPDatabase } from 'idb'
import type { InventoryProduct } from '@/types/inventory'

type LiveStock = {
  systemCount: number
  hasPendingTransactions: boolean
}

/**
 * Calculates the stock currently visible on the device.
 *
 * Rules:
 * 1. Start from the locally cached opening/server stock.
 * 2. Apply pending sales that have NOT been synchronized.
 * 3. If a physical inventory count exists, that count becomes
 *    the latest physical baseline.
 *
 * IMPORTANT:
 * A physical count is an absolute quantity, not a movement.
 * Therefore we do NOT deduct pending sales again after applying it.
 */
export async function computeLiveLocalStock(
  db: IDBPDatabase<any>,
  cachedProducts: InventoryProduct[]
): Promise<Record<string, LiveStock>> {

  const stockMap: Record<string, LiveStock> = {}

  // ============================================================
  // 1. INITIAL BASELINE
  // ============================================================

  for (const product of cachedProducts) {
    stockMap[product.id] = {
      systemCount: Number(product.opening_count) || 0,
      hasPendingTransactions: false,
    }
  }

  try {

    // ============================================================
    // 2. APPLY UNSYNCED SALES
    // ============================================================

    if (db.objectStoreNames.contains('pending_sales')) {

      const salesStore = db
        .transaction('pending_sales', 'readonly')
        .objectStore('pending_sales')

      const localSales = await salesStore.getAll()

      for (const sale of localSales) {

        // Ignore cancelled sales
        if (
          sale.status === 'cancelled' ||
          sale.payload?.status === 'cancelled'
        ) {
          continue
        }

        /*
         * IMPORTANT:
         *
         * Your current pending_sales records use:
         *
         * sale.payload.items
         *
         * so keep this structure.
         */
        const items = sale.payload?.items

        if (!Array.isArray(items)) {
          continue
        }

        for (const item of items) {

          const productId = item.product_id
          const quantity = Number(item.quantity || 0)

          if (
            !productId ||
            !stockMap[productId] ||
            quantity <= 0
          ) {
            continue
          }

          stockMap[productId].systemCount -= quantity
          stockMap[productId].hasPendingTransactions = true
        }
      }
    }

    // ============================================================
    // 3. APPLY PHYSICAL INVENTORY COUNTS
    // ============================================================
    //
    // A reconciliation is an ABSOLUTE stock value.
    //
    // Example:
    //
    // Opening stock = 100
    // Sale = 5
    //
    // Current calculated stock = 95
    //
    // User physically counts = 92
    //
    // The new stock is 92.
    //
    // We DO NOT do:
    //
    // 92 - 5 = 87  ❌
    //
    // because the physical count already represents the actual
    // quantity after those sales.
    //
    // ============================================================

    if (
      db.objectStoreNames.contains(
        'pending_stock_reconciliations'
      )
    ) {

      const reconStore = db
        .transaction(
          'pending_stock_reconciliations',
          'readonly'
        )
        .objectStore(
          'pending_stock_reconciliations'
        )

      const localCounts = await reconStore.getAll()

      if (Array.isArray(localCounts) && localCounts.length > 0) {

        /*
         * Group by product and use ONLY the latest physical count.
         */
        const latestCounts = new Map<string, any>()

        for (const count of localCounts) {

          if (!count.product_id) {
            continue
          }

          const existing =
            latestCounts.get(count.product_id)

          if (
            !existing ||
            new Date(count.createdAt).getTime() >
              new Date(existing.createdAt).getTime()
          ) {
            latestCounts.set(
              count.product_id,
              count
            )
          }
        }

        /*
         * Latest physical count becomes the final local stock.
         */
        for (const [
          productId,
          count
        ] of latestCounts.entries()) {

          if (!stockMap[productId]) {
            continue
          }

          const countedQuantity =
            Math.max(
              0,
              Number(count.counted_quantity) || 0
            )

          stockMap[productId].systemCount =
            countedQuantity

          stockMap[productId].hasPendingTransactions =
            true
        }
      }
    }

  } catch (error) {

    console.error(
      '[STOCK_CALCULATOR_CRASH]',
      error
    )
  }

  // ============================================================
  // 4. NEVER DISPLAY NEGATIVE STOCK
  // ============================================================

  for (const productId of Object.keys(stockMap)) {

    stockMap[productId].systemCount =
      Math.max(
        0,
        stockMap[productId].systemCount
      )
  }

  return stockMap
}
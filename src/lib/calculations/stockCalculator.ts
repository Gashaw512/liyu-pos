// src/lib/calculator/stockCalculator.ts

import { IDBPDatabase } from 'idb';
import type { InventoryProduct } from '@/types/inventory';

/**
 * Computes an ultra-accurate local stock count by evaluating cached data 
 * against un-synced queue logs inside IndexedDB.
 * * 💡 Using <any> here gracefully accepts your LiyuPOSDBSchema type assignment 
 * without requiring tight circular dependency imports across files.
 */
export async function computeLiveLocalStock(
  db: IDBPDatabase<any>, 
  cachedProducts: InventoryProduct[]
): Promise<Record<string, { systemCount: number; hasPendingTransactions: boolean }>> {
  
  const stockMap: Record<string, { systemCount: number; hasPendingTransactions: boolean }> = {};
  
  // Initialize with raw database configurations safely
  cachedProducts.forEach(p => {
    stockMap[p.id] = { systemCount: p.opening_count, hasPendingTransactions: false };
  });

  try {
    // 1. Deduct units from un-synced local customer sales orders
    if (db.objectStoreNames.contains('pending_sales')) {
      const salesStore = db.transaction('pending_sales', 'readonly').objectStore('pending_sales');
      const localSales = await salesStore.getAll();

      for (const sale of localSales) {
        // Skip explicitly cancelled entries
        if (sale.payload?.status === 'cancelled') continue;
        
        if (Array.isArray(sale.payload?.items)) {
          for (const item of sale.payload.items) {
            if (stockMap[item.product_id]) {
              stockMap[item.product_id].systemCount -= Number(item.quantity || 0);
              stockMap[item.product_id].hasPendingTransactions = true;
            }
          }
        }
      }
    }

    // 2. Adjust baselines based on previous un-synced counting sheets saved on this device
    if (db.objectStoreNames.contains('pending_stock_reconciliations')) {
      const reconStore = db.transaction('pending_stock_reconciliations', 'readonly').objectStore('pending_stock_reconciliations');
      const localCounts = await reconStore.getAll();

      // Sort by timestamp so the latest local physical adjustment overrides older baselines
      if (Array.isArray(localCounts)) {
        localCounts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        for (const count of localCounts) {
          if (stockMap[count.product_id]) {
            stockMap[count.product_id].systemCount = count.counted_quantity;
            stockMap[count.product_id].hasPendingTransactions = true;
          }
        }
      }
    }
  } catch (error) {
    console.error("[STOCK_CALCULATOR_CRASH] Failed compiling queue records:", error);
  }

  return stockMap;
}
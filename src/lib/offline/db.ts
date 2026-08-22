// src/lib/offline/db.ts

import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from 'idb'

import type {
  Product,
  Category,
  Inventory,
  Shift,
} from '@/types/database'

import type {
  LocalPendingSale,
  LocalHistoricalSale,
  LocalOpenTab,
  LocalTableConfiguration,
} from '../../types/models/pos-cart'

/* =========================================================
 * SYNC STATUS
 * ========================================================= */

export type LocalSyncStatus =
  | 'pending'
  | 'failed'

/* =========================================================
 * LOCAL STOCK RECEIPT
 * ========================================================= */

export interface LocalPendingStockReceipt {
  localId: string

  createdAt: string

  syncStatus: LocalSyncStatus

  retryCount: number

  product_id: string

  business_id: string

  branch_id: string

  shift_id: string | null

  /**
   * Quantity being RECEIVED.
   *
   * Example:
   *
   * current stock = 10
   * received       = 5
   * new stock      = 15
   */
  quantity: number

  unit_cost: number

  /**
   * Local calculated value.
   *
   * The server/database may calculate the final
   * purchase item total independently.
   */
  total_cost: number

  notes?: string

  /**
   * Idempotency key.
   */
  offline_id?: string

  lastSyncAttempt?: string

  lastSyncError?: string
}

/* =========================================================
 * LOCAL STOCK RECONCILIATION
 * ========================================================= */

export interface LocalPendingStockReconciliation {
  localId: string

  createdAt: string

  syncStatus: LocalSyncStatus

  retryCount: number

  product_id: string

  business_id: string

  branch_id: string

  shift_id: string | null

  system_quantity: number

  counted_quantity: number

  adjustment_type?:
    | 'stock_count'
    | 'adjustment'
    | 'waste'
    | 'theft'
    | 'return'

  notes?: string

  offline_id?: string

  lastSyncAttempt?: string

  lastSyncError?: string
}

/* =========================================================
 * DATABASE SCHEMA
 * ========================================================= */

interface LiyuPOSDBSchema extends DBSchema {

  /* -------------------------------------------------------
   * PRODUCTS
   * ------------------------------------------------------- */

  products: {
    key: string

    value: Product

    indexes: {
      'by-category': string
      'by-business': string
    }
  }

  /* -------------------------------------------------------
   * CATEGORIES
   * ------------------------------------------------------- */

  categories: {
    key: string

    value: Category

    indexes: {
      'by-business': string
    }
  }

  /* -------------------------------------------------------
   * INVENTORY
   * ------------------------------------------------------- */

  inventory: {
    key: string

    value: Inventory

    indexes: {
      'by-product': string
      'by-branch': string
    }
  }

  /* -------------------------------------------------------
   * ACTIVE SHIFT
   * ------------------------------------------------------- */

  active_shift: {
    key: string
    value: Shift
  }

  /* -------------------------------------------------------
   * SALES OUTBOX
   * ------------------------------------------------------- */

  pending_sales: {
    key: string
    value: LocalPendingSale
  }

  /* -------------------------------------------------------
   * STOCK RECONCILIATION OUTBOX
   * ------------------------------------------------------- */

  pending_stock_reconciliations: {
    key: string
    value: LocalPendingStockReconciliation
  }

  /* -------------------------------------------------------
   * STOCK RECEIVE OUTBOX
   * ------------------------------------------------------- */

  pending_stock_receipts: {
    key: string
    value: LocalPendingStockReceipt
  }

  /* -------------------------------------------------------
   * SALES HISTORY
   * ------------------------------------------------------- */

  completed_sales_history: {
    key: string

    value: LocalHistoricalSale

    indexes: {
      'by-shift': string
      'by-date': string
    }
  }

  /* -------------------------------------------------------
   * SYNC LOG
   * ------------------------------------------------------- */

  sync_log: {
    key: string

    value: {
      id: string

      type:
        | 'sale'
        | 'inventory_recon'
        | 'inventory_receipt'
        | 'catalog_pull'
        | 'outbound'

      status:
        | 'success'
        | 'failed'

      error_message?: string

      timestamp: string
    }
  }

  /* -------------------------------------------------------
   * OPEN TABS
   * ------------------------------------------------------- */

  open_tabs: {
    key: string
    value: LocalOpenTab
  }

  /* -------------------------------------------------------
   * TABLES
   * ------------------------------------------------------- */

  tables: {
    key: string
    value: LocalTableConfiguration
  }
}

/* =========================================================
 * DATABASE CONFIG
 * ========================================================= */

const DB_NAME = 'liyu-pos-core'

/**
 * Keep version 10.
 *
 * The upgrade code is additive and checks whether each
 * object store already exists, so existing local data
 * is preserved.
 */
const DB_VERSION = 11

/* =========================================================
 * DATABASE INITIALIZATION
 * ========================================================= */

export const getDB = (): Promise<
  IDBPDatabase<LiyuPOSDBSchema>
> => {
  return openDB<LiyuPOSDBSchema>(
    DB_NAME,
    DB_VERSION,
    {
      upgrade(
        db,
        oldVersion,
        _newVersion,
        transaction
      ) {

        console.log(
          `[DB] Upgrade ${oldVersion} → ${DB_VERSION}`
        )

        /* ===================================================
         * PRODUCTS
         * ================================================= */

        if (
          !db.objectStoreNames.contains('products')
        ) {
          const store =
            db.createObjectStore(
              'products',
              {
                keyPath: 'id',
              }
            )

          store.createIndex(
            'by-category',
            'category_id'
          )

          store.createIndex(
            'by-business',
            'business_id'
          )
        }

        /* ===================================================
         * CATEGORIES
         * ================================================= */

        if (
          !db.objectStoreNames.contains('categories')
        ) {
          const store =
            db.createObjectStore(
              'categories',
              {
                keyPath: 'id',
              }
            )

          store.createIndex(
            'by-business',
            'business_id'
          )
        }

        /* ===================================================
         * INVENTORY
         * ================================================= */

        if (
          !db.objectStoreNames.contains('inventory')
        ) {
          const store =
            db.createObjectStore(
              'inventory',
              {
                keyPath: 'id',
              }
            )

          store.createIndex(
            'by-product',
            'product_id'
          )

          store.createIndex(
            'by-branch',
            'branch_id'
          )
        }

        /* ===================================================
         * ACTIVE SHIFT
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'active_shift'
          )
        ) {
          db.createObjectStore(
            'active_shift',
            {
              keyPath: 'id',
            }
          )
        }

        /* ===================================================
         * PENDING SALES
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'pending_sales'
          )
        ) {
          db.createObjectStore(
            'pending_sales',
            {
              keyPath: 'localId',
            }
          )
        }

        /* ===================================================
         * PENDING STOCK RECONCILIATIONS
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'pending_stock_reconciliations'
          )
        ) {
          db.createObjectStore(
            'pending_stock_reconciliations',
            {
              keyPath: 'localId',
            }
          )
        }

        /* ===================================================
         * PENDING STOCK RECEIPTS
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'pending_stock_receipts'
          )
        ) {
          db.createObjectStore(
            'pending_stock_receipts',
            {
              keyPath: 'localId',
            }
          )
        }

        /* ===================================================
         * COMPLETED SALES HISTORY
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'completed_sales_history'
          )
        ) {
          const store =
            db.createObjectStore(
              'completed_sales_history',
              {
                keyPath: 'id',
              }
            )

          store.createIndex(
            'by-shift',
            'shift_id'
          )

          store.createIndex(
            'by-date',
            'created_at'
          )
        }

        /* ===================================================
         * SYNC LOG
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'sync_log'
          )
        ) {
          db.createObjectStore(
            'sync_log',
            {
              keyPath: 'id',
            }
          )
        }

        /* ===================================================
         * OPEN TABS
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'open_tabs'
          )
        ) {
          db.createObjectStore(
            'open_tabs',
            {
              keyPath: 'id',
            }
          )
        }

        /* ===================================================
         * TABLES
         * ================================================= */

        if (
          !db.objectStoreNames.contains(
            'tables'
          )
        ) {
          db.createObjectStore(
            'tables',
            {
              keyPath: 'id',
            }
          )
        }

        console.log(
          '[DB] Liyu POS IndexedDB ready.'
        )
      },
    }
  )
}

/* =========================================================
 * CLEAR SERVER REFERENCE CATALOG
 *
 * IMPORTANT:
 *
 * This ONLY clears server reference data.
 *
 * It DOES NOT clear:
 *   pending_sales
 *   pending_stock_receipts
 *   pending_stock_reconciliations
 * ========================================================= */

export async function clearLocalCatalog(): Promise<void> {
  const db = await getDB()

  const tx = db.transaction(
    [
      'products',
      'categories',
      'inventory',
    ],
    'readwrite'
  )

  await Promise.all([
    tx.objectStore('products').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('inventory').clear(),
  ])

  await tx.done
}
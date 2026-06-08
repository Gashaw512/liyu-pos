import { openDB, DBSchema, IDBPDatabase } from 'idb'
import {
  Product,
  Category,
  Inventory,
  Shift,
  Sale,
  SaleItem,
  Payment,
  PendingSale,
  StockCount
} from '../../types/database'

// Define the precise schema contract for the client browser's IndexedDB instance
interface LiyuPOSDBSchema extends DBSchema {
  // Core Reference Data (Synced down from Supabase, read-only for cashiers)
  products: {
    key: string // UUID
    value: Product
    // Use strict string mappings here for the index schema definitions
    indexes: { 'by-category': string; 'by-business': string }
  }
  categories: {
    key: string // UUID
    value: Category
    indexes: { 'by-business': string }
  }
  inventory: {
    key: string // UUID
    value: Inventory
    indexes: { 'by-product': string; 'by-branch': string }
  }

  // Active Runtime Sessions
  active_shift: {
    key: string // Always "current" to preserve single drawer constraints locally
    value: Shift
  }

  // Local-First Write Queues (Appended locally, cleared post-Supabase sync batch)
  pending_sales: {
    key: string // localId / offlineId string
    value: PendingSale & {
      localId: string
      createdAt: string
      retryCount: number
      syncStatus: 'pending' | 'failed'
    }
  }
  pending_stock_reconciliations: {
    key: string // localId
    value: StockCount & {
      localId: string
      createdAt: string
      syncStatus: 'pending' | 'failed'
    }
  }

  // Local Historical Logs for Fast Offline UI Rendering
  completed_sales_history: {
    key: string // sale UUID / offlineId
    value: Sale & { items: SaleItem[]; payments: Payment[] }
    indexes: { 'by-shift': string; 'by-date': string }
  }

  sync_log: {
    key: string // UUID
    value: {
      id: string
      type: 'sale' | 'inventory_recon' | 'catalog_pull'
      status: 'success' | 'failed'
      error_message?: string
      timestamp: string
    }
  }

  // THE SCHEMA CONTRACT FOR WAITER OPEN TABS
  open_tabs: {
    key: string // Holds the Selected Table ID or Name (e.g., 'Table 1')
    value: {
      id: string
      table_number: string
      updated_at: string
      items: any[]
      total_accumulated: number
    }
  }

  // Dynamic tables list configuration
  tables: { 
    key: string; 
    value: {
      id: string
      name: string
      table_number?: string | number
      status?: string
    } 
  };
}

const DB_NAME = 'liyu-pos-core'
// ─── 1. BUMPED VERSION TO 3 TO FORCE MIGRATION FOR MISSING STORES ───
const DB_VERSION = 3

export const getDB = (): Promise<IDBPDatabase<LiyuPOSDBSchema>> => {
  return openDB<LiyuPOSDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // 1. Products Store with Search Optimization Indexes
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' })
        productStore.createIndex('by-category', 'category_id')
        productStore.createIndex('by-business', 'business_id')
      }

      // 2. Categories Store
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' })
        categoryStore.createIndex('by-business', 'business_id')
      }

      // 3. Stock Level Matrix Store
      if (!db.objectStoreNames.contains('inventory')) {
        const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' })
        inventoryStore.createIndex('by-product', 'product_id')
        inventoryStore.createIndex('by-branch', 'branch_id')
      }

      // 4. Current Shift State Container
      if (!db.objectStoreNames.contains('active_shift')) {
        db.createObjectStore('active_shift', { keyPath: 'id' })
      }

      // 5. Outbound Write Queues
      if (!db.objectStoreNames.contains('pending_sales')) {
        db.createObjectStore('pending_sales', { keyPath: 'localId' })
      }
      if (!db.objectStoreNames.contains('pending_stock_reconciliations')) {
        db.createObjectStore('pending_stock_reconciliations', { keyPath: 'localId' })
      }

      // 6. Local Historical Log Indexes
      if (!db.objectStoreNames.contains('completed_sales_history')) {
        const historyStore = db.createObjectStore('completed_sales_history', { keyPath: 'id' })
        historyStore.createIndex('by-shift', 'shift_id')
        historyStore.createIndex('by-date', 'created_at')
      }

      // 7. System Sync History Logs
      if (!db.objectStoreNames.contains('sync_log')) {
        db.createObjectStore('sync_log', { keyPath: 'id' })
      }

      // 8. INITIALIZE THE WAITER OPEN TABS DATA STORE
      if (!db.objectStoreNames.contains('open_tabs')) {
        db.createObjectStore('open_tabs', { keyPath: 'id' })
      }

      // ─── 2. PHYSICALLY CREATE THE TABLES STORE IF MISSING ───
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' })
      }
    },
  })
}

export async function clearLocalCatalog(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['products', 'categories', 'inventory'], 'readwrite')
  await Promise.all([
    tx.objectStore('products').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('inventory').clear(),
  ])
  await tx.done
}
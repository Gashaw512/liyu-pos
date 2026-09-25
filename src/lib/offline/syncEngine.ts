// src/lib/offline/syncEngine.ts

import { getDB } from './db'

/**
 * Liyu POS Offline Synchronization Engine
 *
 * LOCAL
 *   ↓
 * IndexedDB pending queues
 *   ↓
 * POST /api/sync
 *   ↓
 * Next.js Server
 *   ↓
 * Supabase
 *   ↓
 * Pull latest server catalog/inventory
 *   ↓
 * IndexedDB reference stores
 *
 * IMPORTANT:
 *
 * 1. Client-side only.
 * 2. Never import Supabase server client here.
 * 3. Never import next/headers here.
 * 4. Server remains the authorization/source-of-truth boundary.
 * 5. Pending records are deleted ONLY after exact confirmation.
 * 6. Failed records remain in IndexedDB for retry.
 * 7. A catalog pull happens ONLY when outbound work was
 *    actually synchronized successfully.
 * 8. Transactions from different businesses are never sent
 *    together in the same synchronization batch.
 *
 * Supported outbound transactions:
 *
 *   sale
 *   inventory_count
 *   inventory_receive
 */

/* =========================================================
 * TYPES
 * ========================================================= */

type SyncTransactionType =
  | 'sale'
  | 'inventory_count'
  | 'inventory_receive'

interface SyncTransaction {
  id: string
  type: SyncTransactionType
  timestamp: number
  payload: Record<string, unknown>
}

interface SyncResponse {
  success?: boolean
  syncedIds?: string[]
  failedIds?: string[]
  errors?: Array<{
    id?: string
    message?: string
    error?: string
  } | string>
}

/**
 * Result of outbound synchronization.
 *
 * hadWork:
 *   false = there was nothing waiting to synchronize.
 *
 * success:
 *   true = all transactions that were sent were confirmed.
 *
 * This distinction is critical.
 *
 * "No work" is NOT the same thing as
 * "work successfully synchronized".
 */
interface OutboundSyncResult {
  success: boolean
  hadWork: boolean
}

const CATALOG_REFRESH_INTERVAL_MS = 5 * 60 * 1000
const SYNC_COMPLETE_EVENT = 'liyu:sync-complete'
const INVENTORY_CHANNEL_NAME = 'liyu-pos-inventory'

/* =========================================================
 * SYNC ENGINE
 * ========================================================= */

export class SyncEngine {
  private isSyncing = false

  // =========================================================
  // PUBLIC ENTRY POINT
  // =========================================================

  public async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log(
        '[SYNC] Synchronization already running. Skipping.'
      )

      return
    }

    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined'
    ) {
      return
    }

    if (!navigator.onLine) {
      console.log(
        '[SYNC] Device is offline. Skipping sync.'
      )

      return
    }

    this.isSyncing = true

    try {
      console.log(
        '[SYNC] Starting synchronization...'
      )

      // ======================================================
      // 1. PUSH OUTBOUND TRANSACTIONS
      // ======================================================

      const outboundResult =
        await this.syncOutboundTransactions()

      // ======================================================
      // 3. OUTBOUND SYNC FAILED
      //
      // Never replace local state with a server snapshot
      // while there are unconfirmed local transactions.
      // ======================================================

      if (!outboundResult.success) {
        console.warn(
          '[SYNC] Outbound synchronization was not fully successful.'
        )

        console.warn(
          '[SYNC] Server snapshot will NOT replace local inventory.'
        )

        return
      }

      // ======================================================
      // 4. PULL SERVER SNAPSHOT WHEN NEEDED
      //
      // A new device has no outbound work, but still needs its
      // first catalog snapshot. Refresh it on first use, after
      // successful outbound sync, and periodically when online.
      // ======================================================

      const refreshCatalog =
        outboundResult.hadWork ||
        await this.isCatalogRefreshDue()

      if (refreshCatalog) {
        await this.pullLatestProducts()
      } else {
        console.log(
          '[SYNC] Catalog is current. Pull skipped.'
        )
      }

      console.log(
        '[SYNC] Synchronization finished successfully.'
      )
    } catch (error) {
      console.error(
        '[SYNC] Synchronization pipeline error:',
        error
      )
    } finally {
      this.isSyncing = false
    }
  }

  // =========================================================
  // OUTBOUND SYNCHRONIZATION
  // =========================================================

  private async syncOutboundTransactions(): Promise<OutboundSyncResult> {
    const db = await getDB()

    // =======================================================
    // LOAD PENDING QUEUES
    //
    // These reads are independent, so run them concurrently.
    // =======================================================

    const [
      pendingSales,
      pendingReconciliations,
      pendingReceipts,
    ] = await Promise.all([
      db.getAll('pending_sales'),
      db.getAll('pending_stock_reconciliations'),
      db.getAll('pending_stock_receipts'),
    ])

    const salesCount =
      pendingSales.length

    const reconciliationsCount =
      pendingReconciliations.length

    const receiptsCount =
      pendingReceipts.length

    const totalPending =
      salesCount +
      reconciliationsCount +
      receiptsCount

    // Keep logs compact.
    //
    // Do not dump complete sales/products/customer payloads
    // into the browser console.
    console.log(
      '[SYNC] Pending queues:',
      {
        sales: salesCount,
        reconciliations: reconciliationsCount,
        receipts: receiptsCount,
        total: totalPending,
      }
    )

    // =======================================================
    // NOTHING TO SYNC
    // =======================================================

    if (totalPending === 0) {
      return {
        success: true,
        hadWork: false,
      }
    }

    // =======================================================
    // BUILD SERVER TRANSACTIONS
    // =======================================================

    const formattedTransactions: SyncTransaction[] = []

    // =======================================================
    // 1. SALES
    // =======================================================

    for (
      const sale of pendingSales as any[]
    ) {
      if (
        sale.syncStatus === 'success'
      ) {
        continue
      }

      if (!sale.localId) {
        console.error(
          '[SYNC] Sale missing localId. Keeping it queued.'
        )

        continue
      }

      const createdAt =
        sale.createdAt ??
        sale.created_at ??
        new Date().toISOString()

      formattedTransactions.push({
        id: String(
          sale.localId
        ),

        type: 'sale',

        timestamp:
          this.toTimestamp(
            createdAt
          ),

        payload: {
          id:
            String(
              sale.localId
            ),

          offline_id:
            String(
              sale.offline_id ??
              sale.localId
            ),

          shift_id:
            sale.shift_id ??
            null,

          branch_id:
            sale.branch_id,

          cashier_id:
            sale.cashier_id ??
            null,

          business_id:
            sale.business_id,

          receipt_number:
            sale.receipt_number ??
            null,

          subtotal:
            this.toNumber(
              sale.subtotal
            ),

          discount_amount:
            this.toNumber(
              sale.discount_amount
            ),

          tax_amount:
            this.toNumber(
              sale.tax_amount
            ),

          tip_amount:
            this.toNumber(
              sale.tip_amount
            ),

          total_amount:
            this.toNumber(
              sale.total_amount
            ),

          status:
            sale.status ??
            'completed',

          payment_status:
            sale.payment_status ??
            'paid',

          table_number:
            sale.table_number ??
            null,

          items:
            Array.isArray(
              sale.items
            )
              ? sale.items
              : [],

          payments:
            Array.isArray(
              sale.payments
            )
              ? sale.payments
              : [],
        },
      })
    }

    // =======================================================
    // 2. INVENTORY COUNT / RECONCILIATION
    // =======================================================

    for (
      const record of
      pendingReconciliations as any[]
    ) {
      if (
        record.syncStatus === 'success'
      ) {
        continue
      }

      const createdAt =
        record.createdAt ??
        record.created_at ??
        new Date().toISOString()

      const countedQuantity =
        this.toNumber(
          record.counted_quantity
        )

      const systemQuantity =
        this.toNumber(
          record.system_quantity
        )

      if (
        !record.localId ||
        !record.product_id ||
        !record.business_id ||
        !record.branch_id ||
        !Number.isFinite(
          countedQuantity
        )
      ) {
        console.error(
          '[SYNC] Invalid inventory reconciliation. Keeping it queued.',
          {
            localId:
              record.localId ?? null,

            productId:
              record.product_id ?? null,

            businessId:
              record.business_id ?? null,

            branchId:
              record.branch_id ?? null,
          }
        )

        continue
      }

      formattedTransactions.push({
        id:
          String(
            record.localId
          ),

        type:
          'inventory_count',

        timestamp:
          this.toTimestamp(
            createdAt
          ),

        payload: {
          id:
            String(
              record.localId
            ),

          offline_id:
            String(
              record.offline_id ??
              record.localId
            ),

          product_id:
            record.product_id,

          business_id:
            record.business_id,

          branch_id:
            record.branch_id,

          shift_id:
            record.shift_id ??
            null,

          system_quantity:
            systemQuantity,

          counted_quantity:
            countedQuantity,

          adjustment_type:
            record.adjustment_type ??
            'stock_count',

          notes:
            record.notes ??
            'Mobile inventory reconciliation',
        },
      })
    }

    // =======================================================
    // 3. INVENTORY RECEIVE
    // =======================================================

    for (
      const receipt of
      pendingReceipts as any[]
    ) {
      if (
        receipt.syncStatus === 'success'
      ) {
        continue
      }

      const createdAt =
        receipt.createdAt ??
        receipt.created_at ??
        new Date().toISOString()

      const quantity =
        this.toNumber(
          receipt.quantity
        )

      const unitCost =
        this.toNumber(
          receipt.unit_cost
        )

      const storedTotalCost =
        this.toNumber(
          receipt.total_cost
        )

      const totalCost =
        Number.isFinite(
          storedTotalCost
        ) &&
        storedTotalCost >= 0
          ? storedTotalCost
          : quantity * unitCost

      // =====================================================
      // VALIDATION
      // =====================================================

      if (
        !receipt.localId ||
        !receipt.product_id ||
        !receipt.business_id ||
        !receipt.branch_id ||
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0 ||
        !Number.isFinite(
          unitCost
        ) ||
        unitCost < 0
      ) {
        console.error(
          '[SYNC] Invalid stock receipt. Keeping it queued.',
          {
            localId:
              receipt.localId ?? null,

            productId:
              receipt.product_id ?? null,

            businessId:
              receipt.business_id ?? null,

            branchId:
              receipt.branch_id ?? null,
          }
        )

        continue
      }

      formattedTransactions.push({
        id:
          String(
            receipt.localId
          ),

        type:
          'inventory_receive',

        timestamp:
          this.toTimestamp(
            createdAt
          ),

        payload: {
          id:
            String(
              receipt.localId
            ),

          offline_id:
            String(
              receipt.offline_id ??
              receipt.localId
            ),

          product_id:
            receipt.product_id,

          business_id:
            receipt.business_id,

          branch_id:
            receipt.branch_id,

          shift_id:
            receipt.shift_id ??
            null,

          /**
           * IMPORTANT:
           *
           * This means:
           *
           * current stock + quantity
           *
           * NOT:
           *
           * current stock = quantity
           */
          quantity,

          unit_cost:
            unitCost,

          total_cost:
            totalCost,

          notes:
            receipt.notes ??
            'Stock received from inventory screen',
        },
      })
    }

    // =======================================================
    // NOTHING VALID
    // =======================================================

    if (
      formattedTransactions.length === 0
    ) {
      console.warn(
        '[SYNC] Pending queues contained no valid transactions.'
      )

      /**
       * There WAS work in IndexedDB, so return:
       *
       * hadWork = true
       * success  = false
       *
       * This prevents the engine from downloading a server
       * snapshot while local records remain unresolved.
       */
      return {
        success: false,
        hadWork: true,
      }
    }

    // =======================================================
    // MULTI-TENANT SAFETY CHECK
    // =======================================================
    //
    // A single synchronization batch must never contain
    // transactions belonging to different businesses.
    //
    // This is an additional client-side safety layer.
    //
    // The real authorization boundary remains /api/sync +
    // Supabase RLS/server validation.
    // =======================================================

    const businessIds =
      this.collectBusinessIds(
        formattedTransactions
      )

    if (
      businessIds.length > 1
    ) {
      console.error(
        '[SYNC] Refusing mixed-business synchronization batch.',
        {
          businessCount:
            businessIds.length,
        }
      )

      await this.writeSyncLog(
        db,
        'outbound',
        'failed',
        'Multiple business contexts detected in one synchronization batch.'
      )

      await this.markQueueAsFailed(
        db,
        pendingSales,
        pendingReconciliations,
        pendingReceipts,
        new Error(
          'Multiple business contexts detected in one synchronization batch.'
        )
      )

      return {
        success: false,
        hadWork: true,
      }
    }

    // =======================================================
    // CHRONOLOGICAL ORDER
    // =======================================================

    formattedTransactions.sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    )

    console.log(
      '[SYNC] Transactions prepared:',
      {
        total:
          formattedTransactions.length,

        sales:
          formattedTransactions.filter(
            transaction =>
              transaction.type ===
              'sale'
          ).length,

        inventoryCounts:
          formattedTransactions.filter(
            transaction =>
              transaction.type ===
              'inventory_count'
          ).length,

        inventoryReceives:
          formattedTransactions.filter(
            transaction =>
              transaction.type ===
              'inventory_receive'
          ).length,

        businessId:
          businessIds[0] ?? null,
      }
    )

    // =======================================================
    // SEND TO SERVER
    // =======================================================

    try {
      const response =
        await fetch(
          '/api/sync',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            cache:
              'no-store',

            signal:
              AbortSignal.timeout(
                30_000
              ),

            body:
              JSON.stringify({
                transactions:
                  formattedTransactions,
              }),
          }
        )

      // =====================================================
      // HTTP ERROR
      // =====================================================

      if (
        !response.ok
      ) {
        const errorText =
          await response
            .text()
            .catch(
              () => ''
            )

        throw new Error(
          `Server rejected sync: HTTP ${response.status} ${response.statusText}${
            errorText
              ? ` - ${errorText}`
              : ''
          }`
        )
      }

      // =====================================================
      // RESPONSE
      // =====================================================

      const responseText =
        await response.text()

      if (
        !responseText
      ) {
        throw new Error(
          'Empty synchronization response received.'
        )
      }

      let result:
        SyncResponse

      try {
        result =
          JSON.parse(
            responseText
          ) as SyncResponse
      } catch {
        throw new Error(
          'Server returned invalid JSON.'
        )
      }

      const syncedIds =
        this.normalizeIds(
          result?.syncedIds
        )

      const failedIds =
        this.normalizeIds(
          result?.failedIds
        )

      console.log(
        '[SYNC] Server response:',
        {
          success:
            result?.success,

          sent:
            formattedTransactions.length,

          synced:
            syncedIds.length,

          failed:
            failedIds.length,

          errors:
            Array.isArray(
              result?.errors
            )
              ? result.errors.length
              : 0,
        }
      )

      // =====================================================
      // REMOVE ONLY CONFIRMED TRANSACTIONS
      // =====================================================

      await this.removeConfirmedTransactions(
        db,
        syncedIds,
        pendingSales,
        pendingReconciliations,
        pendingReceipts
      )

      // =====================================================
      // MARK FAILED TRANSACTIONS
      // =====================================================

      if (
        failedIds.length > 0
      ) {
        console.warn(
          '[SYNC] Some transactions failed:',
          {
            count:
              failedIds.length,
          }
        )

        await this.markFailedTransactions(
          db,
          failedIds,
          result?.errors
        )
      }

      // =====================================================
      // DETECT MISSING CONFIRMATIONS
      // =====================================================

      const expectedIds =
        formattedTransactions.map(
          transaction =>
            transaction.id
        )

      const confirmedIds =
        new Set(
          syncedIds
        )

      const failedIdSet =
        new Set(
          failedIds
        )

      const missingIds =
        expectedIds.filter(
          id =>
            !confirmedIds.has(id) &&
            !failedIdSet.has(id)
        )

      if (
        missingIds.length > 0
      ) {
        console.warn(
          '[SYNC] Transactions missing server confirmation:',
          {
            count:
              missingIds.length,
          }
        )

        await this.markFailedTransactions(
          db,
          missingIds,
          undefined
        )
      }

      // =====================================================
      // SUCCESS DETERMINATION
      // =====================================================

      const allConfirmed =
        expectedIds.every(
          id =>
            confirmedIds.has(id)
        )

      if (
        !allConfirmed
      ) {
        await this.writeSyncLog(
          db,
          'outbound',
          'failed',
          'Some transactions were not confirmed by the server.'
        )

        return {
          success: false,
          hadWork: true,
        }
      }

      // =====================================================
      // SUCCESS LOG
      // =====================================================

      await this.writeSyncLog(
        db,
        'outbound',
        'success'
      )

      console.log(
        `[SYNC] ${syncedIds.length} transactions confirmed by server.`
      )

      return {
        success: true,
        hadWork: true,
      }
    } catch (error) {
      console.error(
        '[SYNC] Outbound synchronization failed:',
        error
      )

      /**
       * IMPORTANT:
       *
       * NEVER delete pending transactions here.
       *
       * They remain in IndexedDB and will be retried.
       */
      await this.markQueueAsFailed(
        db,
        pendingSales,
        pendingReconciliations,
        pendingReceipts,
        error
      )

      return {
        success: false,
        hadWork: true,
      }
    }
  }

  private async isCatalogRefreshDue(): Promise<boolean> {
    try {
      const db = await getDB()
      const logs = await db.getAll('sync_log')
      const lastSuccessfulPull = logs
        .filter((entry) => entry.type === 'catalog_pull' && entry.status === 'success')
        .reduce((latest, entry) => {
          const timestamp = Date.parse(entry.timestamp)
          return Number.isFinite(timestamp) && timestamp > latest
            ? timestamp
            : latest
        }, 0)

      return Date.now() - lastSuccessfulPull >= CATALOG_REFRESH_INTERVAL_MS
    } catch (error) {
      console.warn('[SYNC] Could not check catalog freshness; refreshing it.', error)
      return true
    }
  }

  // =========================================================
  // COLLECT BUSINESS CONTEXTS
  // =========================================================

  private collectBusinessIds(
    transactions: SyncTransaction[]
  ): string[] {
    const ids = new Set<string>()

    for (
      const transaction of transactions
    ) {
      const businessId =
        transaction.payload
          ?.business_id

      if (
        typeof businessId ===
          'string' &&
        businessId.trim()
      ) {
        ids.add(
          businessId
        )
      }
    }

    return Array.from(
      ids
    )
  }

  // =========================================================
  // REMOVE CONFIRMED TRANSACTIONS
  // =========================================================

  private async removeConfirmedTransactions(
    db: Awaited<ReturnType<typeof getDB>>,
    syncedIds: string[],
    pendingSales: any[],
    pendingReconciliations: any[],
    pendingReceipts: any[]
  ): Promise<void> {
    if (
      syncedIds.length === 0
    ) {
      return
    }

    const tx =
      db.transaction(
        [
          'pending_sales',
          'pending_stock_reconciliations',
          'pending_stock_receipts',
        ],
        'readwrite'
      )

    const salesStore =
      tx.objectStore(
        'pending_sales'
      )

    const reconciliationStore =
      tx.objectStore(
        'pending_stock_reconciliations'
      )

    const receiptsStore =
      tx.objectStore(
        'pending_stock_receipts'
      )

    const salesIds =
      new Set(
        pendingSales.map(
          sale =>
            String(
              sale.localId
            )
        )
      )

    const reconciliationIds =
      new Set(
        pendingReconciliations.map(
          record =>
            String(
              record.localId
            )
        )
      )

    const receiptIds =
      new Set(
        pendingReceipts.map(
          record =>
            String(
              record.localId
            )
        )
      )

    for (
      const rawId of syncedIds
    ) {
      const id =
        String(rawId)

      if (
        salesIds.has(id)
      ) {
        await salesStore.delete(
          id
        )

        continue
      }

      if (
        reconciliationIds.has(id)
      ) {
        await reconciliationStore.delete(
          id
        )

        continue
      }

      if (
        receiptIds.has(id)
      ) {
        await receiptsStore.delete(
          id
        )
      }
    }

    await tx.done
  }

  // =========================================================
  // MARK FAILED TRANSACTIONS
  // =========================================================

  private async markFailedTransactions(
    db: Awaited<ReturnType<typeof getDB>>,
    ids: string[],
    errors?: SyncResponse['errors']
  ): Promise<void> {
    if (
      ids.length === 0
    ) {
      return
    }

    const tx =
      db.transaction(
        [
          'pending_sales',
          'pending_stock_reconciliations',
          'pending_stock_receipts',
        ],
        'readwrite'
      )

    const salesStore =
      tx.objectStore(
        'pending_sales'
      )

    const reconciliationStore =
      tx.objectStore(
        'pending_stock_reconciliations'
      )

    const receiptsStore =
      tx.objectStore(
        'pending_stock_receipts'
      )

    for (
      const rawId of ids
    ) {
      const id =
        String(rawId)

      const errorMessage =
        this.getTransactionError(
          id,
          errors
        )

      // -----------------------------------------------------
      // SALE
      // -----------------------------------------------------

      const sale =
        await salesStore.get(
          id
        )

      if (
        sale
      ) {
        await salesStore.put({
          ...sale,

          syncStatus:
            'failed',

          retryCount:
            Number(
              (sale as any).retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            new Date()
              .toISOString(),

          lastSyncError:
            errorMessage,
        })

        continue
      }

      // -----------------------------------------------------
      // INVENTORY COUNT
      // -----------------------------------------------------

      const reconciliation =
        await reconciliationStore.get(
          id
        )

      if (
        reconciliation
      ) {
        await reconciliationStore.put({
          ...reconciliation,

          syncStatus:
            'failed',

          retryCount:
            Number(
              reconciliation.retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            new Date()
              .toISOString(),

          lastSyncError:
            errorMessage,
        })

        continue
      }

      // -----------------------------------------------------
      // STOCK RECEIVE
      // -----------------------------------------------------

      const receipt =
        await receiptsStore.get(
          id
        )

      if (
        receipt
      ) {
        await receiptsStore.put({
          ...receipt,

          syncStatus:
            'failed',

          retryCount:
            Number(
              receipt.retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            new Date()
              .toISOString(),

          lastSyncError:
            errorMessage,
        })
      }
    }

    await tx.done
  }

  // =========================================================
  // MARK WHOLE QUEUES FAILED
  // =========================================================

  private async markQueueAsFailed(
    db: Awaited<ReturnType<typeof getDB>>,
    pendingSales: any[],
    pendingReconciliations: any[],
    pendingReceipts: any[],
    error: unknown
  ): Promise<void> {
    try {
      const tx =
        db.transaction(
          [
            'pending_sales',
            'pending_stock_reconciliations',
            'pending_stock_receipts',
            'sync_log',
          ],
          'readwrite'
        )

      const salesStore =
        tx.objectStore(
          'pending_sales'
        )

      const reconciliationStore =
        tx.objectStore(
          'pending_stock_reconciliations'
        )

      const receiptsStore =
        tx.objectStore(
          'pending_stock_receipts'
        )

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown synchronization error'

      const now =
        new Date()
          .toISOString()

      // -----------------------------------------------------
      // SALES
      // -----------------------------------------------------

      for (
        const sale of pendingSales
      ) {
        await salesStore.put({
          ...sale,

          syncStatus:
            'failed',

          retryCount:
            Number(
              sale.retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            now,

          lastSyncError:
            errorMessage,
        })
      }

      // -----------------------------------------------------
      // INVENTORY COUNTS
      // -----------------------------------------------------

      for (
        const record of
        pendingReconciliations
      ) {
        await reconciliationStore.put({
          ...record,

          syncStatus:
            'failed',

          retryCount:
            Number(
              record.retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            now,

          lastSyncError:
            errorMessage,
        })
      }

      // -----------------------------------------------------
      // STOCK RECEIVES
      // -----------------------------------------------------

      for (
        const receipt of pendingReceipts
      ) {
        await receiptsStore.put({
          ...receipt,

          syncStatus:
            'failed',

          retryCount:
            Number(
              receipt.retryCount ??
              0
            ) + 1,

          lastSyncAttempt:
            now,

          lastSyncError:
            errorMessage,
        })
      }

      // -----------------------------------------------------
      // SYNC LOG
      // -----------------------------------------------------

      await tx
        .objectStore(
          'sync_log'
        )
        .put({
          id:
            this.createId(),

          type:
            'outbound',

          status:
            'failed',

          error_message:
            errorMessage,

          timestamp:
            now,
        })

      await tx.done
    } catch (error) {
      console.error(
        '[SYNC] Failed to mark queues as failed:',
        error
      )
    }
  }

  // =========================================================
  // PULL LATEST SERVER DATA
  // =========================================================

  private async pullLatestProducts(): Promise<void> {
    try {
      console.log(
        '[SYNC] Pulling latest server catalog/inventory...'
      )

      const response =
        await fetch(
          '/api/products/templates',
          {
            method:
              'GET',

            cache:
              'no-store',

            signal:
              AbortSignal.timeout(
                30_000
              ),
          }
        )

      if (
        !response.ok
      ) {
        const errorText =
          await response
            .text()
            .catch(
              () => ''
            )

        throw new Error(
          `Catalog pull failed: HTTP ${response.status} ${response.statusText}${
            errorText
              ? ` - ${errorText}`
              : ''
          }`
        )
      }

      const data =
        await response.json()

      /**
       * Require arrays.
       *
       * This prevents an unexpected API response such as:
       *
       * { error: "..." }
       *
       * from being treated as a valid empty catalog.
       */
      if (
        !data ||
        !Array.isArray(
          data.products
        ) ||
        !Array.isArray(
          data.categories
        ) ||
        !Array.isArray(
          data.inventory
        )
      ) {
        throw new Error(
          'Catalog pull returned an invalid server snapshot.'
        )
      }

      const products =
        data.products

      const categories =
        data.categories

      const inventory =
        data.inventory

      console.log(
        '[SYNC] Server snapshot:',
        {
          products:
            products.length,

          categories:
            categories.length,

          inventory:
            inventory.length,
        }
      )

      const db =
        await getDB()

      const tx =
        db.transaction(
          [
            'products',
            'categories',
            'inventory',
            'sync_log',
          ],
          'readwrite'
        )

      const productsStore =
        tx.objectStore(
          'products'
        )

      const categoriesStore =
        tx.objectStore(
          'categories'
        )

      const inventoryStore =
        tx.objectStore(
          'inventory'
        )

      // =====================================================
      // REPLACE SERVER SNAPSHOT
      //
      // This happens inside ONE IndexedDB transaction.
      //
      // If the transaction fails, IndexedDB rolls back.
      // =====================================================

      await productsStore.clear()

      await categoriesStore.clear()

      await inventoryStore.clear()

      // =====================================================
      // PRODUCTS
      // =====================================================

      for (
        const product of products
      ) {
        if (
          product?.id
        ) {
          await productsStore.put(
            product
          )
        }
      }

      // =====================================================
      // CATEGORIES
      // =====================================================

      for (
        const category of categories
      ) {
        if (
          category?.id
        ) {
          await categoriesStore.put(
            category
          )
        }
      }

      // =====================================================
      // INVENTORY
      // =====================================================

      for (
        const inventoryRecord
        of inventory
      ) {
        if (
          inventoryRecord?.id
        ) {
          await inventoryStore.put(
            inventoryRecord
          )
        }
      }

      // =====================================================
      // LOG
      // =====================================================

      await tx
        .objectStore(
          'sync_log'
        )
        .put({
          id:
            this.createId(),

          type:
            'catalog_pull',

          status:
            'success',

          timestamp:
            new Date()
              .toISOString(),
        })

      await tx.done

      this.notifyCatalogUpdated()

      console.log(
        '[SYNC] Server catalog/inventory pull completed.'
      )
    } catch (error) {
      /**
       * IMPORTANT:
       *
       * Pull failure does NOT destroy existing
       * local reference data.
       *
       * The old local catalog remains available.
       */
      console.error(
        '[SYNC] Catalog pull failed:',
        error
      )
    }
  }

  private notifyCatalogUpdated(): void {
    if (typeof window === 'undefined') {
      return
    }

    window.dispatchEvent(new Event(SYNC_COMPLETE_EVENT))

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(INVENTORY_CHANNEL_NAME)
        channel.postMessage({ type: SYNC_COMPLETE_EVENT })
        channel.close()
      } catch (error) {
        console.warn('[SYNC] Could not notify other tabs about catalog update.', error)
      }
    }
  }

  // =========================================================
  // WRITE SYNC LOG
  // =========================================================

  private async writeSyncLog(
    db: Awaited<ReturnType<typeof getDB>>,
    type:
      | 'outbound'
      | 'sale'
      | 'inventory_recon'
      | 'inventory_receipt'
      | 'catalog_pull',
    status:
      | 'success'
      | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.put(
        'sync_log',
        {
          id:
            this.createId(),

          type,

          status,

          ...(errorMessage
            ? {
                error_message:
                  errorMessage,
              }
            : {}),

          timestamp:
            new Date()
              .toISOString(),
        }
      )
    } catch (error) {
      console.warn(
        '[SYNC] Unable to write sync log:',
        error
      )
    }
  }

  // =========================================================
  // NORMALIZE IDS
  // =========================================================

  private normalizeIds(
    ids: unknown
  ): string[] {
    if (
      !Array.isArray(ids)
    ) {
      return []
    }

    return ids
      .filter(
        id =>
          typeof id === 'string' ||
          typeof id === 'number'
      )
      .map(
        id =>
          String(id)
      )
  }

  // =========================================================
  // SERVER ERROR FOR TRANSACTION
  // =========================================================

  private getTransactionError(
    id: string,
    errors?: SyncResponse['errors']
  ): string {
    if (
      !Array.isArray(errors)
    ) {
      return 'Server rejected transaction.'
    }

    const matchingError =
      errors.find(
        error => {
          if (
            typeof error ===
            'string'
          ) {
            return false
          }

          return (
            error?.id != null &&
            String(
              error.id
            ) === id
          )
        }
      )

    if (
      typeof matchingError ===
      'string'
    ) {
      return matchingError
    }

    if (
      matchingError
    ) {
      return (
        matchingError.message ??
        matchingError.error ??
        'Server rejected transaction.'
      )
    }

    return 'Server rejected transaction.'
  }

  // =========================================================
  // SAFE NUMBER CONVERSION
  // =========================================================

  private toNumber(
    value: unknown
  ): number {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0
    }

    const number =
      Number(value)

    return Number.isFinite(
      number
    )
      ? number
      : 0
  }

  // =========================================================
  // TIMESTAMP HELPER
  // =========================================================

  private toTimestamp(
    value: unknown
  ): number {
    const date =
      new Date(
        String(value)
      )

    const timestamp =
      date.getTime()

    return Number.isFinite(
      timestamp
    )
      ? timestamp
      : Date.now()
  }

  // =========================================================
  // SAFE ID
  // =========================================================

  private createId(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID ===
        'function'
    ) {
      return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  }
}

/* =========================================================
 * SINGLETON
 * ========================================================= */

export const syncEngine =
  new SyncEngine()

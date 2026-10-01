// src/app/api/sync/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/* ============================================================
   TYPES
============================================================ */

type TransactionType =
  | 'sale'
  | 'inventory_count'
  | 'inventory_receive'

interface SyncTransaction {
  id: string
  type: TransactionType
  timestamp: number | string
  payload: Record<string, unknown>
}

interface SyncContext {
  mainBranchId: string | null
  activeBusinessId: string
  operatorUserId: string
  operatorRole: string | null
}

interface InventoryChange {
  inventoryId: string
  previousQuantity: number
  newQuantity: number
  movementId: string | null
}

interface SaleRecord {
  id: string
  offline_id: string
  branch_id: string
  business_id: string
  cashier_id: string
  shift_id: string | null
  receipt_number: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  tip_amount: number
  total_amount: number
  table_name: string | null
  status: string
  is_offline_sync: boolean
  created_at: string
}

interface SaleItemRecord {
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price: number
}

interface PaymentRecord {
  sale_id: string
  business_id: string
  amount: number
  method: string
  status: string
  created_at: string
}

interface SaleReferences {
  branchId: string
  businessId: string
  cashierId: string
  shiftId: string | null
}

interface SyncError {
  id: string
  message: string
}

type SupabaseClient = Awaited<
  ReturnType<typeof createClient>
>

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_SYNC_TRANSACTIONS = 200

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/* ============================================================
   SALE PROCESSING LOCK
============================================================ */

/*
 * Protects against the same sale being processed concurrently
 * inside the same Next.js server instance.
 *
 * Database idempotency checks remain the persistent protection.
 */

const processingSales = new Map<
  string,
  Promise<void>
>()

async function withSaleLock<T>(
  saleId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const existingLock =
    processingSales.get(saleId)

  if (existingLock) {
    try {
      await existingLock
    } catch {
      // Previous request failed.
      // Current request may retry.
    }

    return operation()
  }

  let resolveLock:
    | (() => void)
    | undefined

  const lockPromise =
    new Promise<void>(
      (resolve) => {
        resolveLock = resolve
      },
    )

  processingSales.set(
    saleId,
    lockPromise,
  )

  try {
    return await operation()
  } finally {
    // Always resolve the coordination promise. Rejecting it can create an
    // unhandled rejection when no concurrent request is waiting on this lock.
    resolveLock?.()

    if (
      processingSales.get(saleId) ===
      lockPromise
    ) {
      processingSales.delete(saleId)
    }
  }
}

/* ============================================================
   GENERIC HELPERS
============================================================ */

function toValidUuid(
  value: unknown,
  fallback: string | null = null,
): string | null {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return fallback
  }

  return UUID_REGEX.test(value)
    ? value
    : fallback
}

function toNumber(
  value: unknown,
): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

function toStringValue(
  value: unknown,
  fallback = '',
): string {
  return typeof value === 'string'
    ? value
    : fallback
}

function toNullableString(
  value: unknown,
): string | null {
  return typeof value === 'string'
    ? value
    : null
}

function normalizeTimestamp(
  timestamp: number | string,
): string {
  const date =
    new Date(timestamp)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return new Date().toISOString()
  }

  return date.toISOString()
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown synchronization error.'
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >
  }

  return {}
}

/* ============================================================
   NORMALIZE TRANSACTIONS
============================================================ */

function normalizeTransactions(
  value: unknown,
): SyncTransaction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (
        item,
      ): item is Record<
        string,
        unknown
      > =>
        Boolean(
          item &&
          typeof item === 'object' &&
          !Array.isArray(item),
        ),
    )
    .map((item) => ({
      id: toStringValue(
        item.id,
      ),
      type:
        toStringValue(
          item.type,
        ) as TransactionType,
      timestamp:
        typeof item.timestamp ===
          'number' ||
        typeof item.timestamp ===
          'string'
          ? item.timestamp
          : Date.now(),
      payload:
        asRecord(
          item.payload,
        ),
    }))
}

/* ============================================================
   RESOLVE AUTHENTICATED CONTEXT
============================================================ */

async function resolveSyncContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncContext> {
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'business_id, role',
    )
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    !profile?.business_id
  ) {
    throw new Error(
      'Authenticated user is not associated with a business.',
    )
  }

  const businessId =
    toValidUuid(
      profile.business_id,
    )

  if (!businessId) {
    throw new Error(
      'Authenticated business_id is invalid.',
    )
  }

  const {
    data: branch,
    error: branchError,
  } = await supabase
    .from('branches')
    .select('id')
    .eq(
      'business_id',
      businessId,
    )
    .eq('is_main', true)
    .limit(1)
    .maybeSingle()

  if (branchError) {
    throw branchError
  }

  return {
    mainBranchId:
      branch?.id ?? null,

    activeBusinessId:
      businessId,

    operatorUserId:
      userId,

    operatorRole:
      typeof profile.role ===
      'string'
        ? profile.role
        : null,
  }
}

/* ============================================================
   RESOLVE BUSINESS / BRANCH
============================================================ */

async function resolveBusinessBranch(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  context: SyncContext,
): Promise<{
  branchId: string
  businessId: string
}> {
  const requestedBusinessId =
    payload.business_id ===
    'biz_active'
      ? context.activeBusinessId
      : toValidUuid(
          payload.business_id,
        )

  if (!requestedBusinessId) {
    throw new Error(
      'Unable to resolve business_id.',
    )
  }

  /*
   * Never allow a client payload to
   * select another tenant.
   */
  if (
    requestedBusinessId !==
    context.activeBusinessId
  ) {
    throw new Error(
      'Business access denied.',
    )
  }

  const requestedBranchId =
    payload.branch_id ===
    'branch_main'
      ? context.mainBranchId
      : toValidUuid(
          payload.branch_id,
        )

  if (!requestedBranchId) {
    throw new Error(
      'Unable to resolve branch_id.',
    )
  }

  /*
   * Confirm the branch belongs to
   * the authenticated business.
   */
  const {
    data: branch,
    error,
  } = await supabase
    .from('branches')
    .select('id')
    .eq(
      'id',
      requestedBranchId,
    )
    .eq(
      'business_id',
      context.activeBusinessId,
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!branch) {
    throw new Error(
      'Branch access denied.',
    )
  }

  return {
    branchId: branch.id,
    businessId:
      context.activeBusinessId,
  }
}

/* ============================================================
   RESOLVE SALE REFERENCES
============================================================ */

async function resolveSaleReferences(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  context: SyncContext,
): Promise<SaleReferences> {
  const {
    branchId,
    businessId,
  } =
    await resolveBusinessBranch(
      supabase,
      payload,
      context,
    )

  const suppliedCashierId =
    payload.cashier_id
      ? toValidUuid(
          payload.cashier_id,
        )
      : null

  if (
    suppliedCashierId &&
    suppliedCashierId !==
      context.operatorUserId
  ) {
    throw new Error(
      'Cashier identity does not match the authenticated user.',
    )
  }

  const shiftId =
    toValidUuid(
      payload.shift_id,
    )

  return {
    branchId,
    businessId,
    cashierId:
      context.operatorUserId,
    shiftId,
  }
}

/* ============================================================
   BUILD SALE
============================================================ */

async function buildSaleRecord(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  context: SyncContext,
  timestamp: string,
): Promise<SaleRecord> {
  const {
    branchId,
    businessId,
    cashierId,
    shiftId,
  } =
    await resolveSaleReferences(
      supabase,
      payload,
      context,
    )

  const saleId =
    toStringValue(
      payload.id,
    )

  if (!saleId) {
    throw new Error(
      'Sale id is required.',
    )
  }

  return {
    id: saleId,

    offline_id:
      toStringValue(
        payload.offline_id,
        saleId,
      ),

    branch_id:
      branchId,

    business_id:
      businessId,

    cashier_id:
      cashierId,

    shift_id:
      shiftId,

    receipt_number:
      toStringValue(
        payload.receipt_number,
        `REC-${Date.now()
          .toString()
          .slice(-6)}`,
      ),

    subtotal:
      toNumber(
        payload.subtotal,
      ),

    discount_amount:
      toNumber(
        payload.discount_amount,
      ),

    tax_amount:
      toNumber(
        payload.tax_amount,
      ),

    tip_amount:
      toNumber(
        payload.tip_amount,
      ),

    total_amount:
      toNumber(
        payload.total_amount,
      ),

    table_name:
      toNullableString(
        payload.table_number,
      ),

    status:
      toStringValue(
        payload.status,
        'completed',
      ),

    is_offline_sync: true,

    created_at:
      timestamp,
  }
}

/* ============================================================
   BUILD SALE ITEMS
============================================================ */

function buildSaleItems(
  value: unknown,
  saleId: string,
): SaleItemRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(asRecord)
    .filter(
      (item) =>
        Boolean(
          toValidUuid(
            item.product_id,
          ),
        ) &&
        toNumber(
          item.quantity,
        ) > 0,
    )
    .map((item) => ({
      sale_id: saleId,

      product_id:
        toStringValue(
          item.product_id,
        ),

      product_name:
        toStringValue(
          item.product_name,
          'Item',
        ),

      quantity:
        toNumber(
          item.quantity,
        ),

      unit_price:
        toNumber(
          item.unit_price,
        ),

      cost_price:
        toNumber(
          item.cost_price,
        ),
    }))
}

/* ============================================================
   BUILD PAYMENTS
============================================================ */

function buildPayments(
  value: unknown,
  saleId: string,
  businessId: string,
  timestamp: string,
): PaymentRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(asRecord)
    .filter(
      (payment) =>
        toNumber(
          payment.amount,
        ) > 0,
    )
    .map((payment) => ({
      sale_id: saleId,

      business_id:
        businessId,

      amount:
        toNumber(
          payment.amount,
        ),

      method:
        toStringValue(
          payment.method,
          'cash',
        ),

      status: payment.status === 'pending' ? 'pending' : 'completed',

      created_at:
        timestamp,
    }))
}

/* ============================================================
   CHECK SALE INVENTORY MOVEMENT
============================================================ */

async function hasSaleInventoryMovement(
  supabase: SupabaseClient,
  saleId: string,
  businessId: string,
  branchId: string,
): Promise<boolean> {
  const {
    data,
    error,
  } = await supabase
    .from('inventory_movements')
    .select('id')
    .eq(
      'business_id',
      businessId,
    )
    .eq(
      'branch_id',
      branchId,
    )
    .eq(
      'reference_id',
      saleId,
    )
    .eq(
      'reference_type',
      'sale',
    )
    .limit(1)

  if (error) {
    throw error
  }

  return Boolean(
    data?.length,
  )
}

/* ============================================================
   ROLLBACK SALE INVENTORY
============================================================ */

async function rollbackSaleInventory(
  supabase: SupabaseClient,
  changes: InventoryChange[],
): Promise<void> {
  if (
    changes.length === 0
  ) {
    return
  }

  /*
   * Roll back in reverse order.
   */
  for (
    const change of [
      ...changes,
    ].reverse()
  ) {
    try {
      const {
        error: restoreError,
      } = await supabase
        .from('inventory')
        .update({
          quantity:
            change.previousQuantity,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          change.inventoryId,
        )

      if (restoreError) {
        console.error(
          '[SYNC] Failed to restore inventory:',
          restoreError,
        )
      }

      if (
        change.movementId
      ) {
        const {
          error:
            movementDeleteError,
        } =
          await supabase
            .from(
              'inventory_movements',
            )
            .delete()
            .eq(
              'id',
              change.movementId,
            )

        if (
          movementDeleteError
        ) {
          console.error(
            '[SYNC] Failed to remove rollback movement:',
            movementDeleteError,
          )
        }
      }
    } catch (error) {
      console.error(
        '[SYNC] Inventory rollback error:',
        error,
      )
    }
  }
}

/* ============================================================
   INVENTORY DEDUCTION FOR SALE
============================================================ */

async function deductInventoryForSale(
  supabase: SupabaseClient,
  sale: SaleRecord,
  items: SaleItemRecord[],
  timestamp: string,
  userId: string,
): Promise<InventoryChange[]> {
  const changes: InventoryChange[] =
    []

  try {
    /*
     * Final idempotency check.
     */
    const alreadyProcessed =
      await hasSaleInventoryMovement(
        supabase,
        sale.id,
        sale.business_id,
        sale.branch_id,
      )

    if (
      alreadyProcessed
    ) {
      return []
    }

    for (
      const item of items
    ) {
      const quantitySold =
        toNumber(
          item.quantity,
        )

      if (
        !item.product_id ||
        quantitySold <= 0
      ) {
        continue
      }

      /*
       * Re-check before every item.
       */
      const movementExists =
        await hasSaleInventoryMovement(
          supabase,
          sale.id,
          sale.business_id,
          sale.branch_id,
        )

      if (movementExists) {
        return changes
      }

      /*
       * Load tenant-scoped inventory.
       */
      const {
        data: inventory,
        error:
          inventoryError,
      } = await supabase
        .from('inventory')
        .select(
          'id, quantity',
        )
        .eq(
          'business_id',
          sale.business_id,
        )
        .eq(
          'branch_id',
          sale.branch_id,
        )
        .eq(
          'product_id',
          item.product_id,
        )
        .maybeSingle()

      if (inventoryError) {
        throw inventoryError
      }

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product ${item.product_id}.`,
        )
      }

      const currentQuantity =
        toNumber(
          inventory.quantity,
        )

      const newQuantity =
        currentQuantity -
        quantitySold

      /*
       * Keep the existing behavior:
       * allow the inventory calculation to
       * proceed exactly as before.
       */
      const {
        error:
          updateError,
      } = await supabase
        .from('inventory')
        .update({
          quantity:
            newQuantity,

          updated_at:
            timestamp,
        })
        .eq(
          'id',
          inventory.id,
        )
        .eq(
          'business_id',
          sale.business_id,
        )
        .eq(
          'branch_id',
          sale.branch_id,
        )

      if (updateError) {
        throw updateError
      }

      const change: InventoryChange =
        {
          inventoryId:
            inventory.id,

          previousQuantity:
            currentQuantity,

          newQuantity,

          movementId:
            null,
        }

      changes.push(change)

      /*
       * Record inventory movement.
       */
      const {
        data: movement,
        error:
          movementError,
      } = await supabase
        .from(
          'inventory_movements',
        )
        .insert({
          business_id:
            sale.business_id,

          branch_id:
            sale.branch_id,

          product_id:
            item.product_id,

          user_id:
            userId,

          movement_type:
            'sale',

          quantity:
            -quantitySold,

          unit_cost:
            toNumber(
              item.cost_price,
            ),

          reference_id:
            sale.id,

          reference_type:
            'sale',

          notes:
            `Sale ${sale.receipt_number}`,

          created_at:
            timestamp,
        })
        .select('id')
        .maybeSingle()

      if (movementError) {
        throw movementError
      }

      if (movement?.id) {
        change.movementId =
          movement.id
      }
    }

    return changes
  } catch (error) {
    await rollbackSaleInventory(
      supabase,
      changes,
    )

    throw error
  }
}

/* ============================================================
   SYNC SALE
============================================================ */

async function syncSale(
  supabase: SupabaseClient,
  tx: SyncTransaction,
  context: SyncContext,
): Promise<string> {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp,
    )

  /*
   * IMPORTANT:
   * buildSaleRecord is async because
   * tenant/branch validation is async.
   */
  const sale =
    await buildSaleRecord(
      supabase,
      payload,
      context,
      timestamp,
    )

  return withSaleLock(
    sale.id,
    async () => {
      const items =
        buildSaleItems(
          payload.items,
          sale.id,
        )

      const payments =
        buildPayments(
          payload.payments,
          sale.id,
          sale.business_id,
          timestamp,
        )

      if (
        items.length === 0
      ) {
        throw new Error(
          `Sale ${sale.id} contains no valid sale items.`,
        )
      }

      /*
       * Check whether sale already exists.
       */
      const {
        data: existingSale,
        error:
          existingSaleError,
      } = await supabase
        .from('sales')
        .select('id')
        .eq(
          'id',
          sale.id,
        )
        .eq(
          'business_id',
          sale.business_id,
        )
        .maybeSingle()

      if (
        existingSaleError
      ) {
        throw existingSaleError
      }

      if (!existingSale) {
        const {
          error: saleError,
        } = await supabase
          .from('sales')
          .insert(sale)

        if (saleError) {
          throw saleError
        }
      }

      /*
       * FIFO costing runs from a database trigger on sale_items and expects
       * an inventory row for every sold product. Some older/catalog products
       * can be sold before a branch inventory row exists. Create a zero-stock
       * row first so the sale can sync and the existing negative-stock/FIFO
       * fallback behavior can account for the sold quantity.
       *
       * Ignore conflicts to avoid overwriting a live inventory balance.
       */
      const productIds = [
        ...new Set(
          items
            .map((item) => item.product_id)
            .filter(Boolean),
        ),
      ]

      if (productIds.length > 0) {
        const {
          data: validProducts,
          error: productsError,
        } = await supabase
          .from('products')
          .select('id')
          .eq('business_id', sale.business_id)
          .in('id', productIds)

        if (productsError) {
          throw productsError
        }

        const validProductIds = new Set(
          (validProducts ?? []).map((product) => product.id),
        )
        const missingInventoryRows = [...validProductIds].map((productId) => ({
          business_id: sale.business_id,
          branch_id: sale.branch_id,
          product_id: productId,
          quantity: 0,
        }))

        if (missingInventoryRows.length > 0) {
          const { error: inventorySeedError } = await supabase
            .from('inventory')
            .upsert(missingInventoryRows, {
              onConflict: 'branch_id,product_id',
              ignoreDuplicates: true,
            })

          if (inventorySeedError) {
            throw inventorySeedError
          }
        }
      }

      /*
       * Sale items.
       */
      if (
        items.length > 0
      ) {
        const {
          data: existingItems,
          error:
            existingItemsError,
        } = await supabase
          .from('sale_items')
          .select('id')
          .eq(
            'sale_id',
            sale.id,
          )
          .limit(1)

        if (
          existingItemsError
        ) {
          throw existingItemsError
        }

        if (
          !existingItems?.length
        ) {
          const {
            error: itemsError,
          } = await supabase
            .from('sale_items')
            .insert(items)

          if (itemsError) {
            throw itemsError
          }
        }
      }

      /*
       * Payments.
       */
      if (
        payments.length > 0
      ) {
        const {
          data:
            existingPayments,
          error:
            existingPaymentsError,
        } = await supabase
          .from('payments')
          .select('sale_id')
          .eq(
            'sale_id',
            sale.id,
          )
          .limit(1)

        if (
          existingPaymentsError
        ) {
          throw existingPaymentsError
        }

        if (
          !existingPayments?.length
        ) {
          const {
            error:
              paymentsError,
          } = await supabase
            .from('payments')
            .insert(
              payments,
            )

          if (paymentsError) {
            throw paymentsError
          }
        }
      }

      /*
       * Second idempotency check.
       */
      const processedBeforeDeduction =
        await hasSaleInventoryMovement(
          supabase,
          sale.id,
          sale.business_id,
          sale.branch_id,
        )

      if (
        processedBeforeDeduction
      ) {
        return sale.id
      }

      /*
       * Authoritative server inventory update.
       */
      await deductInventoryForSale(
        supabase,
        sale,
        items,
        timestamp,
        context.operatorUserId,
      )

      /*
       * Final verification.
       */
      const processedAfterDeduction =
        await hasSaleInventoryMovement(
          supabase,
          sale.id,
          sale.business_id,
          sale.branch_id,
        )

      if (
        !processedAfterDeduction
      ) {
        throw new Error(
          `Sale ${sale.id} inventory movement could not be confirmed.`,
        )
      }

      return sale.id
    },
  )
}

/* ============================================================
   SYNC INVENTORY COUNT
============================================================ */

async function syncInventoryCount(
  supabase: SupabaseClient,
  tx: SyncTransaction,
  context: SyncContext,
): Promise<string> {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp,
    )

  const {
    branchId,
    businessId,
  } =
    await resolveBusinessBranch(
      supabase,
      payload,
      context,
    )

  const productId =
    toValidUuid(
      payload.product_id,
    )

  if (!productId) {
    throw new Error(
      'Invalid product_id for inventory count.',
    )
  }

  const systemQuantity =
    toNumber(
      payload.system_quantity,
    )

  const countedQuantity =
    toNumber(
      payload.counted_quantity,
    )

  const variance =
    countedQuantity -
    systemQuantity

  const referenceId =
    toStringValue(
      payload.id,
      tx.id,
    )

  /*
   * Idempotency is tenant scoped.
   */
  const {
    data:
      existingMovement,
    error:
      existingMovementError,
  } = await supabase
    .from(
      'inventory_movements',
    )
    .select('id')
    .eq(
      'business_id',
      businessId,
    )
    .eq(
      'branch_id',
      branchId,
    )
    .eq(
      'product_id',
      productId,
    )
    .eq(
      'reference_id',
      referenceId,
    )
    .eq(
      'reference_type',
      'inventory_count',
    )
    .limit(1)

  if (
    existingMovementError
  ) {
    throw existingMovementError
  }

  if (
    existingMovement?.length
  ) {
    return tx.id
  }

  /*
   * Movement.
   */
  const {
    error:
      movementError,
  } = await supabase
    .from(
      'inventory_movements',
    )
    .insert({
      branch_id:
        branchId,

      business_id:
        businessId,

      product_id:
        productId,

      user_id:
        context.operatorUserId,

      quantity:
        variance,

      balance_after:
        countedQuantity,

      movement_type:
        'adjustment',

      reference_id:
        referenceId,

      reference_type:
        'inventory_count',

      notes:
        toStringValue(
          payload.notes,
          'Mobile inventory reconciliation',
        ),

      created_at:
        timestamp,
    })

  if (movementError) {
    throw movementError
  }

  // The inventory movement trigger applies the variance and reconciles FIFO
  // layers atomically. Do not write the count snapshot a second time here.
  return tx.id
}

/* ============================================================
   SYNC STOCK RECEIVE
============================================================ */

async function syncStockReceive(
  supabase: SupabaseClient,
  tx: SyncTransaction,
  context: SyncContext,
): Promise<string> {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp,
    )

  const {
    branchId,
    businessId,
  } =
    await resolveBusinessBranch(
      supabase,
      payload,
      context,
    )

  const productId =
    toValidUuid(
      payload.product_id,
    )

  if (!productId) {
    throw new Error(
      'Invalid product_id for stock receive.',
    )
  }

  const quantity =
    toNumber(
      payload.quantity,
    )

  const unitCost =
    toNumber(
      payload.unit_cost,
    )

  if (
    quantity <= 0
  ) {
    throw new Error(
      'Stock receive quantity must be greater than zero.',
    )
  }

  if (
    unitCost < 0
  ) {
    throw new Error(
      'Stock receive unit cost cannot be negative.',
    )
  }

  const referenceId =
    toStringValue(
      payload.id,
      tx.id,
    )

  /*
   * Tenant-scoped idempotency.
   */
  const {
    data:
      existingMovement,
    error:
      existingMovementError,
  } = await supabase
    .from(
      'inventory_movements',
    )
    .select('id')
    .eq(
      'business_id',
      businessId,
    )
    .eq(
      'branch_id',
      branchId,
    )
    .eq(
      'product_id',
      productId,
    )
    .eq(
      'reference_id',
      referenceId,
    )
    .eq(
      'reference_type',
      'stock_receive',
    )
    .limit(1)

  if (
    existingMovementError
  ) {
    throw existingMovementError
  }

  if (
    existingMovement?.length
  ) {
    return tx.id
  }

  // Inserting this movement creates the receipt layer and increments the
  // inventory balance atomically in PostgreSQL.
  const {
    error:
      movementError,
  } = await supabase
    .from(
      'inventory_movements',
    )
    .insert({
      business_id:
        businessId,

      branch_id:
        branchId,

      product_id:
        productId,

      user_id:
        context.operatorUserId,

      movement_type:
        'purchase',

      quantity:
        quantity,

      unit_cost:
        unitCost,

      reference_id:
        referenceId,

      reference_type:
        'stock_receive',

      notes:
        toStringValue(
          payload.notes,
          'Stock received from inventory screen',
        ),

      created_at:
        timestamp,
    })

  if (movementError) {
    throw movementError
  }

  return tx.id
}

/* ============================================================
   PROCESS TRANSACTION
============================================================ */

async function processTransaction(
  supabase: SupabaseClient,
  tx: SyncTransaction,
  context: SyncContext,
): Promise<string> {
  if (
    !tx?.id ||
    !tx?.type
  ) {
    throw new Error(
      'Invalid transaction structure.',
    )
  }

  switch (tx.type) {
    case 'sale':
      return syncSale(
        supabase,
        tx,
        context,
      )

    case 'inventory_count':
      return syncInventoryCount(
        supabase,
        tx,
        context,
      )

    case 'inventory_receive':
      return syncStockReceive(
        supabase,
        tx,
        context,
      )

    default:
      throw new Error(
        `Unsupported transaction type: ${tx.type}`,
      )
  }
}

/* ============================================================
   POST /api/sync
============================================================ */

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient()

    /* ----------------------------------------------------------
       AUTH
    ---------------------------------------------------------- */

    const {
      data: {
        user,
      },
      error:
        authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        {
          status: 401,
        },
      )
    }

    /* ----------------------------------------------------------
       REQUEST BODY
    ---------------------------------------------------------- */

    let body: unknown

    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid JSON request body.',
        },
        {
          status: 400,
        },
      )
    }

    const bodyRecord =
      asRecord(body)

    const transactions =
      normalizeTransactions(
        bodyRecord.transactions,
      )

    /*
     * The original route accepts an empty
     * array as a successful no-op.
     */
    if (
      !Array.isArray(
        bodyRecord.transactions,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'transactions must be an array',
        },
        {
          status: 400,
        },
      )
    }

    if (
      transactions.length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        syncedIds: [],
        failedIds: [],
        errors: [],
        processed: 0,
        synced: 0,
        failed: 0,
      })
    }

    /*
     * Protect the endpoint from accidentally
     * receiving an enormous offline queue.
     */
    if (
      transactions.length >
      MAX_SYNC_TRANSACTIONS
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Too many transactions. Maximum is ${MAX_SYNC_TRANSACTIONS} per sync request.`,
        },
        {
          status: 413,
        },
      )
    }

    /*
     * Validate transaction IDs/types before
     * touching the database.
     */
    const malformed =
      transactions.find(
        (tx) =>
          !tx.id ||
          !tx.type ||
          ![
            'sale',
            'inventory_count',
            'inventory_receive',
          ].includes(
            tx.type,
          ),
      )

    if (malformed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'One or more transactions have an invalid structure.',
        },
        {
          status: 400,
        },
      )
    }

    /* ----------------------------------------------------------
       AUTHENTICATED TENANT CONTEXT
    ---------------------------------------------------------- */

    const context =
      await resolveSyncContext(
        supabase,
        user.id,
      )

    /* ----------------------------------------------------------
       DEDUPLICATE QUEUE IDS
    ---------------------------------------------------------- */

    const uniqueTransactions =
      Array.from(
        new Map(
          transactions.map(
            (tx) => [
              tx.id,
              tx,
            ],
          ),
        ).values(),
      )

    /* ----------------------------------------------------------
       ORDER TRANSACTIONS
    ---------------------------------------------------------- */

    const orderedTransactions =
      uniqueTransactions.sort(
        (a, b) => {
          const timeA =
            new Date(
              a.timestamp,
            ).getTime()

          const timeB =
            new Date(
              b.timestamp,
            ).getTime()

          const safeA =
            Number.isFinite(
              timeA,
            )
              ? timeA
              : 0

          const safeB =
            Number.isFinite(
              timeB,
            )
              ? timeB
              : 0

          return (
            safeA - safeB
          )
        },
      )

    /* ----------------------------------------------------------
       PROCESSING ARRAYS
    ---------------------------------------------------------- */

    const syncedIds: string[] =
      []

    const failedIds: string[] =
      []

    const errors: SyncError[] =
      []

    /* ----------------------------------------------------------
       PROCESS SEQUENTIALLY
    ---------------------------------------------------------- */

    /*
     * Do NOT change this to Promise.all().
     *
     * Offline transactions can modify the same
     * inventory records. Sequential processing keeps
     * the existing deterministic behavior.
     */

    for (
      const tx of
        orderedTransactions
    ) {
      try {
        const syncedId =
          await processTransaction(
            supabase,
            tx,
            context,
          )

        syncedIds.push(
          syncedId,
        )
      } catch (error) {
        const message =
          getErrorMessage(
            error,
          )

        console.error(
          `[SYNC FAILURE] ${tx.id}:`,
          error,
        )

        failedIds.push(
          tx.id,
        )

        errors.push({
          id: tx.id,
          message,
        })
      }
    }

    /* ----------------------------------------------------------
       RESPONSE
    ---------------------------------------------------------- */

    return NextResponse.json({
      success:
        failedIds.length ===
        0,

      syncedIds,

      failedIds,

      errors,

      /*
       * Report the actual unique queue
       * entries processed.
       */
      processed:
        orderedTransactions.length,

      synced:
        syncedIds.length,

      failed:
        failedIds.length,
    })
  } catch (error) {
    console.error(
      '[SYNC ROUTE CRITICAL ERROR]',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Internal synchronization failure.',
      },
      {
        status: 500,
      },
    )
  }
}

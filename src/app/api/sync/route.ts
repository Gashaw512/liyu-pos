// src/app/api/sync/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// TYPES
// ============================================================

interface SyncContext {
  mainBranchId: string | null
  activeBusinessId: string | null
  operatorUserId: string
}

interface SyncTransaction {
  id: string
  type:
    | 'sale'
    | 'inventory_count'
    | 'inventory_receive'
  timestamp: number | string
  payload: any
}

interface InventoryChange {
  inventoryId: string
  previousQuantity: number
  newQuantity: number
  movementId: string | null
}

// ============================================================
// SALE PROCESSING LOCK
// ============================================================
//
// This prevents the same sale from being processed concurrently
// by multiple requests handled by the same Next.js server instance.
//
// The database movement check below remains the persistent
// idempotency check.
//
// No database changes are required.
//

const processingSales = new Map<
  string,
  Promise<string>
>()

async function withSaleLock<T>(
  saleId: string,
  operation: () => Promise<T>
): Promise<T> {
  const existingLock =
    processingSales.get(saleId)

  if (existingLock) {
    await existingLock

    return operation()
  }

  let resolveLock:
    | (() => void)
    | undefined

  const lockPromise =
    new Promise<string>(resolve => {
      resolveLock = () => resolve(saleId)
    })

  processingSales.set(
    saleId,
    lockPromise
  )

  try {
    return await operation()
  } finally {
    resolveLock?.()

    if (
      processingSales.get(saleId) ===
      lockPromise
    ) {
      processingSales.delete(saleId)
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toValidUuid(
  id: string | null | undefined,
  fallback: string | null = null
): string | null {
  if (!id) {
    return fallback
  }

  return UUID_REGEX.test(id)
    ? id
    : fallback
}

function toNumber(
  value: unknown
): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

function normalizeTimestamp(
  timestamp: string | number
): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }

  return date.toISOString()
}

// ============================================================
// RESOLVE SYSTEM CONTEXT
// ============================================================

async function resolveSyncContext(
  supabase: any,
  userId: string
): Promise<SyncContext> {
  const [
    branchResult,
    businessResult,
  ] = await Promise.all([
    supabase
      .from('branches')
      .select('id')
      .eq('is_main', true)
      .limit(1)
      .maybeSingle(),

    supabase
      .from('businesses')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ])

  let businessId =
    businessResult.data?.id ?? null

  if (!businessId) {
    const fallback =
      await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .maybeSingle()

    businessId =
      fallback.data?.id ?? null
  }

  return {
    mainBranchId:
      branchResult.data?.id ?? null,

    activeBusinessId:
      businessId,

    operatorUserId:
      userId,
  }
}

// ============================================================
// RESOLVE BUSINESS / BRANCH
// ============================================================

function resolveBusinessBranch(
  payload: any,
  context: SyncContext
) {
  const branchId =
    payload.branch_id ===
    'branch_main'
      ? context.mainBranchId
      : toValidUuid(
          payload.branch_id
        )

  const businessId =
    payload.business_id ===
    'biz_active'
      ? context.activeBusinessId
      : toValidUuid(
          payload.business_id
        )

  if (!branchId) {
    throw new Error(
      'Unable to resolve branch_id.'
    )
  }

  if (!businessId) {
    throw new Error(
      'Unable to resolve business_id.'
    )
  }

  return {
    branchId,
    businessId,
  }
}

// ============================================================
// RESOLVE SALE REFERENCES
// ============================================================

function resolveSaleReferences(
  payload: any,
  context: SyncContext
) {
  const {
    branchId,
    businessId,
  } =
    resolveBusinessBranch(
      payload,
      context
    )

  const cashierId =
    toValidUuid(
      payload.cashier_id,
      context.operatorUserId
    )

  const shiftId =
    toValidUuid(
      payload.shift_id
    )

  return {
    branchId,
    businessId,
    cashierId,
    shiftId,
  }
}

// ============================================================
// BUILD SALE
// ============================================================

function buildSaleRecord(
  payload: any,
  context: SyncContext,
  timestamp: string
) {
  const {
    branchId,
    businessId,
    cashierId,
    shiftId,
  } =
    resolveSaleReferences(
      payload,
      context
    )

  if (!payload.id) {
    throw new Error(
      'Sale id is required.'
    )
  }

  return {
    id:
      payload.id,

    offline_id:
      payload.offline_id ??
      payload.id,

    branch_id:
      branchId,

    business_id:
      businessId,

    cashier_id:
      cashierId,

    shift_id:
      shiftId,

    receipt_number:
      payload.receipt_number ??
      `REC-${Date.now()
        .toString()
        .slice(-6)}`,

    subtotal:
      toNumber(
        payload.subtotal
      ),

    discount_amount:
      toNumber(
        payload.discount_amount
      ),

    tax_amount:
      toNumber(
        payload.tax_amount
      ),

    tip_amount:
      toNumber(
        payload.tip_amount
      ),

    total_amount:
      toNumber(
        payload.total_amount
      ),

    table_name:
      payload.table_number ??
      null,

    status:
      payload.status ??
      'completed',

    is_offline_sync:
      true,

    created_at:
      timestamp,
  }
}

// ============================================================
// BUILD SALE ITEMS
// ============================================================

function buildSaleItems(
  items: any[],
  saleId: string
) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter(
      item =>
        item?.product_id &&
        toNumber(
          item.quantity
        ) > 0
    )
    .map(item => ({
      sale_id:
        saleId,

      product_id:
        item.product_id,

      product_name:
        item.product_name ??
        'Item',

      quantity:
        toNumber(
          item.quantity
        ),

      unit_price:
        toNumber(
          item.unit_price
        ),

      cost_price:
        toNumber(
          item.cost_price
        ),
    }))
}

// ============================================================
// BUILD PAYMENTS
// ============================================================

function buildPayments(
  payments: any[],
  saleId: string,
  businessId: string,
  timestamp: string
) {
  if (!Array.isArray(payments)) {
    return []
  }

  return payments
    .filter(
      payment =>
        toNumber(
          payment.amount
        ) > 0
    )
    .map(payment => ({
      sale_id:
        saleId,

      business_id:
        businessId,

      amount:
        toNumber(
          payment.amount
        ),

      method:
        payment.method ??
        'cash',

      status:
        'completed',

      created_at:
        timestamp,
    }))
}

// ============================================================
// CHECK SALE INVENTORY MOVEMENT
// ============================================================

async function hasSaleInventoryMovement(
  supabase: any,
  saleId: string
): Promise<boolean> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_movements'
      )
      .select('id')
      .eq(
        'reference_id',
        saleId
      )
      .eq(
        'reference_type',
        'sale'
      )
      .limit(1)

  if (error) {
    throw error
  }

  return Boolean(
    data?.length
  )
}

// ============================================================
// ROLLBACK SALE INVENTORY CHANGES
// ============================================================
//
// If inventory was changed but a later operation failed,
// restore the quantities changed by this particular request
// and remove movement records created by this request.
//
// This is application-level compensation because we are not
// using a database transaction.
//

async function rollbackSaleInventory(
  supabase: any,
  changes: InventoryChange[]
) {
  if (
    changes.length === 0
  ) {
    return
  }

  console.warn(
    '[SYNC] Rolling back sale inventory changes:',
    changes
  )

  for (
    const change of [
      ...changes,
    ].reverse()
  ) {
    try {
      const {
        error: restoreError,
      } =
        await supabase
          .from('inventory')
          .update({
            quantity:
              change.previousQuantity,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            change.inventoryId
          )

      if (restoreError) {
        console.error(
          '[SYNC] Failed to restore inventory:',
          restoreError
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
              'inventory_movements'
            )
            .delete()
            .eq(
              'id',
              change.movementId
            )

        if (
          movementDeleteError
        ) {
          console.error(
            '[SYNC] Failed to remove rollback movement:',
            movementDeleteError
          )
        }
      }
    } catch (error) {
      console.error(
        '[SYNC] Inventory rollback error:',
        error
      )
    }
  }
}

// ============================================================
// INVENTORY DEDUCTION FOR SALE
// ============================================================

async function deductInventoryForSale(
  supabase: any,
  sale: any,
  items: any[],
  timestamp: string,
  userId: string
) {
  const changes: InventoryChange[] =
    []

  try {
    for (
      const item of items
    ) {
      const quantitySold =
        toNumber(
          item.quantity
        )

      if (
        !item.product_id ||
        quantitySold <= 0
      ) {
        continue
      }

      // ------------------------------------------------------
      // FIND INVENTORY
      // ------------------------------------------------------

      const {
        data: inventory,
        error:
          inventoryError,
      } =
        await supabase
          .from('inventory')
          .select(`
            id,
            quantity
          `)
          .eq(
            'business_id',
            sale.business_id
          )
          .eq(
            'branch_id',
            sale.branch_id
          )
          .eq(
            'product_id',
            item.product_id
          )
          .maybeSingle()

      if (inventoryError) {
        throw inventoryError
      }

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product ${item.product_id}`
        )
      }

      // ------------------------------------------------------
      // CALCULATE
      // ------------------------------------------------------

      const currentQuantity =
        toNumber(
          inventory.quantity
        )

      const newQuantity =
        currentQuantity -
        quantitySold

      // ------------------------------------------------------
      // UPDATE INVENTORY
      // ------------------------------------------------------

      const {
        error:
          updateError,
      } =
        await supabase
          .from('inventory')
          .update({
            quantity:
              newQuantity,

            updated_at:
              timestamp,
          })
          .eq(
            'id',
            inventory.id
          )

      if (updateError) {
        throw updateError
      }

      // Track this change immediately so it can be
      // compensated if a later item fails.
      const change: InventoryChange =
        {
          inventoryId:
            inventory.id,

          previousQuantity:
            currentQuantity,

          newQuantity:
            newQuantity,

          movementId:
            null,
        }

      changes.push(change)

      // ------------------------------------------------------
      // INVENTORY MOVEMENT
      // ------------------------------------------------------

      const {
        data:
          movement,
        error:
          movementError,
      } =
        await supabase
          .from(
            'inventory_movements'
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
                item.cost_price
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
      changes
    )

    throw error
  }
}

// ============================================================
// SYNC SALE
// ============================================================

async function syncSale(
  supabase: any,
  tx: SyncTransaction,
  context: SyncContext
) {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp
    )

  const sale =
    buildSaleRecord(
      payload,
      context,
      timestamp
    )

  return withSaleLock(
    sale.id,
    async () => {
      // ======================================================
      // FIRST IDEMPOTENCY CHECK
      // ======================================================
      //
      // If the inventory movement already exists, the server
      // has already applied this sale.
      //
      // IMPORTANT:
      // We return success without touching inventory again.
      //

      const alreadyProcessed =
        await hasSaleInventoryMovement(
          supabase,
          sale.id
        )

      if (
        alreadyProcessed
      ) {
        console.log(
          `[SYNC] Sale ${sale.id} already processed. Skipping inventory deduction.`
        )

        return sale.id
      }

      // ======================================================
      // BUILD ITEMS / PAYMENTS
      // ======================================================

      const items =
        buildSaleItems(
          payload.items,
          sale.id
        )

      const payments =
        buildPayments(
          payload.payments,
          sale.id,
          sale.business_id,
          timestamp
        )

      if (
        items.length === 0
      ) {
        throw new Error(
          `Sale ${sale.id} contains no valid sale items.`
        )
      }

      // ======================================================
      // SALE
      // ======================================================

      const {
        data: existingSale,
        error:
          existingSaleError,
      } =
        await supabase
          .from('sales')
          .select('id')
          .eq(
            'id',
            sale.id
          )
          .maybeSingle()

      if (existingSaleError) {
        throw existingSaleError
      }

      if (!existingSale) {
        const {
          error:
            saleError,
        } =
          await supabase
            .from('sales')
            .insert(sale)

        if (saleError) {
          throw saleError
        }
      }

      // ======================================================
      // SALE ITEMS
      // ======================================================

      if (
        items.length > 0
      ) {
        const {
          data:
            existingItems,
          error:
            existingItemsError,
        } =
          await supabase
            .from(
              'sale_items'
            )
            .select('id')
            .eq(
              'sale_id',
              sale.id
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
            error:
              itemsError,
          } =
            await supabase
              .from(
                'sale_items'
              )
              .insert(items)

          if (itemsError) {
            throw itemsError
          }
        }
      }

      // ======================================================
      // PAYMENTS
      // ======================================================

      if (
        payments.length > 0
      ) {
        const {
          data:
            existingPayments,
          error:
            existingPaymentsError,
        } =
          await supabase
            .from(
              'payments'
            )
            .select(
              'sale_id'
            )
            .eq(
              'sale_id',
              sale.id
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
          } =
            await supabase
              .from(
                'payments'
              )
              .insert(
                payments
              )

          if (paymentsError) {
            throw paymentsError
          }
        }
      }

      // ======================================================
      // SECOND IDEMPOTENCY CHECK
      // ======================================================
      //
      // We check again immediately before changing inventory.
      // This protects us if something else completed this sale
      // while the sale records were being prepared.
      //

      const processedBeforeDeduction =
        await hasSaleInventoryMovement(
          supabase,
          sale.id
        )

      if (
        processedBeforeDeduction
      ) {
        console.log(
          `[SYNC] Sale ${sale.id} was processed before inventory deduction. Skipping.`
        )

        return sale.id
      }

      // ======================================================
      // DEDUCT SERVER INVENTORY
      // ======================================================
      //
      // This is NOT a second deduction from IndexedDB.
      //
      // IndexedDB was already updated locally.
      // This updates the authoritative Supabase inventory.
      //

      await deductInventoryForSale(
        supabase,
        sale,
        items,
        timestamp,
        context.operatorUserId
      )

      // ======================================================
      // FINAL VERIFICATION
      // ======================================================

      const processedAfterDeduction =
        await hasSaleInventoryMovement(
          supabase,
          sale.id
        )

      if (
        !processedAfterDeduction
      ) {
        throw new Error(
          `Sale ${sale.id} inventory movement could not be confirmed.`
        )
      }

      console.log(
        `[SYNC] Sale ${sale.id} synchronized successfully.`
      )

      return sale.id
    }
  )
}

// ============================================================
// SYNC INVENTORY COUNT
// ============================================================

async function syncInventoryCount(
  supabase: any,
  tx: SyncTransaction,
  context: SyncContext
) {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp
    )

  const {
    branchId,
    businessId,
  } =
    resolveBusinessBranch(
      payload,
      context
    )

  const systemQuantity =
    toNumber(
      payload.system_quantity
    )

  const countedQuantity =
    toNumber(
      payload.counted_quantity
    )

  const variance =
    countedQuantity -
    systemQuantity

  const referenceId =
    payload.id ??
    tx.id

  // ==========================================================
  // IDEMPOTENCY
  // ==========================================================

  const {
    data:
      existingMovement,
    error:
      existingMovementError,
  } =
    await supabase
      .from(
        'inventory_movements'
      )
      .select('id')
      .eq(
        'reference_id',
        referenceId
      )
      .eq(
        'reference_type',
        'inventory_count'
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

  // ==========================================================
  // MOVEMENT
  // ==========================================================

  const {
    error:
      movementError,
  } =
    await supabase
      .from(
        'inventory_movements'
      )
      .insert({
        branch_id:
          branchId,

        business_id:
          businessId,

        product_id:
          payload.product_id,

        user_id:
          context.operatorUserId,

        quantity:
          variance,

        movement_type:
          'adjustment',

        reference_id:
          referenceId,

        reference_type:
          'inventory_count',

        notes:
          payload.notes ??
          'Mobile inventory reconciliation',

        created_at:
          timestamp,
      })

  if (movementError) {
    throw movementError
  }

  // ==========================================================
  // INVENTORY
  // ==========================================================

  const {
    error:
      inventoryError,
  } =
    await supabase
      .from('inventory')
      .upsert(
        {
          branch_id:
            branchId,

          business_id:
            businessId,

          product_id:
            payload.product_id,

          quantity:
            countedQuantity,

          updated_at:
            timestamp,
        },
        {
          onConflict:
            'branch_id,product_id',
        }
      )

  if (inventoryError) {
    throw inventoryError
  }

  return tx.id
}

// ============================================================
// SYNC STOCK RECEIVE
// ============================================================

async function syncStockReceive(
  supabase: any,
  tx: SyncTransaction,
  context: SyncContext
) {
  const payload =
    tx.payload

  const timestamp =
    normalizeTimestamp(
      tx.timestamp
    )

  const {
    branchId,
    businessId,
  } =
    resolveBusinessBranch(
      payload,
      context
    )

  const productId =
    toValidUuid(
      payload.product_id
    )

  if (!productId) {
    throw new Error(
      'Invalid product_id for stock receive.'
    )
  }

  const quantity =
    toNumber(
      payload.quantity
    )

  const unitCost =
    toNumber(
      payload.unit_cost
    )

  if (
    quantity <= 0
  ) {
    throw new Error(
      'Stock receive quantity must be greater than zero.'
    )
  }

  if (
    unitCost < 0
  ) {
    throw new Error(
      'Stock receive unit cost cannot be negative.'
    )
  }

  const referenceId =
    payload.id ??
    tx.id

  // ==========================================================
  // IDEMPOTENCY
  // ==========================================================

  const {
    data:
      existingMovement,
    error:
      existingMovementError,
  } =
    await supabase
      .from(
        'inventory_movements'
      )
      .select('id')
      .eq(
        'reference_id',
        referenceId
      )
      .eq(
        'reference_type',
        'stock_receive'
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

  // ==========================================================
  // FIND INVENTORY
  // ==========================================================

  const {
    data: inventory,
    error:
      inventoryError,
  } =
    await supabase
      .from('inventory')
      .select(`
        id,
        quantity
      `)
      .eq(
        'business_id',
        businessId
      )
      .eq(
        'branch_id',
        branchId
      )
      .eq(
        'product_id',
        productId
      )
      .maybeSingle()

  if (inventoryError) {
    throw inventoryError
  }

  // ==========================================================
  // CALCULATE NEW STOCK
  // ==========================================================

  const currentQuantity =
    toNumber(
      inventory?.quantity
    )

  const newQuantity =
    currentQuantity +
    quantity

  // ==========================================================
  // UPDATE / CREATE INVENTORY
  // ==========================================================

  if (inventory) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from('inventory')
        .update({
          quantity:
            newQuantity,

          updated_at:
            timestamp,
        })
        .eq(
          'id',
          inventory.id
        )

    if (updateError) {
      throw updateError
    }
  } else {
    const {
      error:
        insertError,
    } =
      await supabase
        .from('inventory')
        .insert({
          business_id:
            businessId,

          branch_id:
            branchId,

          product_id:
            productId,

          quantity:
            quantity,

          updated_at:
            timestamp,
        })

    if (insertError) {
      throw insertError
    }
  }

  // ==========================================================
  // INVENTORY MOVEMENT
  // ==========================================================

  const {
    error:
      movementError,
  } =
    await supabase
      .from(
        'inventory_movements'
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
          payload.notes ??
          'Stock received from inventory screen',

        created_at:
          timestamp,
      })

  if (movementError) {
    throw movementError
  }

  return tx.id
}

// ============================================================
// PROCESS TRANSACTION
// ============================================================

async function processTransaction(
  supabase: any,
  tx: SyncTransaction,
  context: SyncContext
) {
  if (
    !tx?.id ||
    !tx?.type
  ) {
    throw new Error(
      'Invalid transaction structure.'
    )
  }

  switch (tx.type) {
    case 'sale':
      return syncSale(
        supabase,
        tx,
        context
      )

    case 'inventory_count':
      return syncInventoryCount(
        supabase,
        tx,
        context
      )

    case 'inventory_receive':
      return syncStockReceive(
        supabase,
        tx,
        context
      )

    default:
      throw new Error(
        `Unsupported transaction type: ${tx.type}`
      )
  }
}

// ============================================================
// POST /api/sync
// ============================================================

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient()

    // ========================================================
    // AUTH
    // ========================================================

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            'Unauthorized',
        },
        {
          status: 401,
        }
      )
    }

    // ========================================================
    // BODY
    // ========================================================

    const body =
      await request.json()

    const transactions =
      body?.transactions

    if (
      !Array.isArray(
        transactions
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
        }
      )
    }

    if (
      transactions.length === 0
    ) {
      return NextResponse.json({
        success: true,

        syncedIds: [],

        failedIds: [],

        errors: [],
      })
    }

    // ========================================================
    // CONTEXT
    // ========================================================

    const context =
      await resolveSyncContext(
        supabase,
        user.id
      )

    // ========================================================
    // PROCESSING ARRAYS
    // ========================================================

    const syncedIds: string[] =
      []

    const failedIds: string[] =
      []

    const errors: {
      id: string
      message: string
    }[] = []

    // ========================================================
    // ORDER TRANSACTIONS
    // ========================================================

    const orderedTransactions =
      [...transactions].sort(
        (a, b) => {
          const timeA =
            new Date(
              a.timestamp
            ).getTime()

          const timeB =
            new Date(
              b.timestamp
            ).getTime()

          return (
            timeA - timeB
          )
        }
      )

    // ========================================================
    // PROCESS SEQUENTIALLY
    // ========================================================
    //
    // Keeping this sequential is intentional.
    //
    // It avoids concurrent processing of transactions within
    // the same sync request and makes inventory changes
    // deterministic.
    //

    for (
      const tx of
        orderedTransactions
    ) {
      try {
        const syncedId =
          await processTransaction(
            supabase,
            tx,
            context
          )

        syncedIds.push(
          syncedId
        )
      } catch (
        error: any
      ) {
        const message =
          error?.message ??
          'Unknown synchronization error.'

        console.error(
          `[SYNC FAILURE] ${tx?.id}:`,
          error
        )

        failedIds.push(
          tx?.id
        )

        errors.push({
          id:
            tx?.id,

          message,
        })
      }
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success:
        failedIds.length ===
        0,

      syncedIds,

      failedIds,

      errors,

      processed:
        transactions.length,

      synced:
        syncedIds.length,

      failed:
        failedIds.length,
    })
  } catch (
    error: any
  ) {
    console.error(
      '[SYNC ROUTE CRITICAL ERROR]',
      error
    )

    return NextResponse.json(
      {
        success: false,

        error:
          'Internal synchronization failure.',
      },
      {
        status: 500,
      }
    )
  }
}
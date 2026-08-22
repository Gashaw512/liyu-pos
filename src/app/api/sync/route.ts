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

// ============================================================
// HELPERS
// ============================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toValidUuid(
  id: string | null | undefined,
  fallback: string | null = null
): string | null {
  if (!id) return fallback

  return UUID_REGEX.test(id)
    ? id
    : fallback
}

function toNumber(value: unknown): number {
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
    payload.branch_id === 'branch_main'
      ? context.mainBranchId
      : toValidUuid(
          payload.branch_id
        )

  const businessId =
    payload.business_id === 'biz_active'
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
        item.product_id &&
        toNumber(item.quantity) > 0
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
        toNumber(payment.amount) > 0
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
// INVENTORY DEDUCTION FOR SALE
// ============================================================

async function deductInventoryForSale(
  supabase: any,
  sale: any,
  items: any[],
  timestamp: string,
  userId: string
) {
  for (const item of items) {
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

    const {
      data: inventory,
      error: inventoryError,
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

    const currentQuantity =
      toNumber(
        inventory.quantity
      )

    const newQuantity =
      currentQuantity -
      quantitySold

    const {
      error: updateError,
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

    const {
      error: movementError,
    } =
      await supabase
        .from('inventory_movements')
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

    if (movementError) {
      throw movementError
    }
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

  // ----------------------------------------------------------
  // SALE IDEMPOTENCY
  // ----------------------------------------------------------

  const {
    data: existingSale,
    error: existingSaleError,
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
      error: saleError,
    } =
      await supabase
        .from('sales')
        .insert(sale)

    if (saleError) {
      throw saleError
    }
  }

  // ----------------------------------------------------------
  // ITEMS
  // ----------------------------------------------------------

  if (items.length > 0) {
    const {
      data: existingItems,
      error: existingItemsError,
    } =
      await supabase
        .from('sale_items')
        .select('id')
        .eq(
          'sale_id',
          sale.id
        )
        .limit(1)

    if (existingItemsError) {
      throw existingItemsError
    }

    if (!existingItems?.length) {
      const {
        error: itemsError,
      } =
        await supabase
          .from('sale_items')
          .insert(items)

      if (itemsError) {
        throw itemsError
      }
    }
  }

  // ----------------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------------

  if (payments.length > 0) {
    const {
      data: existingPayments,
      error: existingPaymentsError,
    } =
      await supabase
        .from('payments')
        .select('sale_id')
        .eq(
          'sale_id',
          sale.id
        )
        .limit(1)

    if (existingPaymentsError) {
      throw existingPaymentsError
    }

    if (!existingPayments?.length) {
      const {
        error: paymentsError,
      } =
        await supabase
          .from('payments')
          .insert(payments)

      if (paymentsError) {
        throw paymentsError
      }
    }
  }

  // ----------------------------------------------------------
  // INVENTORY IDEMPOTENCY
  // ----------------------------------------------------------

  const {
    data: existingMovements,
    error: movementCheckError,
  } =
    await supabase
      .from('inventory_movements')
      .select('id')
      .eq(
        'reference_id',
        sale.id
      )
      .eq(
        'reference_type',
        'sale'
      )
      .limit(1)

  if (movementCheckError) {
    throw movementCheckError
  }

  if (!existingMovements?.length) {
    await deductInventoryForSale(
      supabase,
      sale,
      items,
      timestamp,
      context.operatorUserId
    )
  }

  return sale.id
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

  // ----------------------------------------------------------
  // IDEMPOTENCY
  // ----------------------------------------------------------

  const {
    data: existingMovement,
    error: existingMovementError,
  } =
    await supabase
      .from('inventory_movements')
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

  if (existingMovementError) {
    throw existingMovementError
  }

  if (existingMovement?.length) {
    return tx.id
  }

  // ----------------------------------------------------------
  // MOVEMENT
  // ----------------------------------------------------------

  const {
    error: movementError,
  } =
    await supabase
      .from('inventory_movements')
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

  // ----------------------------------------------------------
  // INVENTORY
  // ----------------------------------------------------------

  const {
    error: inventoryError,
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

  if (quantity <= 0) {
    throw new Error(
      'Stock receive quantity must be greater than zero.'
    )
  }

  if (unitCost < 0) {
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
    data: existingMovement,
    error: existingMovementError,
  } =
    await supabase
      .from('inventory_movements')
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

  if (existingMovementError) {
    throw existingMovementError
  }

  // Already processed.
  if (existingMovement?.length) {
    return tx.id
  }

  // ==========================================================
  // FIND INVENTORY
  // ==========================================================

  const {
    data: inventory,
    error: inventoryError,
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
      error: updateError,
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
      error: insertError,
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
    error: movementError,
  } =
    await supabase
      .from('inventory_movements')
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
    // PROCESS
    // ========================================================

    const syncedIds: string[] = []
    const failedIds: string[] = []

    const errors: {
      id: string
      message: string
    }[] = []

    const orderedTransactions =
      [...transactions]
        .sort(
          (a, b) =>
            new Date(
              a.timestamp
            ).getTime() -
            new Date(
              b.timestamp
            ).getTime()
        )

    for (
      const tx
      of orderedTransactions
    ) {
      try {
        if (
          !tx?.id ||
          !tx?.type
        ) {
          throw new Error(
            'Invalid transaction structure.'
          )
        }

        // ====================================================
        // SALE
        // ====================================================

        if (
          tx.type === 'sale'
        ) {
          const syncedId =
            await syncSale(
              supabase,
              tx,
              context
            )

          syncedIds.push(
            syncedId
          )
        }

        // ====================================================
        // INVENTORY COUNT
        // ====================================================

        else if (
          tx.type ===
          'inventory_count'
        ) {
          const syncedId =
            await syncInventoryCount(
              supabase,
              tx,
              context
            )

          syncedIds.push(
            syncedId
          )
        }

        // ====================================================
        // STOCK RECEIVE
        // ====================================================

else if (
  tx.type ===
  'inventory_receive'
) {
  const syncedId =
    await syncStockReceive(
      supabase,
      tx,
      context
    )

  syncedIds.push(
    syncedId
  )
}

        // ====================================================
        // UNKNOWN
        // ====================================================

        else {
          throw new Error(
            `Unsupported transaction type: ${tx.type}`
          )
        }
      } catch (
        error: any
      ) {
        const message =
          error?.message ??
          'Unknown synchronization error.'

        console.error(
          `[SYNC FAILURE] ${tx?.id}:`,
          message
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
        failedIds.length === 0,

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
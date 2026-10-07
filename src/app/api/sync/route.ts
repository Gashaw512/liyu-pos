// src/app/api/sync/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAssignedProfileRoles } from '@/lib/shift-reports/server'
import { verifyPriceProof } from '@/lib/security/price-proof'
import { calculateAuthoritativeSale } from '@/lib/sales/authoritative-sale'

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
  profileBranchId: string | null
  activeBusinessId: string
  operatorUserId: string
  operatorRoles: string[]
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
  table_id: string | null
  customer_name: string | null
  customer_phone: string | null
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
  discount: number
}

interface PaymentRecord {
  sale_id: string
  business_id: string
  amount: number
  method: string
  reference_no: string | null
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
      'business_id, branch_id, role',
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

  const operatorRoles = await getAssignedProfileRoles(
    supabase,
    userId,
    profile.role,
  )

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

  const profileBranchId =
    toValidUuid(profile.branch_id)

  const {
    data: profileBranch,
    error: profileBranchError,
  } = profileBranchId
    ? await supabase
        .from('branches')
        .select('id')
        .eq('id', profileBranchId)
        .eq('business_id', businessId)
        .maybeSingle()
    : { data: null, error: null }

  if (profileBranchError) {
    throw profileBranchError
  }

  return {
    mainBranchId:
      branch?.id ?? null,

    profileBranchId:
      profileBranch?.id ?? null,

    activeBusinessId:
      businessId,

    operatorUserId:
      userId,

    operatorRoles,
  }
}

/* ============================================================
   RESOLVE BUSINESS / BRANCH
============================================================ */

async function resolveBusinessBranch(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  context: SyncContext,
  options: {
    useAuthenticatedBusiness?: boolean
  } = {},
): Promise<{
  branchId: string
  businessId: string
}> {
  const requestedBusinessId = options.useAuthenticatedBusiness
    ? context.activeBusinessId
    : payload.business_id === 'biz_active'
      ? context.activeBusinessId
      : toValidUuid(payload.business_id)

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

    table_id: toValidUuid(payload.table_id),

    customer_name: toNullableString(payload.customer_name),
    customer_phone: toNullableString(payload.customer_phone),

    status: 'completed',

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
      discount: 0,
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

      reference_no: toNullableString(payment.reference_no),

      status: payment.method === 'credit' ? 'pending' : 'completed',

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
  let sale =
    await buildSaleRecord(
      supabase,
      payload,
      context,
      timestamp,
    )

  return withSaleLock(
    sale.id,
    async () => {
      let items =
        buildSaleItems(
          payload.items,
          sale.id,
        )

      let payments =
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
        .select('id,offline_id,branch_id,business_id,cashier_id,shift_id,receipt_number,subtotal,discount_amount,tax_amount,tip_amount,total_amount,table_name,table_id,customer_name,customer_phone,status,is_offline_sync,created_at')
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

      // Verify new/partially synced sale lines against the tenant's price
      // master. Signed catalog proofs preserve the exact price cached while
      // offline; manager-approved overrides are signed by the table-order API.
      // Existing completed lines are left untouched on idempotent retries.
      let needsPriceValidation = !existingSale
      if (existingSale) {
        const { data: savedLines, error: savedLinesError } = await supabase
          .from('sale_items')
          .select('id,sale_id,product_id,product_name,quantity,unit_price,cost_price,discount')
          .eq('sale_id', sale.id)
        if (savedLinesError) throw savedLinesError
        const { data: savedPayments, error: savedPaymentsError } = await supabase
          .from('payments')
          .select('id,sale_id,business_id,amount,method,reference_no,status,created_at')
          .eq('sale_id', sale.id)
        if (savedPaymentsError) throw savedPaymentsError
        const hasCompleteCommit = Boolean(savedLines?.length && savedPayments?.length)
        needsPriceValidation = !hasCompleteCommit
        if (hasCompleteCommit) {
          sale = { ...sale, ...existingSale }
          items = savedLines as SaleItemRecord[]
          payments = savedPayments as PaymentRecord[]
        }
      }

      const roomChargePayment = payments.find((payment) => payment.method === 'room_charge')
      if (roomChargePayment) {
        if (context.operatorRoles.length !== 1 || context.operatorRoles[0] !== 'cashier') {
          throw new Error('Only a cashier can charge a guest room.')
        }
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('is_hotel_integrated')
          .eq('id', sale.business_id)
          .maybeSingle()
        if (businessError) throw businessError
        if (!business?.is_hotel_integrated) throw new Error('Room charges are not enabled for this business.')
      }

      if (needsPriceValidation) {
        const submittedItems = Array.isArray(payload.items) ? payload.items.map(asRecord) : []
        const productIds = [...new Set(submittedItems.map((item) => toValidUuid(item.product_id)).filter((id): id is string => Boolean(id)))]
        if (submittedItems.some((item) => !toValidUuid(item.product_id)
          || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
          throw new Error('Sale contains an invalid product reference or quantity.')
        }

        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id,name,retail_price,cost_price,tax_inclusive')
          .eq('business_id', sale.business_id)
          .in('id', productIds)
          .eq('is_active', true)
          .is('deleted_at', null)
          .or(`branch_id.is.null,branch_id.eq.${sale.branch_id}`)
        if (productsError) throw productsError

        const productById = new Map((products ?? []).map((product) => [product.id, product]))
        const priceClaimsByProduct = new Map<string, ReturnType<typeof verifyPriceProof>>()
        const canOverride = context.operatorRoles.some((role) => role === 'owner' || role === 'manager')
        for (const [index, item] of submittedItems.entries()) {
          const productId = toValidUuid(item.product_id)
          if (!productId) throw new Error('Sale contains an invalid product reference.')
          const product = productById.get(productId)
          const price = Number(item.unit_price)
          if (!product || !Number.isFinite(price) || price < 0) {
            throw new Error('Sale contains a product or price that could not be verified.')
          }

          const priceCents = Math.round(price * 100)
          const currentPriceCents = Math.round(Number(product.retail_price) * 100)
          const signedPrice = verifyPriceProof(item.price_proof, {
            businessId: sale.business_id,
            branchId: sale.branch_id,
            productId,
            priceCents,
          })
          if (signedPrice) priceClaimsByProduct.set(productId, signedPrice)
          if (priceCents !== currentPriceCents && !signedPrice && !canOverride) {
            throw new Error('Sale price does not match a verified catalog price. Refresh the catalog or ask a manager.')
          }
          if (items[index]) items[index].unit_price = priceCents / 100
        }

        const { data: businessTax, error: taxError } = await supabase
          .from('businesses')
          .select('tax_rate')
          .eq('id', sale.business_id)
          .maybeSingle()
        if (taxError) throw taxError
        if (!businessTax) throw new Error('Business tax configuration could not be loaded.')

        const requestedDiscount = Number(payload.discount_amount ?? 0)
        const tip = Number(payload.tip_amount ?? 0)
        const signedTaxRates = submittedItems
          .map((item) => {
            const productId = toValidUuid(item.product_id)
            const claims = productId ? priceClaimsByProduct.get(productId) : null
            return claims?.taxRateBps == null ? null : claims.taxRateBps / 100
          })
          .filter((rate): rate is number => rate !== null)
        const uniqueSignedTaxRates = [...new Set(signedTaxRates)]
        const taxRatePercent = !canOverride && uniqueSignedTaxRates.length === 1
          && signedTaxRates.length === submittedItems.length
          ? uniqueSignedTaxRates[0]
          : Number(businessTax.tax_rate ?? 0)

        const authoritative = calculateAuthoritativeSale({
          items: items.map((item) => {
            const product = productById.get(item.product_id)
            if (!product) throw new Error(`Product ${item.product_id} is not active in this branch.`)
            return {
              productId: item.product_id,
              productName: toStringValue(product.name, item.product_name),
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxInclusive: priceClaimsByProduct.get(item.product_id)?.taxInclusive
                ?? product.tax_inclusive !== false,
            }
          }),
          taxRatePercent,
          requestedDiscount,
          tip,
          discountAuthorized: canOverride,
        })

        sale = {
          ...sale,
          subtotal: authoritative.subtotal,
          discount_amount: authoritative.discount,
          tax_amount: authoritative.tax,
          tip_amount: authoritative.tip,
          total_amount: authoritative.total,
        }
        items = items.map((item, index) => ({
          ...item,
          product_name: authoritative.items[index].productName,
          cost_price: Number(productById.get(item.product_id)?.cost_price ?? 0),
          discount: authoritative.items[index].discount,
        }))

        const submittedPayments = Array.isArray(payload.payments) ? payload.payments.map(asRecord) : []
        if (submittedPayments.some((payment) => !Number.isFinite(Number(payment.amount)) || Number(payment.amount) < 0)) {
          throw new Error('Sale contains an invalid payment amount.')
        }
        const allocatedPaymentTotal = submittedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        if (Math.abs(Math.round(allocatedPaymentTotal * 100) - Math.round(authoritative.total * 100)) > 0) {
          throw new Error('Payment amounts must equal the server-calculated sale total.')
        }
        const creditAmount = payments.reduce((sum, payment) => sum + (payment.method === 'credit' ? payment.amount : 0), 0)
        if (creditAmount > 0 && (!sale.customer_name?.trim() || !sale.customer_phone?.trim())) {
          throw new Error('Credit sales require a customer name and phone number.')
        }
      }

      // The DB function commits the sale, line-trigger FIFO allocation, and
      // payment rows in one transaction. It serializes duplicate sale IDs.
      const { error: commitError } = await supabase.rpc('commit_pos_sale', {
        p_sale: sale,
        p_items: items,
        p_payments: payments,
      })
      if (commitError) throw commitError

      // The KOT custody ledger is a sub-ledger of the branch inventory ledger.
      // Allocate sold quantities to ready, worker-attributed KOT lines.
      // The sale_items trigger already performed the single branch/FIFO deduction.
      // The database transaction locks the sale and ticket lines, so retries
      // cannot allocate the same prepared quantity twice.
      if (sale.table_id) {
        const { error: allocationError } = await supabase.rpc('allocate_ready_kot_lines_for_sale', {
          p_sale_id: sale.id,
          p_business_id: sale.business_id,
          p_branch_id: sale.branch_id,
          p_table_id: sale.table_id,
        })
        if (allocationError) throw allocationError
      }

      if (roomChargePayment) {
        const { error: folioError } = await supabase.rpc('post_room_charge_for_sale', {
          p_business_id: sale.business_id,
          p_branch_id: sale.branch_id,
          p_sale_id: sale.id,
          p_actor_id: context.operatorUserId,
        })
        if (folioError) throw folioError
      }

      const inventoryProcessed = await hasSaleInventoryMovement(
        supabase, sale.id, sale.business_id, sale.branch_id,
      )
      if (!inventoryProcessed) throw new Error(`Sale ${sale.id} inventory movement could not be confirmed.`)

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
      {
        ...payload,
        // Inventory reconciliation rows can outlive the branch context
        // that created them. Match the app's authenticated branch context
        // instead of retrying an obsolete queued branch ID indefinitely.
        branch_id:
          context.profileBranchId ??
          context.mainBranchId,
      },
      context,
      { useAuthenticatedBusiness: true },
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

  // Inventory counts can remain queued across an account refresh or a
  // business-context change. Treat the authenticated profile as the tenant,
  // then confirm the product belongs to that tenant before accepting the count.
  const {
    data: product,
    error: productError,
  } = await supabase
    .from('products')
    .select('id,branch_id')
    .eq('id', productId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (productError) {
    throw productError
  }

  if (!product) {
    throw new Error(
      'Inventory count product is not available in this business.',
    )
  }

  if (product.branch_id && product.branch_id !== branchId) {
    throw new Error(
      'Inventory count product is not available in this branch.',
    )
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

    // The queue has already been authenticated and each operation is checked
    // against this profile's tenant, branch, and role. Use the existing server
    // database client for the verified write path because sale sync also
    // records inventory deductions for cashiers under the inventory RLS rules.
    const syncDatabase =
      createAdminDatabaseClient() as unknown as SupabaseClient

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
        const canSyncTransaction = tx.type === 'sale'
          ? context.operatorRoles.some((role) => ['owner', 'manager', 'cashier', 'barman'].includes(role))
          : context.operatorRoles.some((role) => ['owner', 'manager', 'inventory_clerk'].includes(role))

        if (!canSyncTransaction) {
          throw new Error(
            tx.type === 'sale'
              ? 'This role cannot sync completed sales.'
              : 'This role cannot sync inventory changes.',
          )
        }

        const syncedId =
          await processTransaction(
            syncDatabase,
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

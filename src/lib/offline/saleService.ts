import { getDB } from './db'

export interface FinalizeSaleInput {
  splitPayments: {
    cash: number
    telebirr: number
    bank_transfer?: number
    selected_bank?: string
  }

  manualTip: string

  activeShift?: {
    real_database_id?: string | null
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
  }>

  totalBill: number
}

export async function finalizeSale(
  input: FinalizeSaleInput
) {
  const db = await getDB()

  const localId = crypto.randomUUID()
  const parsedTip = parseFloat(input.manualTip) || 0

  const subtotal = Number(input.totalBill)
  const totalAmount = subtotal + parsedTip

  /*
   * 1. Build the local sale.
   *
   * This is the source of truth for the offline-first checkout.
   */
  const pendingSale = {
    localId,

    createdAt: new Date().toISOString(),

    retryCount: 0,
    syncStatus: 'pending' as const,

    offline_id: localId,

    receipt_number:
      `REC-${Date.now().toString().substring(6)}`,

    shift_id:
      input.activeShift?.real_database_id ?? null,

    branch_id:
      input.activeShift?.branch_id ?? 'branch_main',

    cashier_id:
      input.activeShift?.cashier_id ?? 'cashier_default',

    business_id:
      input.activeShift?.business_id ?? 'biz_active',

    table_number:
      input.selectedTable?.name ?? 'Walk-in',

    total_amount: totalAmount,
    subtotal,

    tip_amount: parsedTip,

    discount_amount: 0,
    tax_amount: 0,

    status: 'completed' as const,
    payment_status: 'paid' as const,

    items: input.cart.map(item => ({
      product_id: item.id,
      product_name: item.name,

      quantity: item.quantity,

      unit_price: item.price,

      /*
       * Keep this because your reporting layer
       * already expects cost_price/gross_profit.
       *
       * Later this should come from the actual
       * inventory/product cost instead of 70%.
       */
      cost_price: item.price * 0.7,

      total_price:
        item.price * item.quantity,
    })),

    payments: [
      {
        method: 'cash',
        amount: Number(input.splitPayments.cash) || 0,
      },

      {
        method: 'telebirr',
        amount:
          Number(input.splitPayments.telebirr) || 0,
      },

      {
        method:
          input.splitPayments.selected_bank ||
          'bank_transfer',

        amount:
          Number(input.splitPayments.bank_transfer) || 0,
      },
    ].filter(payment => payment.amount > 0),
  }

  /*
   * 2. IMPORTANT:
   *
   * Save the sale FIRST.
   *
   * The receipt can therefore be displayed even
   * when there is no internet connection.
   */
  await db.put(
    'pending_sales',
    pendingSale as any
  )

  /*
   * 3. Deduct local inventory.
   *
   * This makes the next sale see the correct
   * remaining quantity while offline.
   */
  await deductLocalStock(
    db,
    input.cart
  )

  /*
   * 4. Close the table/tab locally.
   */
  if (
    input.selectedTable &&
    db.objectStoreNames.contains('open_tabs')
  ) {
    await db.delete(
      'open_tabs',
      input.selectedTable.id
    )
  }

  /*
   * 5. Return the locally-created sale.
   */
  return pendingSale
}


/**
 * Deduct stock from the local IndexedDB inventory.
 *
 * Example:
 *
 * Current stock = 10
 * Sold = 2
 * New local stock = 8
 */
async function deductLocalStock(
  db: Awaited<ReturnType<typeof getDB>>,
  cart: FinalizeSaleInput['cart']
) {
  const tx = db.transaction(
    'inventory',
    'readwrite'
  )

  const store = tx.objectStore('inventory')

  for (const item of cart) {
    const inventoryRecords =
      await store
        .index('by-product')
        .getAll(item.id)

    if (!inventoryRecords.length) {
      console.warn(
        `[Sale] No local inventory found for product ${item.id}`
      )

      continue
    }

    /*
     * Usually there should be one inventory
     * record for the current branch.
     *
     * For now use the first local record.
     */
    const inventory = inventoryRecords[0]

    const currentQuantity =
      Number(
        (inventory as any).quantity ?? 0
      )

    const newQuantity =
      currentQuantity - Number(item.quantity)

    ;(inventory as any).quantity =
      newQuantity

    await store.put(inventory)
  }

  await tx.done
}
// src/components/pos/posUtils.ts

import type {
  POSCartItem,
  POSCategory,
  POSProduct,
  POSTable,
} from './types'

// ============================================================
// CONSTANTS
// ============================================================

export const FALLBACK_TABLES = [
  'Table 1',
  'Table 2',
  'Table 3',
  'Table 4',
  'Table 5',
  'Table 6',
  'VIP Box',
] as const

export const DEFAULT_CASH_FLOAT = '0'

export const INVENTORY_REFRESH_EVENT =
  'liyu:inventory-updated'

export const INVENTORY_CHANNEL_NAME =
  'liyu-pos-inventory'

// ============================================================
// VALUE HELPERS
// ============================================================

export function normalizeString(
  value: unknown,
): string {
  return value == null
    ? ''
    : String(value)
}

export function normalizeNumber(
  value: unknown,
  fallback = 0,
): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

// ============================================================
// PRODUCT HELPERS
// ============================================================

export function normalizePOSProduct(
  product: any,
): POSProduct {
  return {
    id: normalizeString(product?.id),

    name:
      normalizeString(
        product?.name,
      ) || 'Unnamed Product',

    category_id:
      product?.category_id ??
      product?.categoryId ??
      null,

    retail_price: normalizeNumber(
      product?.retail_price ??
        product?.price ??
        0,
    ),

    image_url:
      product?.image_url ?? null,

    is_active:
      product?.is_active !== false,

    sku:
      product?.sku ?? null,
  }
}

export function normalizePOSProducts(
  rows: any[],
): POSProduct[] {
  return (rows ?? [])
    .map(normalizePOSProduct)
    .filter(
      (product) =>
        product.id.length > 0,
    )
}

// ============================================================
// CATEGORY HELPERS
// ============================================================

export function normalizePOSCategory(
  category: any,
): POSCategory {
  return {
    id: normalizeString(
      category?.id,
    ),

    name:
      normalizeString(
        category?.name ??
          category?.category_name ??
          'Category',
      ),

    sort_order: normalizeNumber(
      category?.sort_order ?? 0,
    ),

    is_active: true,
  }
}

export function normalizePOSCategories(
  rows: any[],
): POSCategory[] {
  return (rows ?? [])
    .filter(
      (category) =>
        category?.is_active !== false,
    )
    .map(normalizePOSCategory)
    .filter(
      (category) =>
        category.id.length > 0,
    )
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) -
        (b.sort_order ?? 0),
    )
}

// ============================================================
// TABLE HELPERS
// ============================================================

export function getTableNumber(
  table: POSTable,
): string {
  return normalizeString(
    table.table_number ??
      table.name,
  )
}

export function tabBelongsToTable(
  tab: unknown,
  table: POSTable,
): boolean {
  if (
    typeof tab !== 'object' ||
    tab === null
  ) {
    return false
  }

  const value = tab as {
    id?: unknown
    table_id?: unknown
    table_number?: unknown
  }

  const tableId = normalizeString(
    table.id,
  )

  const tableNumber =
    getTableNumber(table)

  const tabId = normalizeString(
    value.id,
  )

  const tabTableId =
    normalizeString(
      value.table_id,
    )

  const tabTableNumber =
    normalizeString(
      value.table_number,
    )

  const matchesTableId =
    tableId.length > 0 &&
    (
      tabId === tableId ||
      tabTableId === tableId
    )

  const matchesTableNumber =
    tableNumber.length > 0 &&
    tabTableNumber === tableNumber

  return (
    matchesTableId ||
    matchesTableNumber
  )
}

export function normalizePOSTables(
  rows: any[],
  openTabs: any[] = [],
): POSTable[] {
  return (rows ?? [])
    .map(
      (
        table: any,
        index: number,
      ): POSTable => {
        const id =
          normalizeString(
            table?.id ??
              table?.table_number ??
              `table_${index + 1}`,
          )

        const name =
          normalizeString(
            table?.name ??
              table?.table_number ??
              `Table ${index + 1}`,
          )

        const tableNumber =
          normalizeString(
            table?.table_number ??
              name,
          )

        const normalizedTable: POSTable = {
          id,
          name,
          table_number:
            tableNumber,
          has_open_tab:
            false,
        }

        return {
          ...normalizedTable,
          has_open_tab:
            openTabs.some(
              (tab: any) =>
                tabBelongsToTable(
                  tab,
                  normalizedTable,
                ),
            ),
        }
      },
    )
    .filter(
      (table) =>
        table.id.length > 0,
    )
}


export function createFallbackTables(
  openTabs: any[] = [],
): POSTable[] {
  return FALLBACK_TABLES.map(
    (name, index): POSTable => ({
      id: `fallback_${index + 1}`,
      name,
      table_number: name,
      has_open_tab:
        openTabs.some(
          (tab: any) =>
            normalizeString(
              tab?.table_number,
            ) === name,
        ),
    }),
  )
}


// ============================================================
// POS DATA LOADING
// ============================================================

export interface POSDataSnapshot {
  activeShift: any | null
  products: POSProduct[]
  categories: POSCategory[]
  tables: POSTable[]
}

export async function loadPOSDataFromDB(
  db: any,
): Promise<POSDataSnapshot> {
  // ----------------------------------------------------------
  // ACTIVE SHIFT
  // ----------------------------------------------------------

  const activeShift =
    (await db.get(
      'active_shift',
      'current',
    )) || null

  // ----------------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------------

  const productRows =
    await db.getAll('products')

  const products =
    normalizePOSProducts(
      productRows || [],
    )

  // ----------------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------------

  let categories: POSCategory[] = []

  if (
    db.objectStoreNames.contains(
      'categories',
    )
  ) {
    const categoryRows =
      await db.getAll(
        'categories',
      )

    categories =
      normalizePOSCategories(
        categoryRows || [],
      )
  }

  // ----------------------------------------------------------
  // OPEN TABLE TABS
  // ----------------------------------------------------------

  let openTabs: any[] = []

  if (
    db.objectStoreNames.contains(
      'open_tabs',
    )
  ) {
    openTabs =
      await db.getAll(
        'open_tabs',
      )
  }

  // ----------------------------------------------------------
  // TABLES
  // ----------------------------------------------------------

  let tables: POSTable[] = []

  if (
    db.objectStoreNames.contains(
      'tables',
    )
  ) {
    const tableRows =
      await db.getAll(
        'tables',
      )

    tables =
      normalizePOSTables(
        tableRows || [],
        openTabs,
      )
  }

  // ----------------------------------------------------------
  // FALLBACK TABLES
  // ----------------------------------------------------------

  if (tables.length === 0) {
    tables =
      createFallbackTables(
        openTabs,
      )
  }

  return {
    activeShift,
    products,
    categories,
    tables,
  }
}



// ============================================================
// OPEN TAB / CART RESTORATION
// ============================================================

export function restoreCartFromTab(
  tab: any,
): POSCartItem[] {
  if (
    !tab ||
    !Array.isArray(tab.items)
  ) {
    return []
  }

  return tab.items
    .map(
      (item: any): POSCartItem => ({
        id: normalizeString(
          item.product_id ??
            item.id,
        ),

        name: normalizeString(
          item.product_name ??
            item.name ??
            'Product',
        ),

        price: normalizeNumber(
          item.unit_price ??
            item.price ??
            0,
        ),

        quantity: normalizeNumber(
          item.quantity ??
            1,
        ),
      }),
    )
    .filter(
      (item: POSCartItem) =>
        item.id.length > 0 &&
        item.quantity > 0,
    )
}


// ============================================================
// OPEN TAB HELPERS
// ============================================================

export interface SaveTableTabInput {
  db: any
  table: POSTable
  cart: POSCartItem[]
  totalBill: number
}

export interface SaveTableTabResult {
  tabId: string
  snapshot: string
}

export async function saveTableTab(
  {
    db,
    table,
    cart,
    totalBill,
  }: SaveTableTabInput,
): Promise<SaveTableTabResult> {
  if (
    !db.objectStoreNames.contains(
      'open_tabs',
    )
  ) {
    throw new Error(
      'IndexedDB open_tabs store is not available.',
    )
  }

  const items = cart
    .map((item) => ({
      product_id:
        normalizeString(item.id),

      product_name:
        normalizeString(item.name),

      quantity:
        normalizeNumber(
          item.quantity,
        ),

      unit_price:
        normalizeNumber(
          item.price,
        ),
    }))
    .filter(
      (item) =>
        item.product_id.length > 0 &&
        item.quantity > 0,
    )

  if (items.length === 0) {
    throw new Error(
      'Cannot save an empty table order.',
    )
  }

  const allTabs =
    await db.getAll(
      'open_tabs',
    )

  const existingTab =
    allTabs.find(
      (tab: any) =>
        tabBelongsToTable(
          tab,
          table,
        ),
    )

  const now =
    new Date().toISOString()

  const tabId =
    existingTab?.id ??
    table.id

  const tab = {
    id: tabId,

    table_id:
      table.id,

    table_number:
      getTableNumber(table),

    items,

    total_accumulated:
      Number(totalBill),

    updated_at: now,
  }

  await db.put(
    'open_tabs',
    tab,
  )

  return {
    tabId,
    snapshot:
      serializeCart(cart),
  }
}

export async function removeOpenTabsForTable(
  db: any,
  table: POSTable,
): Promise<void> {
  if (
    !db.objectStoreNames.contains(
      'open_tabs',
    )
  ) {
    return
  }

  const allTabs =
    await db.getAll(
      'open_tabs',
    )

  const matchingTabs =
    allTabs.filter(
      (tab: any) =>
        tabBelongsToTable(
          tab,
          table,
        ),
    )

  for (
    const tab of matchingTabs
  ) {
    if (
      tab?.id != null
    ) {
      await db.delete(
        'open_tabs',
        tab.id,
      )
    }
  }
}

// ============================================================
// CART HELPERS
// ============================================================

// ============================================================
// CART HELPERS
// ============================================================

export function calculateCartTotal(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (total, item) =>
      total +
      normalizeNumber(item.price) *
        normalizeNumber(item.quantity),
    0,
  )
}

export function calculateCartItemCount(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (total, item) =>
      total +
      normalizeNumber(item.quantity),
    0,
  )
}

export function createCartQuantityMap(
  cart: POSCartItem[],
): Map<string, number> {
  const quantities =
    new Map<string, number>()

  for (const item of cart) {
    quantities.set(
      item.id,
      (quantities.get(item.id) ?? 0) +
        normalizeNumber(item.quantity),
    )
  }

  return quantities
}

/**
 * Add one product to the cart.
 *
 * Existing product:
 *   quantity + 1
 *
 * New product:
 *   quantity = 1
 */
export function addToCart(
  cart: POSCartItem[],
  product: POSProduct,
): POSCartItem[] {
  const price = normalizeNumber(
    product.retail_price,
  )

  const existingItem = cart.find(
    (item) => item.id === product.id,
  )

  if (existingItem) {
    return cart.map((item) =>
      item.id === product.id
        ? {
            ...item,
            quantity:
              normalizeNumber(
                item.quantity,
              ) + 1,
          }
        : item,
    )
  }

  return [
    ...cart,
    {
      id: product.id,
      name: product.name,
      price,
      quantity: 1,
    },
  ]
}

/**
 * Increase cart item quantity.
 */
export function increaseCartQuantity(
  cart: POSCartItem[],
  id: string,
  amount = 1,
): POSCartItem[] {
  if (amount <= 0) {
    return cart
  }

  return cart.map((item) =>
    item.id === id
      ? {
          ...item,
          quantity:
            normalizeNumber(
              item.quantity,
            ) + amount,
        }
      : item,
  )
}

/**
 * Decrease cart item quantity by one.
 *
 * Removes the item when quantity reaches zero.
 */
export function decreaseCartQuantity(
  cart: POSCartItem[],
  id: string,
): POSCartItem[] {
  return cart
    .map((item) =>
      item.id === id
        ? {
            ...item,
            quantity:
              normalizeNumber(
                item.quantity,
              ) - 1,
          }
        : item,
    )
    .filter(
      (item) =>
        normalizeNumber(
          item.quantity,
        ) > 0,
    )
}

/**
 * Remove a cart item completely.
 */
export function removeCartItem(
  cart: POSCartItem[],
  id: string,
): POSCartItem[] {
  return cart.filter(
    (item) => item.id !== id,
  )
}


/**
 * Creates a stable cart representation.
 *
 * Used to determine whether the current
 * table order has changed since it was saved.
 */
export function serializeCart(
  cart: POSCartItem[],
): string {
  return JSON.stringify(
    cart
      .map((item) => ({
        id: normalizeString(
          item.id,
        ),

        name: normalizeString(
          item.name,
        ),

        price: normalizeNumber(
          item.price,
        ),

        quantity: normalizeNumber(
          item.quantity,
        ),
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
  )
}

/**
 * Stable representation of an empty cart.
 */
export const EMPTY_CART_SNAPSHOT =
  serializeCart([])

// ============================================================
// PRODUCT FILTERING
// ============================================================

interface FilterProductsOptions {
  products: POSProduct[]
  categoryId: string
  search: string
}

export function filterPOSProducts({
  products,
  categoryId,
  search,
}: FilterProductsOptions): POSProduct[] {
  const normalizedSearch =
    search.trim().toLowerCase()

  return products.filter(
    (product) => {
      if (product.is_active === false) {
        return false
      }

      const matchesCategory =
        categoryId === 'all' ||
        String(
          product.category_id ?? '',
        ) === String(categoryId)

      if (!matchesCategory) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const name =
        normalizeString(
          product.name,
        ).toLowerCase()

      const sku =
        normalizeString(
          product.sku,
        ).toLowerCase()

      return (
        name.includes(
          normalizedSearch,
        ) ||
        sku.includes(
          normalizedSearch,
        )
      )
    },
  )
}

// ============================================================
// INVENTORY EVENTS
// ============================================================

export function notifyInventoryUpdated(
  saleId?: string,
): void {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  // Same browser / same tab
  window.dispatchEvent(
    new CustomEvent(
      INVENTORY_REFRESH_EVENT,
      {
        detail: {
          source: 'sale',
          saleId,
        },
      },
    ),
  )

  // Other browser tabs / windows
  if (
    typeof BroadcastChannel !==
    'undefined'
  ) {
    const channel =
      new BroadcastChannel(
        INVENTORY_CHANNEL_NAME,
      )

    channel.postMessage({
      type:
        INVENTORY_REFRESH_EVENT,
      source: 'sale',
      saleId,
    })

    channel.close()
  }
}
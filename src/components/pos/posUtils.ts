// src/components/pos/posUtils.ts

import type {
  POSCartItem,
  POSCategory,
  POSInventoryStatus,
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

/**
 * Normalizes the product's inventory tracking flag.
 *
 * The database field is:
 *   track_inventory
 *
 * Supports both real booleans and string values for
 * backwards/legacy compatibility.
 */
export function normalizeInventoryTracking(
  value: unknown,
): boolean | null {
  if (value === true || value === false) {
    return value
  }

  if (typeof value === 'string') {
    const normalized =
      value.trim().toLowerCase()

    if (
      normalized === 'true' ||
      normalized === '1'
    ) {
      return true
    }

    if (
      normalized === 'false' ||
      normalized === '0'
    ) {
      return false
    }
  }

  if (
    typeof value === 'number'
  ) {
    if (value === 1) {
      return true
    }

    if (value === 0) {
      return false
    }
  }

  return null
}

// ============================================================
// INVENTORY HELPERS
// ============================================================

/**
 * Determines the inventory status used by the POS UI.
 *
 * Inventory tracking and inventory quantity are separate
 * concepts.
 *
 * Rules:
 *
 * track_inventory === false
 *   -> not_tracked
 *
 * track_inventory === true + missing quantity
 *   -> inventory_issue
 *
 * quantity < 0
 *   -> inventory_issue
 *
 * quantity === 0
 *   -> out_of_stock
 *
 * quantity > 0 and <= lowStockAlert
 *   -> low_stock
 *
 * otherwise
 *   -> in_stock
 *
 * If the tracking flag is unknown, missing inventory is treated
 * as not_tracked for backwards compatibility.
 */
export function getPOSInventoryStatus(
  quantity: number | null | undefined,
  lowStockAlert: number | null | undefined,
  isInventoryTracked?: boolean | null,
): POSInventoryStatus {
  // ----------------------------------------------------------
  // Inventory tracking explicitly disabled.
  // ----------------------------------------------------------

  if (
    isInventoryTracked === false
  ) {
    return 'not_tracked'
  }

  // ----------------------------------------------------------
  // Missing inventory quantity.
  // ----------------------------------------------------------

  if (quantity == null) {
    return isInventoryTracked === true
      ? 'inventory_issue'
      : 'not_tracked'
  }

  const normalizedQuantity =
    Number(quantity)

  // ----------------------------------------------------------
  // Invalid quantity.
  // ----------------------------------------------------------

  if (
    !Number.isFinite(
      normalizedQuantity,
    )
  ) {
    return 'inventory_issue'
  }

  // ----------------------------------------------------------
  // Negative stock.
  //
  // Negative stock is allowed by the sale service but must
  // remain visibly flagged in the POS.
  // ----------------------------------------------------------

  if (
    normalizedQuantity < 0
  ) {
    return 'inventory_issue'
  }

  // ----------------------------------------------------------
  // Exactly zero.
  // ----------------------------------------------------------

  if (
    normalizedQuantity === 0
  ) {
    return 'out_of_stock'
  }

  // ----------------------------------------------------------
  // Low-stock threshold.
  // ----------------------------------------------------------

  const normalizedAlert =
    lowStockAlert == null
      ? 0
      : Number(lowStockAlert)

  if (
    Number.isFinite(
      normalizedAlert,
    ) &&
    normalizedAlert > 0 &&
    normalizedQuantity <=
      normalizedAlert
  ) {
    return 'low_stock'
  }

  // ----------------------------------------------------------
  // Healthy stock.
  // ----------------------------------------------------------

  return 'in_stock'
}

/**
 * Normalizes one inventory record into the fields needed
 * by the POS product.
 */
export function normalizePOSInventory(
  inventory: any,
): {
  id: string | null
  product_id: string
  branch_id: string | null
  quantity: number | null
} {
  const rawQuantity =
    inventory?.quantity

  let quantity: number | null = null

  if (
    rawQuantity != null
  ) {
    const parsedQuantity =
      Number(rawQuantity)

    quantity =
      Number.isFinite(
        parsedQuantity,
      )
        ? parsedQuantity
        : null
  }

  return {
    id:
      inventory?.id == null
        ? null
        : normalizeString(
            inventory.id,
          ).trim(),

    product_id:
      normalizeString(
        inventory?.product_id ??
          inventory?.productId,
      ).trim(),

    branch_id:
      inventory?.branch_id == null
        ? null
        : normalizeString(
            inventory.branch_id,
          ).trim(),

    quantity,
  }
}

/**
 * Finds the inventory record belonging to the active branch.
 *
 * Rules:
 *
 * 1. Exact active-branch match has highest priority.
 * 2. Multiple records for the same product and branch are
 *    considered ambiguous and are never guessed.
 * 3. If the active branch has no record, one branchless
 *    product-level record may be used.
 * 4. Without a branch, only one product-level record may be used.
 */
export function findProductInventory(
  inventoryRows: any[],
  productId: string,
  branchId?: string | null,
): any | null {
  const normalizedProductId =
    normalizeString(
      productId,
    ).trim()

  if (
    !normalizedProductId
  ) {
    return null
  }

  const candidates =
    (inventoryRows ?? []).filter(
      (inventory: any) => {
        const inventoryProductId =
          normalizeString(
            inventory?.product_id ??
              inventory?.productId,
          ).trim()

        return (
          inventoryProductId ===
          normalizedProductId
        )
      },
    )

  if (
    candidates.length === 0
  ) {
    return null
  }

  const normalizedBranchId =
    normalizeString(
      branchId,
    ).trim()

  // ----------------------------------------------------------
  // 1. Active branch supplied.
  // ----------------------------------------------------------

  if (
    normalizedBranchId
  ) {
    const branchMatches =
      candidates.filter(
        (inventory: any) => {
          const inventoryBranchId =
            normalizeString(
              inventory?.branch_id ??
                inventory?.branchId,
            ).trim()

          return (
            inventoryBranchId ===
            normalizedBranchId
          )
        },
      )

    if (
      branchMatches.length === 1
    ) {
      return branchMatches[0]
    }

    if (
      branchMatches.length > 1
    ) {
      console.error(
        '[POS] Ambiguous inventory records found for product and branch.',
        {
          productId:
            normalizedProductId,

          branchId:
            normalizedBranchId,

          matches:
            branchMatches,
        },
      )

      return null
    }

    // --------------------------------------------------------
    // Allow exactly one branchless record.
    // --------------------------------------------------------

    const branchlessMatches =
      candidates.filter(
        (inventory: any) => {
          const inventoryBranchId =
            normalizeString(
              inventory?.branch_id ??
                inventory?.branchId,
            ).trim()

          return !inventoryBranchId
        },
      )

    if (
      branchlessMatches.length === 1
    ) {
      return branchlessMatches[0]
    }

    if (
      branchlessMatches.length > 1
    ) {
      console.error(
        '[POS] Ambiguous branchless inventory records found.',
        {
          productId:
            normalizedProductId,

          matches:
            branchlessMatches,
        },
      )
    }

    return null
  }

  // ----------------------------------------------------------
  // 2. No active branch.
  // ----------------------------------------------------------

  if (
    candidates.length === 1
  ) {
    return candidates[0]
  }

  console.warn(
    '[POS] Multiple inventory records found without an active branch. Refusing to guess.',
    {
      productId:
        normalizedProductId,

      matches:
        candidates,
    },
  )

  return null
}

// ============================================================
// PRODUCT HELPERS
// ============================================================

/**
 * Normalizes a product from IndexedDB/database data.
 *
 * The authoritative database field for inventory tracking is:
 *
 *   track_inventory
 *
 * Inventory is deliberately not required for a product to
 * exist in the POS catalog.
 */
export function normalizePOSProduct(
  product: any,
): POSProduct {
  const inventoryQuantity =
    product?.inventory_quantity ??
    null

  const lowStockAlert =
    product?.low_stock_alert ??
    null

  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // Supabase / IndexedDB product field:
  //   track_inventory
  //
  // This is the source of truth.
  // ----------------------------------------------------------

  const isInventoryTracked =
    normalizeInventoryTracking(
      product?.track_inventory,
    )

  const normalizedProduct: POSProduct = {
    id:
      normalizeString(
        product?.id,
      ).trim(),

    name:
      normalizeString(
        product?.name,
      ).trim() ||
      'Unnamed Product',

    category_id:
      product?.category_id ??
      product?.categoryId ??
      null,

    retail_price:
      normalizeNumber(
        product?.retail_price ??
          product?.price ??
          0,
      ),

    image_url:
      product?.image_url ??
      null,

    is_active:
      product?.is_active !== false,

    sku:
      product?.sku ??
      null,

    // --------------------------------------------------------
    // Product inventory configuration.
    // --------------------------------------------------------

    is_inventory_tracked:
      isInventoryTracked,

    // --------------------------------------------------------
    // Inventory information.
    //
    // These values are replaced by mergeProductsWithInventory()
    // using the branch-specific inventory store.
    // --------------------------------------------------------

    inventory_id:
      product?.inventory_id ??
      null,

    inventory_quantity:
      inventoryQuantity == null
        ? null
        : normalizeNumber(
            inventoryQuantity,
          ),

    low_stock_alert:
      lowStockAlert == null
        ? null
        : normalizeNumber(
            lowStockAlert,
          ),

    inventory_status:
      getPOSInventoryStatus(
        inventoryQuantity,
        lowStockAlert,
        isInventoryTracked,
      ),
  }

  return normalizedProduct
}

export function normalizePOSProducts(
  rows: any[],
): POSProduct[] {
  return (rows ?? [])
    .map(
      normalizePOSProduct,
    )
    .filter(
      (product) =>
        product.id.length > 0,
    )
}

// ============================================================
// PRODUCT + INVENTORY MERGING
// ============================================================

/**
 * Combines the product catalog with branch-specific inventory.
 *
 * IMPORTANT:
 *
 * Product existence is independent from inventory existence.
 *
 * Inventory tracking:
 *
 *   false
 *     -> not_tracked
 *
 *   true + missing inventory
 *     -> inventory_issue
 *
 *   unknown + missing inventory
 *     -> not_tracked
 *
 * Existing inventory:
 *
 *   quantity > low-stock threshold
 *     -> in_stock
 *
 *   quantity > 0 and <= low-stock threshold
 *     -> low_stock
 *
 *   quantity === 0
 *     -> out_of_stock
 *
 *   quantity < 0
 *     -> inventory_issue
 */
export function mergeProductsWithInventory(
  products: POSProduct[],
  inventoryRows: any[],
  branchId?: string | null,
): POSProduct[] {
  return products.map(
    (product) => {
      // ------------------------------------------------------
      // Product is explicitly not inventory tracked.
      // ------------------------------------------------------

      if (
        product.is_inventory_tracked ===
        false
      ) {
        return {
          ...product,

          inventory_id:
            null,

          inventory_quantity:
            null,

          inventory_status:
            'not_tracked',
        }
      }

      // ------------------------------------------------------
      // Find inventory for the active branch.
      // ------------------------------------------------------

      const inventory =
        findProductInventory(
          inventoryRows,
          product.id,
          branchId,
        )

      // ------------------------------------------------------
      // No inventory record.
      // ------------------------------------------------------

      if (!inventory) {
        return {
          ...product,

          inventory_id:
            null,

          inventory_quantity:
            null,

          inventory_status:
            product.is_inventory_tracked ===
            true
              ? 'inventory_issue'
              : 'not_tracked',
        }
      }

      // ------------------------------------------------------
      // Normalize inventory.
      // ------------------------------------------------------

      const normalizedInventory =
        normalizePOSInventory(
          inventory,
        )

      const quantity =
        normalizedInventory.quantity

      const lowStockAlert =
        product.low_stock_alert

      return {
        ...product,

        inventory_id:
          normalizedInventory.id,

        inventory_quantity:
          quantity,

        inventory_status:
          getPOSInventoryStatus(
            quantity,
            lowStockAlert,
            product.is_inventory_tracked,
          ),
      }
    },
  )
}

// ============================================================
// CATEGORY HELPERS
// ============================================================

export function normalizePOSCategory(
  category: any,
): POSCategory {
  return {
    id:
      normalizeString(
        category?.id,
      ).trim(),

    name:
      normalizeString(
        category?.name ??
          category?.category_name ??
          'Category',
      ).trim(),

    sort_order:
      normalizeNumber(
        category?.sort_order ??
          0,
      ),

    is_active:
      category?.is_active !== false,
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
    .map(
      normalizePOSCategory,
    )
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
  ).trim()
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

  const tableId =
    normalizeString(
      table.id,
    ).trim()

  const tableNumber =
    getTableNumber(table)

  const tabId =
    normalizeString(
      value.id,
    ).trim()

  const tabTableId =
    normalizeString(
      value.table_id,
    ).trim()

  const tabTableNumber =
    normalizeString(
      value.table_number,
    ).trim()

  const matchesTableId =
    tableId.length > 0 &&
    (
      tabId === tableId ||
      tabTableId === tableId
    )

  const matchesTableNumber =
    tableNumber.length > 0 &&
    tabTableNumber ===
      tableNumber

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
          ).trim()

        const name =
          normalizeString(
            table?.name ??
              table?.table_number ??
              `Table ${index + 1}`,
          ).trim()

        const tableNumber =
          normalizeString(
            table?.table_number ??
              name,
          ).trim()

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
    (
      name,
      index,
    ): POSTable => ({
      id:
        `fallback_${index + 1}`,

      name,

      table_number:
        name,

      has_open_tab:
        openTabs.some(
          (tab: any) =>
            normalizeString(
              tab?.table_number,
            ).trim() ===
            name,
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

  const branchId =
    activeShift?.branch_id ??
    activeShift?.branchId ??
    null

  // ----------------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------------

  const productRows =
    await db.getAll(
      'products',
    )

  let products =
    normalizePOSProducts(
      productRows || [],
    )

  // ----------------------------------------------------------
  // INVENTORY
  // ----------------------------------------------------------

  if (
    db.objectStoreNames.contains(
      'inventory',
    )
  ) {
    const inventoryRows =
      await db.getAll(
        'inventory',
      )

    console.log(
      '[POS] Inventory context:',
      {
        branchId,

        productCount:
          products.length,

        inventoryCount:
          inventoryRows?.length ??
          0,
      },
    )

    products =
      mergeProductsWithInventory(
        products,
        inventoryRows || [],
        branchId,
      )
  } else {
    // --------------------------------------------------------
    // The inventory store itself does not exist.
    //
    // Products remain valid POS products. Their inventory
    // tracking state is preserved where known.
    // --------------------------------------------------------

    products =
      products.map(
        (product) => ({
          ...product,

          inventory_id:
            null,

          inventory_quantity:
            null,

          inventory_status:
            product.is_inventory_tracked ===
            true
              ? 'inventory_issue'
              : 'not_tracked',
        }),
      )
  }

  // ----------------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------------

  let categories:
    POSCategory[] = []

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

  let openTabs:
    any[] = []

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

  let tables:
    POSTable[] = []

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

  if (
    tables.length === 0
  ) {
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
      (
        item: any,
      ): POSCartItem => ({
        id:
          normalizeString(
            item.product_id ??
              item.id,
          ).trim(),

        name:
          normalizeString(
            item.product_name ??
              item.name ??
              'Product',
          ).trim(),

        price:
          normalizeNumber(
            item.unit_price ??
              item.price ??
              0,
          ),

        quantity:
          normalizeNumber(
            item.quantity ??
              1,
          ),
      }),
    )
    .filter(
      (
        item: POSCartItem,
      ) =>
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

  const items =
    cart
      .map((item) => ({
        product_id:
          normalizeString(
            item.id,
          ).trim(),

        product_name:
          normalizeString(
            item.name,
          ).trim(),

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
          item.product_id.length >
            0 &&
          item.quantity > 0,
      )

  if (
    items.length === 0
  ) {
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

    updated_at:
      now,
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

export function calculateCartTotal(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (
      total,
      item,
    ) =>
      total +
      normalizeNumber(
        item.price,
      ) *
        normalizeNumber(
          item.quantity,
        ),
    0,
  )
}

export function calculateCartItemCount(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (
      total,
      item,
    ) =>
      total +
      normalizeNumber(
        item.quantity,
      ),
    0,
  )
}

export function createCartQuantityMap(
  cart: POSCartItem[],
): Map<string, number> {
  const quantities =
    new Map<
      string,
      number
    >()

  for (
    const item of cart
  ) {
    quantities.set(
      item.id,
      (
        quantities.get(
          item.id,
        ) ?? 0
      ) +
        normalizeNumber(
          item.quantity,
        ),
    )
  }

  return quantities
}

/**
 * Adds one product to the cart.
 *
 * Inventory is intentionally not checked here.
 * Inventory validation and deduction belong to the
 * sale finalization layer.
 */
export function addToCart(
  cart: POSCartItem[],
  product: POSProduct,
): POSCartItem[] {
  const price =
    normalizeNumber(
      product.retail_price,
    )

  const existingItem =
    cart.find(
      (item) =>
        item.id ===
        product.id,
    )

  if (
    existingItem
  ) {
    return cart.map(
      (item) =>
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
      id:
        product.id,

      name:
        product.name,

      price,

      quantity: 1,
    },
  ]
}

/**
 * Increases cart item quantity.
 *
 * Inventory is intentionally not checked here.
 */
export function increaseCartQuantity(
  cart: POSCartItem[],
  id: string,
  amount = 1,
): POSCartItem[] {
  if (
    amount <= 0
  ) {
    return cart
  }

  return cart.map(
    (item) =>
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
 * Decreases cart item quantity by one.
 *
 * Removes the item when quantity reaches zero.
 */
export function decreaseCartQuantity(
  cart: POSCartItem[],
  id: string,
): POSCartItem[] {
  return cart
    .map(
      (item) =>
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
 * Removes a cart item completely.
 */
export function removeCartItem(
  cart: POSCartItem[],
  id: string,
): POSCartItem[] {
  return cart.filter(
    (item) =>
      item.id !== id,
  )
}

/**
 * Creates a stable cart representation.
 *
 * Used to determine whether the current table order
 * has changed since it was saved.
 */
export function serializeCart(
  cart: POSCartItem[],
): string {
  return JSON.stringify(
    cart
      .map(
        (item) => ({
          id:
            normalizeString(
              item.id,
            ).trim(),

          name:
            normalizeString(
              item.name,
            ).trim(),

          price:
            normalizeNumber(
              item.price,
            ),

          quantity:
            normalizeNumber(
              item.quantity,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id,
          ),
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

/**
 * Filters only catalog-level properties.
 *
 * Inventory status NEVER determines product visibility.
 *
 * Products with:
 *   - no inventory
 *   - zero stock
 *   - negative stock
 *   - low stock
 *   - inventory problems
 *
 * all remain visible.
 */
export function filterPOSProducts({
  products,
  categoryId,
  search,
}: FilterProductsOptions): POSProduct[] {
  const normalizedSearch =
    search
      .trim()
      .toLowerCase()

  return products.filter(
    (product) => {
      if (
        product.is_active === false
      ) {
        return false
      }

      const matchesCategory =
        categoryId === 'all' ||
        String(
          product.category_id ??
            '',
        ) ===
          String(
            categoryId,
          )

      if (
        !matchesCategory
      ) {
        return false
      }

      if (
        !normalizedSearch
      ) {
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

/**
 * Notifies the current tab and other browser tabs that
 * inventory-related POS data has changed.
 */
export function notifyInventoryUpdated(
  saleId?: string,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  // Same browser / same tab.
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

  // Other browser tabs/windows.
  if (
    typeof BroadcastChannel !==
    'undefined'
  ) {
    const channel =
      new BroadcastChannel(
        INVENTORY_CHANNEL_NAME,
      )

    try {
      channel.postMessage({
        type:
          INVENTORY_REFRESH_EVENT,

        source:
          'sale',

        saleId,
      })
    } finally {
      channel.close()
    }
  }
}
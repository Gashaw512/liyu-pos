import type {
  POSCartItem,
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

// ============================================================
// CART HELPERS
// ============================================================

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
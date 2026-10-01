export interface TableOrderLine {
  product_id: string
  product_name: string
  product_name_am?: string | null
  quantity: number
  unit_price: number
}

export function mergeTableOrderChanges(
  serverItems: TableOrderLine[],
  baseItems: TableOrderLine[],
  desiredItems: TableOrderLine[],
): TableOrderLine[] {
  const merged = new Map<string, TableOrderLine>()

  for (const item of serverItems) {
    if (item.quantity > 0) {
      merged.set(item.product_id, { ...item })
    }
  }

  const baseQuantities = new Map(baseItems.map((item) => [item.product_id, item.quantity]))
  const desiredById = new Map(desiredItems.map((item) => [item.product_id, item]))
  const changedProductIds = new Set([
    ...baseQuantities.keys(),
    ...desiredById.keys(),
  ])

  for (const productId of changedProductIds) {
    const baseQuantity = baseQuantities.get(productId) ?? 0
    const desiredItem = desiredById.get(productId)
    const desiredQuantity = desiredItem?.quantity ?? 0
    const delta = desiredQuantity - baseQuantity
    if (delta === 0) continue

    const current = merged.get(productId)
    const nextQuantity = Math.max(0, (current?.quantity ?? 0) + delta)
    if (nextQuantity === 0) {
      merged.delete(productId)
      continue
    }

    const item = desiredItem ?? current
    if (!item) continue
    merged.set(productId, { ...item, quantity: nextQuantity })
  }

  return [...merged.values()]
}

export function removeCompletedTableOrderItems(
  serverItems: TableOrderLine[],
  completedBaseItems: TableOrderLine[],
): TableOrderLine[] {
  const completedQuantities = new Map(
    completedBaseItems.map((item) => [item.product_id, item.quantity]),
  )

  return serverItems
    .map((item) => ({
      ...item,
      quantity: Math.max(0, item.quantity - (completedQuantities.get(item.product_id) ?? 0)),
    }))
    .filter((item) => item.quantity > 0)
}

export function calculateTableOrderTotal(items: TableOrderLine[]): number {
  return Math.round(items.reduce(
    (total, item) => total + item.quantity * item.unit_price,
    0,
  ) * 100) / 100
}

const PERSISTED_TABLE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPersistedTableId(value: unknown): value is string {
  return typeof value === 'string' && PERSISTED_TABLE_ID_PATTERN.test(value)
}

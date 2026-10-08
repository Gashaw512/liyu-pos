export const PENDING_OPERATION_STORES = [
  'pending_sales',
  'pending_stock_reconciliations',
  'pending_stock_receipts',
  'pending_shift_closures',
  'pending_shift_openings',
  'pending_table_orders',
] as const

export function sumPendingOperationCounts(
  counts: Partial<Record<(typeof PENDING_OPERATION_STORES)[number], number>>,
): number {
  return PENDING_OPERATION_STORES.reduce((total, storeName) => {
    const count = counts[storeName]
    return total + (typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 0)
  }, 0)
}

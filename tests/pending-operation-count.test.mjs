import test from 'node:test'
import assert from 'node:assert/strict'
import { sumPendingOperationCounts } from '../src/lib/offline/pendingOperationCount.ts'

test('sums pending work across the supported offline queues', () => {
  assert.equal(
    sumPendingOperationCounts({
      pending_sales: 2,
      pending_table_orders: 3,
      pending_stock_receipts: 1,
      pending_stock_reconciliations: 2,
      pending_shift_closures: 1,
      pending_shift_openings: 1,
    }),
    10,
  )
})

test('ignores invalid or negative queue counts', () => {
  assert.equal(
    sumPendingOperationCounts({
      pending_sales: -2,
      pending_table_orders: Number.NaN,
      pending_stock_receipts: Number.POSITIVE_INFINITY,
      pending_stock_reconciliations: 4,
    }),
    4,
  )
})

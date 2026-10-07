import test from 'node:test'
import assert from 'node:assert/strict'
import { getCancellationBaseItems } from '../src/lib/offline/tableOrderSync.ts'

const item = (quantity) => ({
  product_id: 'beer-id',
  product_name: 'Beer',
  quantity,
  unit_price: 50,
})

test('cancellation uses latest desired save, not its empty original base', () => {
  const baseItems = getCancellationBaseItems([
    { operation: 'save', createdAt: '2026-10-07T10:00:00Z', items: [item(2)] },
  ], [])

  assert.deepEqual(baseItems, [item(2)])
})

test('cancellation uses the newest of multiple local saves', () => {
  const baseItems = getCancellationBaseItems([
    { operation: 'save', createdAt: '2026-10-07T10:00:00Z', items: [item(1)] },
    { operation: 'save', createdAt: '2026-10-07T10:01:00Z', items: [item(3)] },
  ], [item(1)])

  assert.deepEqual(baseItems, [item(3)])
})

test('cancellation falls back to the local saved order when no save is queued', () => {
  const baseItems = getCancellationBaseItems([], [item(4)])

  assert.deepEqual(baseItems, [item(4)])
})

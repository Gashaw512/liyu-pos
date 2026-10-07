import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCustodyCountLines } from '../src/lib/kitchen/custody-stock.ts'

test('custody count subtracts server-allocated sales once', () => {
  const lines = buildCustodyCountLines([
    { productId: 'beer', usedQuantity: 0, returnedQuantity: 0, wastedQuantity: 0, physicalCount: 18 },
  ], new Map([['beer', 2]]), new Map([['beer', 20]]))

  assert.deepEqual(lines[0], {
    productId: 'beer',
    usedQuantity: 0,
    returnedQuantity: 0,
    wastedQuantity: 0,
    physicalCount: 18,
    soldQuantity: 2,
    usedIncludingSales: 2,
    expectedRemaining: 18,
    variance: 0,
  })
})

test('custody count includes returns, non-sale use, and wastage', () => {
  const [line] = buildCustodyCountLines([
    { productId: 'beer', usedQuantity: 1, returnedQuantity: 2, wastedQuantity: 1, physicalCount: 14 },
  ], new Map([['beer', 2]]), new Map([['beer', 20]]))

  assert.equal(line.expectedRemaining, 14)
  assert.equal(line.variance, 0)
})

test('custody count rejects total consumption above accepted stock', () => {
  assert.throws(() => buildCustodyCountLines([
    { productId: 'beer', usedQuantity: 1, returnedQuantity: 0, wastedQuantity: 0, physicalCount: 0 },
  ], new Map([['beer', 2]]), new Map([['beer', 2]])), /exceeds accepted stock/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCustodyCountLines, calculateCustodySoldQuantities } from '../src/lib/kitchen/custody-stock.ts'

test('walk-in sales by the custody recipient reduce their accepted balance', () => {
  const sold = calculateCustodySoldQuantities(
    [],
    [{ saleItemId: 'sale-line-1', productId: 'beer', quantity: 99, soldAt: '2026-10-08T10:00:00.000Z' }],
    [],
    new Map([['beer', '2026-10-08T09:00:00.000Z']]),
  )

  const [line] = buildCustodyCountLines([
    { productId: 'beer', usedQuantity: 0, returnedQuantity: 0, wastedQuantity: 0, physicalCount: 1 },
  ], sold, new Map([['beer', 100]]))

  assert.equal(line.soldQuantity, 99)
  assert.equal(line.expectedRemaining, 1)
  assert.equal(line.variance, 0)
})

test('KOT allocated quantities are not counted a second time as seller sales', () => {
  const sold = calculateCustodySoldQuantities(
    [{ productId: 'beer', quantity: 2 }],
    [{ saleItemId: 'sale-line-2', productId: 'beer', quantity: 5, soldAt: '2026-10-08T10:00:00.000Z' }],
    [{ saleItemId: 'sale-line-2', quantity: 2 }],
    new Map([['beer', '2026-10-08T09:00:00.000Z']]),
  )

  assert.equal(sold.get('beer'), 5)
})

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
    overdrawnQuantity: 0,
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

test('custody count records sales above accepted stock as a shortage instead of blocking close', () => {
  const [line] = buildCustodyCountLines([
    { productId: 'beer', usedQuantity: 0, returnedQuantity: 0, wastedQuantity: 0, physicalCount: 0 },
  ], new Map([['beer', 101]]), new Map([['beer', 100]]))

  assert.equal(line.expectedRemaining, -1)
  assert.equal(line.overdrawnQuantity, 1)
  assert.equal(line.variance, 0)
})

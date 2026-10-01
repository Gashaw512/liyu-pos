import test from 'node:test'
import assert from 'node:assert/strict'

import {
  sanitizeActiveShiftContext,
  isSameOpenShiftInstance,
  isDuplicateShiftClosure,
  toLocalActiveShift,
} from '../src/lib/offline/shiftContext.ts'
import {
  mergeTableOrderChanges,
  isPersistedTableId,
  removeCompletedTableOrderItems,
} from '../src/lib/offline/tableOrderSync.ts'
import { toLocalHistoricalSale } from '../src/lib/offline/saleHistory.ts'
import { calculateCashSettlement } from '../src/lib/calculations/cashSettlement.ts'
import { normalizePOSCategory, normalizePOSProduct, filterPOSProducts } from '../src/components/pos/posUtils.ts'

test('legacy placeholder IDs are repaired to the current business context before a sale is finalized', () => {
  const repaired = sanitizeActiveShiftContext({
    business_id: 'biz_active',
    branch_id: 'branch_main',
    cashier_id: 'cashier_default',
  }, {
    businessId: '11111111-1111-4111-8111-111111111111',
    branchId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
  })

  assert.equal(repaired.business_id, '11111111-1111-4111-8111-111111111111')
  assert.equal(repaired.branch_id, '22222222-2222-4222-8222-222222222222')
  assert.equal(repaired.cashier_id, '33333333-3333-4333-8333-333333333333')
})

test('real business IDs are not overwritten by stale cache values', () => {
  const original = {
    business_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branch_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    cashier_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  }

  const repaired = sanitizeActiveShiftContext(original, {
    businessId: '11111111-1111-4111-8111-111111111111',
    branchId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
  })

  assert.equal(repaired.business_id, original.business_id)
  assert.equal(repaired.branch_id, original.branch_id)
  assert.equal(repaired.cashier_id, original.cashier_id)
})

test('the same user, business, branch, and opened shift is treated as one shared open shift across devices', () => {
  const first = {
    business_id: '11111111-1111-4111-8111-111111111111',
    branch_id: '22222222-2222-4222-8222-222222222222',
    cashier_id: '33333333-3333-4333-8333-333333333333',
    opened_at: '2025-01-01T12:00:00.000Z',
    status: 'open',
  }

  const second = {
    business_id: '11111111-1111-4111-8111-111111111111',
    branch_id: '22222222-2222-4222-8222-222222222222',
    cashier_id: '33333333-3333-4333-8333-333333333333',
    opened_at: '2025-01-01T12:00:00.000Z',
    status: 'open',
  }

  assert.equal(isSameOpenShiftInstance(first, second), true)
})

test('duplicate shift closings are identified by the same shift identity so a report is not sent twice', () => {
  const shift = {
    business_id: '11111111-1111-4111-8111-111111111111',
    branch_id: '22222222-2222-4222-8222-222222222222',
    cashier_id: '33333333-3333-4333-8333-333333333333',
    opened_at: '2025-01-01T12:00:00.000Z',
  }

  const queuedClosure = {
    businessId: '11111111-1111-4111-8111-111111111111',
    branchId: '22222222-2222-4222-8222-222222222222',
    cashierId: '33333333-3333-4333-8333-333333333333',
    openedAt: '2025-01-01T12:00:00.000Z',
  }

  assert.equal(isDuplicateShiftClosure(queuedClosure, shift), true)
})

test('server shifts are stored in the active slot without losing their database ID', () => {
  const shift = toLocalActiveShift({
    id: '44444444-4444-4444-8444-444444444444',
    status: 'open',
  })

  assert.equal(shift.id, 'current')
  assert.equal(shift.report_id, '44444444-4444-4444-8444-444444444444')
  assert.equal(shift.real_database_id, '44444444-4444-4444-8444-444444444444')
})

test('concurrent table additions merge without dropping another device item or double-counting the shared base', () => {
  const base = [
    { product_id: 'coffee', product_name: 'Coffee', quantity: 1, unit_price: 20 },
  ]
  const server = [
    ...base,
    { product_id: 'tea', product_name: 'Tea', quantity: 1, unit_price: 15 },
  ]
  const desired = [
    ...base,
    { product_id: 'cake', product_name: 'Cake', quantity: 1, unit_price: 30 },
  ]

  const merged = mergeTableOrderChanges(server, base, desired)

  assert.deepEqual(merged.map((item) => item.product_id).sort(), ['cake', 'coffee', 'tea'])
  assert.equal(merged.find((item) => item.product_id === 'coffee')?.quantity, 1)
})

test('completing the previously saved part of a table order leaves newer concurrent additions open', () => {
  const completedBase = [
    { product_id: 'coffee', product_name: 'Coffee', quantity: 1, unit_price: 20 },
  ]
  const server = [
    { product_id: 'coffee', product_name: 'Coffee', quantity: 2, unit_price: 20 },
  ]

  const remaining = removeCompletedTableOrderItems(server, completedBase)

  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].quantity, 1)
})

test('device-only fallback table IDs are never treated as shared database tables', () => {
  assert.equal(isPersistedTableId('fallback_1'), false)
  assert.equal(isPersistedTableId('11111111-1111-4111-8111-111111111111'), true)
})

test('completed local receipt history retains sale items and payment details after outbox acknowledgement', () => {
  const history = toLocalHistoricalSale({
    localId: 'sale-local-id',
    createdAt: '2026-10-01T10:00:00.000Z',
    retryCount: 0,
    syncStatus: 'pending',
    offline_id: 'sale-local-id',
    business_id: '11111111-1111-4111-8111-111111111111',
    branch_id: '22222222-2222-4222-8222-222222222222',
    shift_id: '33333333-3333-4333-8333-333333333333',
    cashier_id: '44444444-4444-4444-8444-444444444444',
    receipt_number: 'REC-123456',
    subtotal: 100,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 100,
    tip_amount: 0,
    status: 'completed',
    customer_name: null,
    customer_phone: null,
    notes: null,
    table_id: null,
    table_name: 'Walk-in',
    device_id: null,
    items: [{
      product_id: '55555555-5555-4555-8555-555555555555',
      product_name: 'Coffee',
      unit_price: 50,
      cost_price: 25,
      quantity: 2,
      discount: 0,
    }],
    payments: [{
      id: '66666666-6666-4666-8666-666666666666',
      method: 'cash',
      amount: 100,
      reference_no: null,
      status: 'completed',
    }],
  })

  assert.equal(history.id, 'sale-local-id')
  assert.equal(history.items[0].total_amount, 100)
  assert.equal(history.payments[0].amount, 100)
  assert.equal(history.receipt_number, 'REC-123456')
})

test('cash settlement shows remaining, paid-in-full, and change without over-recording payment', () => {
  assert.equal(calculateCashSettlement(450, 400).remaining, 50)
  assert.equal(calculateCashSettlement(450, 400).isCovered, false)

  const exact = calculateCashSettlement(450, 450)
  assert.equal(exact.isCovered, true)
  assert.equal(exact.change, 0)
  assert.equal(exact.remaining, 0)

  const overpaid = calculateCashSettlement(450, 500)
  assert.equal(overpaid.isCovered, true)
  assert.equal(overpaid.change, 50)
  assert.equal(overpaid.cashDue, 450)
})

test('POS catalog normalization preserves Amharic names and search finds them', () => {
  const product = normalizePOSProduct({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Beef',
    name_am: 'የበሬ ስጋ',
    category_name_am: 'ምግብ',
    retail_price: 350,
  })
  const category = normalizePOSCategory({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Food',
    name_am: 'ምግብ',
  })

  assert.equal(product.name_am, 'የበሬ ስጋ')
  assert.equal(product.category_name_am, 'ምግብ')
  assert.equal(category.name_am, 'ምግብ')
  assert.equal(filterPOSProducts({ products: [product], categoryId: 'all', search: 'በሬ' }).length, 1)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  sanitizeActiveShiftContext,
  isSameOpenShiftInstance,
  isDuplicateShiftClosure,
} from '../src/lib/offline/shiftContext.ts'

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

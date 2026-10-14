import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAuthGuardRecoveryAction,
  isExplicitSessionRejection,
} from '../src/lib/offline/authGuardRecovery.ts'

const cached = {
  userId: 'user-1',
  role: 'cashier',
  roles: ['cashier'],
  businessName: 'Demo Cafe',
  onboardingCompleted: true,
}

test('a verified local session and matching shell cache restore offline', () => {
  assert.equal(getAuthGuardRecoveryAction(undefined, 'user-1', cached), 'restore')
})

test('no local session and no shell cache redirect to login', () => {
  assert.equal(getAuthGuardRecoveryAction(undefined, null, null), 'redirect')
})

test('only explicit 401 and 403 responses reject the cached shell session', () => {
  assert.equal(isExplicitSessionRejection(401), true)
  assert.equal(isExplicitSessionRejection(403), true)
  assert.equal(getAuthGuardRecoveryAction(401, 'user-1', cached), 'redirect')
  assert.equal(getAuthGuardRecoveryAction(403, 'user-1', cached), 'redirect')
  assert.equal(isExplicitSessionRejection(0), false)
  assert.equal(isExplicitSessionRejection(503), false)
  assert.equal(getAuthGuardRecoveryAction(0, 'user-1', cached), 'restore')
  assert.equal(getAuthGuardRecoveryAction(503, 'user-1', cached), 'restore')
})

test('a missing or mismatched local profile stays on a recoverable page, not a login redirect', () => {
  assert.equal(getAuthGuardRecoveryAction(undefined, 'user-1', null), 'unavailable')
  assert.equal(getAuthGuardRecoveryAction(undefined, 'user-2', cached), 'unavailable')
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeEthiopianPhone,
  normalizeRecoveryCode,
  verifyRecoveryCode,
} from '../src/lib/auth/recoveryCode.ts'

test('recovery codes are high entropy, formatted, and normalize consistently', () => {
  const recoveryCode = generateRecoveryCode()

  assert.match(recoveryCode, /^[A-F0-9]{6}(?:-[A-F0-9]{6}){7}$/)
  assert.equal(normalizeRecoveryCode(recoveryCode), recoveryCode.replaceAll('-', ''))
  assert.equal(verifyRecoveryCode(recoveryCode.toLowerCase(), hashRecoveryCode(recoveryCode)), true)
  assert.equal(verifyRecoveryCode(`${recoveryCode.slice(0, -1)}0`, hashRecoveryCode(recoveryCode)), false)
  assert.equal(normalizeRecoveryCode('not-a-recovery-code'), null)
})

test('Ethiopian phone numbers normalize to E.164', () => {
  assert.equal(normalizeEthiopianPhone('0912345678'), '+251912345678')
  assert.equal(normalizeEthiopianPhone('912345678'), '+251912345678')
  assert.equal(normalizeEthiopianPhone('+251 91 234 5678'), '+251912345678')
  assert.equal(normalizeEthiopianPhone('12345'), null)
})
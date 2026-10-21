import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearShellProfileCache,
  readShellProfileCache,
  writeShellProfileCache,
} from '../src/lib/offline/shellProfileCache.ts'

const cacheKey = 'liyu-shell-profile-v1'

function withLocalStorage(run) {
  const values = new Map()
  const previousWindow = globalThis.window
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }

  try {
    run(values)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('persists only the fields needed to render the authenticated shell', () => {
  withLocalStorage((values) => {
    const shellProfile = {
      userId: 'user-1',
      role: 'cashier',
      roles: ['cashier', 'waiter'],
      businessName: 'Demo Cafe',
      onboardingCompleted: true,
      businessId: 'business-1',
      branchId: 'branch-1',
    }

    writeShellProfileCache(shellProfile)

    assert.deepEqual(readShellProfileCache(), shellProfile)
    assert.deepEqual(Object.keys(JSON.parse(values.get(cacheKey))).sort(), [
      'branchId',
      'businessId',
      'businessName',
      'onboardingCompleted',
      'role',
      'roles',
      'userId',
    ])
  })
})

test('continues to read shell profiles written before business and branch IDs were cached', () => {
  withLocalStorage((values) => {
    values.set(cacheKey, JSON.stringify({
      userId: 'user-1',
      role: 'cashier',
      roles: ['cashier'],
      businessName: 'Demo Cafe',
      onboardingCompleted: true,
    }))

    const cached = readShellProfileCache()
    assert.equal(cached?.businessId, undefined)
    assert.equal(cached?.branchId, undefined)
  })
})

test('rejects malformed cached shell profiles and clears the cache', () => {
  withLocalStorage((values) => {
    values.set(cacheKey, JSON.stringify({ userId: 'user-1', role: 'cashier' }))
    assert.equal(readShellProfileCache(), null)

    clearShellProfileCache()
    assert.equal(values.has(cacheKey), false)
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'

const sessionModule = await import('../src/lib/offline/sessionFallback.ts')

const { readOfflineSessionSnapshot, readLastVisitedRoute, writeLastVisitedRoute, hydrateOfflineAuthStore } = sessionModule

test('reads the latest persisted auth snapshot', () => {
  globalThis.window = {
    localStorage: {
      getItem: (key) => {
        if (key === 'liyu-auth') {
          return JSON.stringify({
            state: {
              user: { id: 'u-1', role: 'cashier', full_name: 'Aster Bekele' },
              business: { name: 'Liyu Cafe' },
            },
          })
        }
        return null
      },
    },
  }

  const snapshot = readOfflineSessionSnapshot()

  assert.deepEqual(snapshot, {
    user: { id: 'u-1', role: 'cashier', full_name: 'Aster Bekele' },
    business: { name: 'Liyu Cafe' },
  })
})

test('stores and reads the last visited route for offline recovery', () => {
  globalThis.window = {
    localStorage: {
      store: {},
      getItem: (key) => globalThis.window.localStorage.store[key] ?? null,
      setItem: (key, value) => {
        globalThis.window.localStorage.store[key] = value
      },
      removeItem: (key) => {
        delete globalThis.window.localStorage.store[key]
      },
    },
  }

  writeLastVisitedRoute('/en/sales')
  assert.equal(readLastVisitedRoute(), '/en/sales')

  writeLastVisitedRoute('/en/dashboard')
  assert.equal(readLastVisitedRoute(), '/en/dashboard')
})

test('hydrates the persisted auth state into the client store snapshot', () => {
  globalThis.window = {
    localStorage: {
      getItem: (key) => {
        if (key === 'liyu-auth') {
          return JSON.stringify({
            state: {
              user: { id: 'u-2', role: 'manager', full_name: 'Dawit' },
              business: { name: 'Bole Bistro' },
            },
          })
        }
        return null
      },
    },
  }

  const store = {
    setState: (state) => {
      Object.assign(store, state)
    },
  }

  hydrateOfflineAuthStore(store)

  assert.equal(store.user?.role, 'manager')
  assert.equal(store.business?.name, 'Bole Bistro')
  assert.equal(store.isAuthenticated, true)
  assert.equal(store.isLoading, false)
})

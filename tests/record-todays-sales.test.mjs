import test from 'node:test'
import assert from 'node:assert/strict'

const { getEffectiveCatalog } = await import('../src/lib/catalog/guard.ts')

test('returns an empty catalog when no real product list is provided', () => {
  assert.deepEqual(getEffectiveCatalog(), [])
  assert.deepEqual(getEffectiveCatalog(null), [])
})

test('keeps a real product list unchanged', () => {
  const products = [
    { id: 'p1', name: 'Coffee', available: 10, unit: 'cup', categoryId: 'drinks', categoryName: 'Drinks' },
  ]

  assert.deepEqual(getEffectiveCatalog(products), products)
})

// src/lib/sale/sales.utils.ts
import type {
  POSCartItem,
  POSCategory,
  POSProduct,
  POSTable,
  PaymentSplit,
} from '../../components/pos/types'

// ============================================================
// NORMALIZATION
// ============================================================

export function normalizeString(
  value: unknown,
): string {
  return String(value ?? '').trim()
}

export function normalizeNumber(
  value: unknown,
): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

// ============================================================
// PRODUCTS
// ============================================================

export function normalizePOSProduct(
  product: any,
): POSProduct {
  return {
    id: normalizeString(product?.id),

    name: normalizeString(
      product?.name ||
        'Unnamed Product',
    ),

    category_id:
      product?.category_id ??
      product?.categoryId ??
      null,

    retail_price: normalizeNumber(
      product?.retail_price ??
        product?.price ??
        0,
    ),

    image_url:
      product?.image_url ?? null,

    is_active:
      product?.is_active !== false,

    sku:
      product?.sku ?? null,
  }
}

export function normalizePOSProducts(
  rows: any[],
): POSProduct[] {
  return (rows ?? [])
    .map(normalizePOSProduct)
    .filter(
      (product) =>
        product.id.length > 0,
    )
}

// ============================================================
// CATEGORIES
// ============================================================

export function normalizePOSCategory(
  category: any,
): POSCategory {
  return {
    id: normalizeString(
      category?.id,
    ),

    name: normalizeString(
      category?.name ??
        category?.category_name ??
        'Category',
    ),

    sort_order: normalizeNumber(
      category?.sort_order ?? 0,
    ),

    is_active: true,
  }
}

export function normalizePOSCategories(
  rows: any[],
): POSCategory[] {
  return (rows ?? [])
    .filter(
      (category) =>
        category?.is_active !== false,
    )
    .map(normalizePOSCategory)
    .filter(
      (category) =>
        category.id.length > 0,
    )
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) -
        (b.sort_order ?? 0),
    )
}

// ============================================================
// CART
// ============================================================

export function calculateCartTotal(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (total, item) =>
      total +
      normalizeNumber(item.price) *
        normalizeNumber(item.quantity),
    0,
  )
}

export function calculateCartItemCount(
  cart: POSCartItem[],
): number {
  return cart.reduce(
    (total, item) =>
      total +
      normalizeNumber(item.quantity),
    0,
  )
}

export function createCartQuantityMap(
  cart: POSCartItem[],
): Map<string, number> {
  const quantities =
    new Map<string, number>()

  for (const item of cart) {
    quantities.set(
      item.id,
      (quantities.get(item.id) ?? 0) +
        normalizeNumber(item.quantity),
    )
  }

  return quantities
}

// ============================================================
// PRODUCT FILTERING
// ============================================================

interface FilterProductsOptions {
  products: POSProduct[]
  categoryId: string
  search: string
}

export function filterPOSProducts({
  products,
  categoryId,
  search,
}: FilterProductsOptions): POSProduct[] {
  const normalizedSearch =
    search.trim().toLowerCase()

  return products.filter(
    (product) => {
      if (product.is_active === false) {
        return false
      }

      const matchesCategory =
        categoryId === 'all' ||
        String(
          product.category_id ?? '',
        ) === String(categoryId)

      if (!matchesCategory) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const name =
        normalizeString(
          product.name,
        ).toLowerCase()

      const sku =
        normalizeString(
          product.sku,
        ).toLowerCase()

      return (
        name.includes(
          normalizedSearch,
        ) ||
        sku.includes(
          normalizedSearch,
        )
      )
    },
  )
}

// ============================================================
// CART SERIALIZATION
// ============================================================

export function serializeCart(
  cart: POSCartItem[],
): string {
  return JSON.stringify(
    cart
      .map((item) => ({
        id: normalizeString(
          item.id,
        ),

        name: normalizeString(
          item.name,
        ),

        price: normalizeNumber(
          item.price,
        ),

        quantity: normalizeNumber(
          item.quantity,
        ),
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
  )
}
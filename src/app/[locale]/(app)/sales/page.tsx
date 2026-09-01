// src/app/[locale]/(app)/sales/page.tsx

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Coins,
  Loader2,
  Save,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react'

import POSTableSelector from '../../../../components/pos/POSTableSelector'

import { getDB } from '../../../../lib/offline/db'
import type { Shift } from '../../../../types/database/operations'
import { finalizeSale } from '@/lib/offline/saleService'

import POSHeader from '../../../../components/pos/POSHeader'
import POSCategories from '../../../../components/pos/POSCategories'
import POSProductGrid from '../../../../components/pos/POSProductGrid'
import POSCart from '../../../../components/pos/POSCart'
import POSCheckout from '../../../../components/pos/POSCheckout'

import type {
  POSCartItem,
  POSCategory,
  POSProduct,
  POSTable,
  PaymentSplit,
} from '../../../../components/pos/types'

// ============================================================
// CONSTANTS
// ============================================================

const FALLBACK_TABLES = [
  'Table 1',
  'Table 2',
  'Table 3',
  'Table 4',
  'Table 5',
  'Table 6',
  'VIP Box',
]

const DEFAULT_CASH_FLOAT = '1000'

// ============================================================
// HELPERS
// ============================================================

function normalizeString(value: unknown): string {
  return value == null ? '' : String(value)
}

function normalizeNumber(
  value: unknown,
  fallback = 0,
): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function getTableNumber(table: POSTable): string {
  return normalizeString(
    table.table_number ?? table.name,
  )
}

function tabBelongsToTable(
  tab: any,
  table: POSTable,
): boolean {
  const tableId = normalizeString(table.id)
  const tableNumber = getTableNumber(table)

  const tabId = normalizeString(tab?.id)
  const tabTableId = normalizeString(
    tab?.table_id,
  )

  const tabTableNumber = normalizeString(
    tab?.table_number,
  )

  const matchesTableId =
    tableId.length > 0 &&
    (tabId === tableId ||
      tabTableId === tableId)

  const matchesTableNumber =
    tableNumber.length > 0 &&
    tabTableNumber === tableNumber

  return (
    matchesTableId ||
    matchesTableNumber
  )
}

/**
 * Creates a stable representation of a cart.
 *
 * Used only to determine whether the current
 * table order differs from its saved order.
 */
function serializeCart(
  cart: POSCartItem[],
): string {
  return JSON.stringify(
    cart
      .map((item) => ({
        id: normalizeString(item.id),
        name: normalizeString(item.name),
        price: normalizeNumber(item.price),
        quantity: normalizeNumber(
          item.quantity,
        ),
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
  )
}

/**
 * IMPORTANT:
 *
 * Always use the same serialized value for
 * an empty cart.
 *
 * This prevents:
 *
 * serializeCart([]) === "[]"
 *
 * from being compared against:
 *
 * "".
 *
 * An empty table therefore never becomes
 * accidentally "unsaved".
 */
const EMPTY_CART_SNAPSHOT = serializeCart([])

// ============================================================
// PAGE
// ============================================================

export default function SalesPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(
    params.locale || 'en',
  )

  const isAm = locale === 'am'

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] =
    useState(true)

  const [products, setProducts] =
    useState<POSProduct[]>([])

  const [categories, setCategories] =
    useState<POSCategory[]>([])

  const [tables, setTables] =
    useState<POSTable[]>([])

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState('all')

  const [
    productSearch,
    setProductSearch,
  ] = useState('')

  const [
    selectedTable,
    setSelectedTable,
  ] = useState<POSTable | null>(null)

  const [cart, setCart] =
    useState<POSCartItem[]>([])

  const [
    activeShift,
    setActiveShift,
  ] = useState<Shift | null>(null)

  const [
    showCheckout,
    setShowCheckout,
  ] = useState(false)

  const [billOpen, setBillOpen] =
    useState(false)

  const [
    savingTab,
    setSavingTab,
  ] = useState(false)

  const [
    openingShift,
    setOpeningShift,
  ] = useState(false)

  const [
    closingShift,
    setClosingShift,
  ] = useState(false)

  const [
    cashFloat,
    setCashFloat,
  ] = useState(DEFAULT_CASH_FLOAT)

  const [
    manualTip,
    setManualTip,
  ] = useState('')

  /**
   * TRUE only when the selected table has
   * actual items that differ from its saved order.
   */
  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] = useState(false)

  /**
   * Snapshot of the last saved table order.
   */
  const [
    savedCartSnapshot,
    setSavedCartSnapshot,
  ] = useState(
    EMPTY_CART_SNAPSHOT,
  )

  // ==========================================================
  // LOAD POS DATA
  // ==========================================================

  const loadPOSData =
    useCallback(async () => {
      try {
        const db = await getDB()

        // ------------------------------------------------------
        // ACTIVE SHIFT
        // ------------------------------------------------------

        const shift =
          await db.get(
            'active_shift',
            'current',
          )

        setActiveShift(
          shift || null,
        )

        // ------------------------------------------------------
        // PRODUCTS
        // ------------------------------------------------------

        const productRows =
          await db.getAll('products')

        const normalizedProducts: POSProduct[] =
          (productRows || [])
            .map(
              (product: any) => ({
                id: normalizeString(
                  product.id,
                ),

                name: normalizeString(
                  product.name ||
                  'Unnamed Product',
                ),

                category_id:
                  product.category_id ??
                  product.categoryId ??
                  null,

                retail_price:
                  normalizeNumber(
                    product.retail_price ??
                    product.price ??
                    0,
                  ),

                image_url:
                  product.image_url ??
                  null,

                is_active:
                  product.is_active !==
                  false,

                sku:
                  product.sku ??
                  null,
              }),
            )
            .filter(
              (product) =>
                product.id.length > 0,
            )

        setProducts(
          normalizedProducts,
        )

        // ------------------------------------------------------
        // CATEGORIES
        // ------------------------------------------------------

        if (
          db.objectStoreNames.contains(
            'categories',
          )
        ) {
          const categoryRows =
            await db.getAll(
              'categories',
            )

          const normalizedCategories: POSCategory[] =
            (categoryRows || [])
              .filter(
                (category: any) =>
                  category.is_active !==
                  false,
              )
              .map(
                (
                  category: any,
                ) => ({
                  id: normalizeString(
                    category.id,
                  ),

                  name: normalizeString(
                    category.name ??
                    category.category_name ??
                    'Category',
                  ),

                  sort_order:
                    normalizeNumber(
                      category.sort_order ??
                      0,
                    ),

                  is_active: true,
                }),
              )
              .filter(
                (category) =>
                  category.id.length > 0,
              )
              .sort(
                (a, b) =>
                  (a.sort_order ?? 0) -
                  (b.sort_order ?? 0),
              )

          setCategories(
            normalizedCategories,
          )
        } else {
          setCategories([])
        }

        // ------------------------------------------------------
        // OPEN TABS
        // ------------------------------------------------------

        let openTabs: any[] = []

        if (
          db.objectStoreNames.contains(
            'open_tabs',
          )
        ) {
          openTabs =
            await db.getAll(
              'open_tabs',
            )
        }

        // ------------------------------------------------------
        // TABLES
        // ------------------------------------------------------

        let normalizedTables: POSTable[] =
          []

        if (
          db.objectStoreNames.contains(
            'tables',
          )
        ) {
          const tableRows =
            await db.getAll(
              'tables',
            )

          normalizedTables =
            (tableRows || [])
              .map(
                (
                  table: any,
                  index: number,
                ) => {
                  const id =
                    normalizeString(
                      table.id ??
                      table.table_number ??
                      `table_${index + 1}`,
                    )

                  const name =
                    normalizeString(
                      table.name ??
                      table.table_number ??
                      `Table ${index + 1}`,
                    )

                  const tableNumber =
                    normalizeString(
                      table.table_number ??
                      name,
                    )

                  const hasOpenTab =
                    openTabs.some(
                      (tab: any) =>
                        tabBelongsToTable(
                          tab,
                          {
                            id,
                            name,
                            table_number:
                              tableNumber,
                            has_open_tab:
                              false,
                          },
                        ),
                    )

                  return {
                    id,
                    name,
                    table_number:
                      tableNumber,
                    has_open_tab:
                      hasOpenTab,
                  }
                },
              )
              .filter(
                (table) =>
                  table.id.length > 0,
              )
        }

        // ------------------------------------------------------
        // FALLBACK TABLES
        // ------------------------------------------------------

        if (
          normalizedTables.length ===
          0
        ) {
          normalizedTables =
            FALLBACK_TABLES.map(
              (
                name,
                index,
              ) => ({
                id: `fallback_${index + 1
                  }`,

                name,

                table_number: name,

                has_open_tab:
                  openTabs.some(
                    (tab: any) =>
                      normalizeString(
                        tab?.table_number,
                      ) === name,
                  ),
              }),
            )
        }

        setTables(
          normalizedTables,
        )
      } catch (error) {
        console.error(
          '[POS] Failed to load POS data:',
          error,
        )
      } finally {
        setLoading(false)
      }
    }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    void loadPOSData()
  }, [loadPOSData])

  // ==========================================================
  // FILTERED PRODUCTS
  // ==========================================================

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
          .trim()
          .toLowerCase()

      return products.filter(
        (product) => {
          const matchesCategory =
            selectedCategoryId ===
            'all' ||
            String(
              product.category_id ??
              '',
            ) ===
            String(
              selectedCategoryId,
            )

          const productName =
            normalizeString(
              product.name,
            ).toLowerCase()

          const productSku =
            normalizeString(
              product.sku,
            ).toLowerCase()

          const matchesSearch =
            !search ||
            productName.includes(
              search,
            ) ||
            productSku.includes(
              search,
            )

          return (
            product.is_active !==
            false &&
            matchesCategory &&
            matchesSearch
          )
        },
      )
    }, [
      products,
      selectedCategoryId,
      productSearch,
    ])

  // ==========================================================
  // CART CALCULATIONS
  // ==========================================================

  const totalBill = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          normalizeNumber(
            item.price,
          ) *
          normalizeNumber(
            item.quantity,
          ),
        0,
      ),
    [cart],
  )

  const totalItems = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          normalizeNumber(
            item.quantity,
          ),
        0,
      ),
    [cart],
  )

  const cartProductIds =
    useMemo(
      () =>
        new Set(
          cart.map(
            (item) => item.id,
          ),
        ),
      [cart],
    )

  const cartHasItems =
    cart.length > 0

  // ==========================================================
  // UNSAVED ORDER STATE
  // ==========================================================

  /**
   * IMPORTANT:
   *
   * An empty cart is NEVER considered an
   * unsaved table order.
   *
   * Therefore switching between empty tables
   * will never show the save confirmation.
   */
  useEffect(() => {
    if (
      !selectedTable ||
      !cartHasItems
    ) {
      setHasUnsavedChanges(false)
      return
    }

    const currentSnapshot =
      serializeCart(cart)

    setHasUnsavedChanges(
      currentSnapshot !==
      savedCartSnapshot,
    )
  }, [
    cart,
    cartHasItems,
    selectedTable,
    savedCartSnapshot,
  ])

  /**
   * Automatically close the bill when
   * there are no items.
   */
  useEffect(() => {
    if (!cartHasItems) {
      setBillOpen(false)
    }
  }, [cartHasItems])

  /**
   * Save is possible only when:
   *
   * - a table is selected
   * - there are items
   * - there are actual unsaved changes
   * - we are not already saving
   */
  const canSaveTableOrder =
    Boolean(
      selectedTable &&
      cartHasItems &&
      hasUnsavedChanges &&
      !savingTab,
    )

  // ==========================================================
  // LOAD EXISTING TABLE ORDER
  // ==========================================================

  const loadTableTab =
    useCallback(
      async (
        table: POSTable,
      ) => {
        try {
          const db = await getDB()

          if (
            !db.objectStoreNames.contains(
              'open_tabs',
            )
          ) {
            setCart([])

            setSavedCartSnapshot(
              EMPTY_CART_SNAPSHOT,
            )

            setHasUnsavedChanges(
              false,
            )

            return
          }

          const allTabs =
            await db.getAll(
              'open_tabs',
            )

          const existingTab =
            allTabs.find(
              (tab: any) =>
                tabBelongsToTable(
                  tab,
                  table,
                ),
            )

          // ----------------------------------------------------
          // RESTORE SAVED ORDER
          // ----------------------------------------------------

          if (
            existingTab &&
            Array.isArray(
              existingTab.items,
            )
          ) {
            const restoredCart: POSCartItem[] =
              existingTab.items
                .map(
                  (item: any) => ({
                    id: normalizeString(
                      item.product_id ??
                      item.id,
                    ),

                    name: normalizeString(
                      item.product_name ??
                      item.name ??
                      'Product',
                    ),

                    price:
                      normalizeNumber(
                        item.unit_price ??
                        item.price ??
                        0,
                      ),

                    quantity:
                      normalizeNumber(
                        item.quantity ??
                        1,
                      ),
                  }),
                )
                .filter(
                  (item) =>
                    item.id.length >
                    0 &&
                    item.quantity >
                    0,
                )

            setCart(
              restoredCart,
            )

            /**
             * The restored order is already
             * saved, so this becomes the
             * clean baseline.
             */
            setSavedCartSnapshot(
              serializeCart(
                restoredCart,
              ),
            )

            setHasUnsavedChanges(
              false,
            )
          } else {
            /**
             * EMPTY TABLE
             *
             * This is the important fix.
             */
            setCart([])

            setSavedCartSnapshot(
              EMPTY_CART_SNAPSHOT,
            )

            setHasUnsavedChanges(
              false,
            )
          }
        } catch (error) {
          console.error(
            '[POS] Failed to load table tab:',
            error,
          )

          setCart([])

          setSavedCartSnapshot(
            EMPTY_CART_SNAPSHOT,
          )

          setHasUnsavedChanges(
            false,
          )
        }
      },
      [],
    )

  // ==========================================================
  // SELECT TABLE
  // ==========================================================

  const handleSelectTable =
    async (
      table: POSTable,
    ) => {
      /**
       * IMPORTANT:
       *
       * Ask ONLY when the CURRENT table
       * has actual unsaved items.
       *
       * Empty table => NO confirmation.
       */
      if (
        selectedTable &&
        selectedTable.id !== table.id &&
        cartHasItems &&
        hasUnsavedChanges
      ) {
        const confirmed =
          window.confirm(
            isAm
              ? 'ያልተቀመጠውን ትዕዛዝ ሳያስቀምጡ ጠረጴዛ መቀየር ይፈልጋሉ?'
              : 'Switch table without saving the current order?',
          )

        if (!confirmed) {
          return
        }
      }

      /**
       * Select the new table.
       */
      setSelectedTable(table)

      /**
       * Restore its saved order.
       *
       * Empty table => empty cart +
       * clean snapshot + no warning.
       */
      await loadTableTab(table)

      setShowCheckout(false)
      setBillOpen(false)
      setManualTip('')
    }

  // ==========================================================
  // WALK-IN
  // ==========================================================

  const handleWalkIn =
    () => {
      /**
       * Ask only when there is an actual
       * unsaved order on the current table.
       */
      if (
        selectedTable &&
        cartHasItems &&
        hasUnsavedChanges
      ) {
        const confirmed =
          window.confirm(
            isAm
              ? 'ያልተቀመጠውን ትዕዛዝ ሳያስቀምጡ ወደ ቀጥታ ሽያጭ መሄድ ይፈልጋሉ?'
              : 'Switch to walk-in without saving the current order?',
          )

        if (!confirmed) {
          return
        }
      }

      setSelectedTable(null)

      setCart([])

      setSavedCartSnapshot(
        EMPTY_CART_SNAPSHOT,
      )

      setHasUnsavedChanges(
        false,
      )

      setShowCheckout(false)
      setBillOpen(false)
      setManualTip('')
    }

  // ==========================================================
  // CART - ADD
  // ==========================================================

  const addToCart =
    (
      product: POSProduct,
    ) => {
      const price =
        normalizeNumber(
          product.retail_price,
        )

      setCart(
        (currentCart) => {
          const existingItem =
            currentCart.find(
              (item) =>
                item.id ===
                product.id,
            )

          if (existingItem) {
            return currentCart.map(
              (item) =>
                item.id ===
                  product.id
                  ? {
                    ...item,
                    quantity:
                      item.quantity +
                      1,
                  }
                  : item,
            )
          }

          return [
            ...currentCart,
            {
              id: product.id,
              name: product.name,
              price,
              quantity: 1,
            },
          ]
        },
      )

      if (selectedTable) {
        setHasUnsavedChanges(
          true,
        )
      }
    }

  // ==========================================================
  // CART - INCREASE
  // ==========================================================

  const increaseQuantity =
    (
      id: string,
      amount = 1,
    ) => {
      if (amount <= 0) {
        return
      }

      setCart(
        (currentCart) =>
          currentCart.map(
            (item) =>
              item.id === id
                ? {
                  ...item,
                  quantity:
                    item.quantity +
                    amount,
                }
                : item,
          ),
      )

      if (selectedTable) {
        setHasUnsavedChanges(
          true,
        )
      }
    }

  // ==========================================================
  // CART - DECREASE
  // ==========================================================

  const decreaseQuantity =
    (id: string) => {
      setCart(
        (currentCart) =>
          currentCart
            .map((item) =>
              item.id === id
                ? {
                  ...item,
                  quantity:
                    item.quantity -
                    1,
                }
                : item,
            )
            .filter(
              (item) =>
                item.quantity > 0,
            ),
      )

      if (selectedTable) {
        setHasUnsavedChanges(
          true,
        )
      }
    }

  // ==========================================================
  // CART - CLEAR ITEM
  // ==========================================================

  const clearCartItem =
    (id: string) => {
      setCart(
        (currentCart) =>
          currentCart.filter(
            (item) =>
              item.id !== id,
          ),
      )

      if (selectedTable) {
        setHasUnsavedChanges(
          true,
        )
      }
    }

  // ==========================================================
  // SHIFT - OPEN
  // ==========================================================

  const handleOpenShift =
    async () => {
      if (openingShift) {
        return
      }

      setOpeningShift(true)

      try {
        const db =
          await getDB()

        const openingCash =
          Number.parseFloat(
            cashFloat,
          ) || 0

        const now =
          new Date().toISOString()

        const newShift: Shift = {
          id: 'current',

          business_id:
            'biz_active',

          branch_id:
            'branch_main',

          cashier_id:
            'cashier_default',

          opened_by:
            'cashier_default',

          closed_by: null,

          shift_label:
            `Shift-${new Date().toLocaleDateString()}` as Shift['shift_label'],

          opened_at: now,

          closed_at: null,

          opening_cash:
            openingCash,

          opening_float:
            openingCash,

          expected_cash:
            openingCash,

          actual_cash_reported:
            null,

          cash_discrepancy:
            null,

          total_sales: 0,

          total_transactions: 0,

          status:
            'open' as Shift['status'],

          is_first_shift: false,

          notes: null,

          created_at: now,

          updated_at: now,

          closing_float: null,

          actual_cash: null,

          difference: null,
        }

        await db.put(
          'active_shift',
          newShift,
        )

        setActiveShift(
          newShift,
        )
      } catch (error) {
        console.error(
          '[POS] Failed to open shift:',
          error,
        )

        window.alert(
          isAm
            ? 'ፈረቃ መክፈት አልተሳካም'
            : 'Failed to open shift',
        )
      } finally {
        setOpeningShift(false)
      }
    }

  // ==========================================================
  // SHIFT - CLOSE
  // ==========================================================

  const handleCloseShift =
    async () => {
      if (closingShift) {
        return
      }

      const confirmed =
        window.confirm(
          isAm
            ? 'የአሁኑን ፈረቃ መዝጋት ይፈልጋሉ?'
            : 'Are you sure you want to close this shift?',
        )

      if (!confirmed) {
        return
      }

      setClosingShift(true)

      try {
        const db =
          await getDB()

        await db.delete(
          'active_shift',
          'current',
        )

        setActiveShift(null)

        setCart([])

        setSelectedTable(null)

        setSavedCartSnapshot(
          EMPTY_CART_SNAPSHOT,
        )

        setHasUnsavedChanges(
          false,
        )

        setShowCheckout(false)

        setManualTip('')

        setBillOpen(false)
      } catch (error) {
        console.error(
          '[POS] Failed to close shift:',
          error,
        )

        window.alert(
          isAm
            ? 'ፈረቃ መዝጋት አልተሳካም'
            : 'Failed to close shift',
        )
      } finally {
        setClosingShift(false)
      }
    }

  // ==========================================================
  // SAVE TABLE ORDER
  // ==========================================================

  const handleSaveTab =
    async () => {
      if (!selectedTable) {
        return
      }

      if (!cartHasItems) {
        return
      }

      if (!hasUnsavedChanges) {
        return
      }

      if (savingTab) {
        return
      }

      setSavingTab(true)

      try {
        const db =
          await getDB()

        if (
          !db.objectStoreNames.contains(
            'open_tabs',
          )
        ) {
          throw new Error(
            'IndexedDB open_tabs store is not available.',
          )
        }

        const items =
          cart
            .map(
              (item) => ({
                product_id:
                  normalizeString(
                    item.id,
                  ),

                product_name:
                  normalizeString(
                    item.name,
                  ),

                quantity:
                  normalizeNumber(
                    item.quantity,
                  ),

                unit_price:
                  normalizeNumber(
                    item.price,
                  ),
              }),
            )
            .filter(
              (item) =>
                item.product_id.length >
                0 &&
                item.quantity > 0,
            )

        if (items.length === 0) {
          throw new Error(
            'Cannot save an empty table order.',
          )
        }

        const allTabs =
          await db.getAll(
            'open_tabs',
          )

        const existingTab =
          allTabs.find(
            (tab: any) =>
              tabBelongsToTable(
                tab,
                selectedTable,
              ),
          )

        const now =
          new Date().toISOString()

        /**
         * Reuse existing tab ID.
         *
         * Prevents duplicate open_tabs.
         */
        const tabId =
          existingTab?.id ??
          selectedTable.id

        const tab = {
          id: tabId,

          table_id:
            selectedTable.id,

          table_number:
            getTableNumber(
              selectedTable,
            ),

          items,

          total_accumulated:
            Number(totalBill),

          updated_at: now,
        }

        await db.put(
          'open_tabs',
          tab,
        )

        /**
         * Saved cart becomes the new
         * clean baseline.
         */
        const newSnapshot =
          serializeCart(cart)

        setSavedCartSnapshot(
          newSnapshot,
        )

        setHasUnsavedChanges(
          false,
        )

        await loadPOSData()

        /**
         * Start a fresh order after saving.
         *
         * The saved order remains in
         * open_tabs.
         */
        setCart([])

        setSelectedTable(null)

        setSavedCartSnapshot(
          EMPTY_CART_SNAPSHOT,
        )

        setHasUnsavedChanges(
          false,
        )

        setShowCheckout(false)

        setBillOpen(false)

        setManualTip('')

        window.alert(
          isAm
            ? 'ትዕዛዙ በጠረጴዛው ላይ ተቀምጧል!'
            : 'Order saved to table successfully.',
        )
      } catch (error) {
        console.error(
          '[POS] Failed to save table tab:',
          error,
        )

        window.alert(
          isAm
            ? 'ትዕዛዙን ማስቀመጥ አልተቻለም'
            : 'Failed to save table order.',
        )
      } finally {
        setSavingTab(false)
      }
    }

  // ==========================================================
  // CHECKOUT / FINALIZE SALE
  // ==========================================================

  const handleFinalizeSale =
    async (
      splitPayments: PaymentSplit,
    ) => {
      if (
        !activeShift ||
        cart.length === 0
      ) {
        return
      }

      try {
        const paidTable =
          selectedTable

        const sale =
          await finalizeSale({
            splitPayments,

            manualTip,

            activeShift,

            selectedTable:
              paidTable,

            cart,

            totalBill,
          })

        // ------------------------------------------------------
        // REMOVE OPEN TABLE AFTER SUCCESSFUL PAYMENT
        // ------------------------------------------------------

        if (paidTable) {
          const db =
            await getDB()

          if (
            db.objectStoreNames.contains(
              'open_tabs',
            )
          ) {
            const allTabs =
              await db.getAll(
                'open_tabs',
              )

            const matchingTabs =
              allTabs.filter(
                (tab: any) =>
                  tabBelongsToTable(
                    tab,
                    paidTable,
                  ),
              )

            for (
              const tab of matchingTabs
            ) {
              if (
                tab?.id != null
              ) {
                await db.delete(
                  'open_tabs',
                  tab.id,
                )
              }
            }
          }
        }

        await loadPOSData()

        setCart([])

        setSelectedTable(null)

        setSavedCartSnapshot(
          EMPTY_CART_SNAPSHOT,
        )

        setHasUnsavedChanges(
          false,
        )

        setShowCheckout(false)

        setManualTip('')

        setBillOpen(false)

        router.push(
          `/${locale}/sales/${sale.localId}`,
        )
      } catch (error) {
        console.error(
          '[POS] Failed to finalize sale:',
          error,
        )

        window.alert(
          isAm
            ? 'ሽያጩን ማስቀመጥ አልተቻለም'
            : 'Unable to save the sale locally.',
        )
      }
    }

  // ==========================================================
  // DIRECT SAVE BUTTON
  // ==========================================================

  const DirectSaveOrderButton =
    () => {
      /**
       * Completely hidden unless:
       *
       * - table selected
       * - cart has items
       * - actual unsaved changes exist
       */
      if (
        !selectedTable ||
        !cartHasItems ||
        !hasUnsavedChanges
      ) {
        return null
      }

      return (
        <button
          type="button"
          onClick={() => {
            void handleSaveTab()
          }}
          disabled={
            savingTab
          }
          className="
            flex
            h-10
            items-center
            justify-center
            gap-1.5
            rounded-xl
            bg-coffee-900
            px-3
            text-xs
            font-black
            text-white
            shadow-md
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:bg-coffee-800
            hover:shadow-lg
            active:scale-95
            disabled:cursor-not-allowed
            disabled:opacity-60
            sm:h-11
            sm:px-4
            sm:text-sm
          "
        >
          {savingTab ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />

              <span>
                {isAm
                  ? 'በማስቀመጥ ላይ...'
                  : 'Saving...'}
              </span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />

              <span>
                {isAm
                  ? 'አስቀምጥ'
                  : 'Save'}
              </span>
            </>
          )}
        </button>
      )
    }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-berbere-500" />

          <p className="mt-3 text-xs font-black text-coffee-500">
            {isAm
              ? 'በመጫን ላይ...'
              : 'Loading POS...'}
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // OPEN SHIFT SCREEN
  // ==========================================================

  if (!activeShift) {
    return (
      <div className="flex h-dvh items-center justify-center bg-coffee-900 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-cream-50 shadow-elevated">
          <div className="bg-coffee-900 px-6 py-7 text-center text-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15">
              <Coins className="h-6 w-6 text-gold-400" />
            </div>

            <h1 className="mt-4 text-xl font-black">
              {isAm
                ? 'ፈረቃ ይክፈቱ'
                : 'Open Your Shift'}
            </h1>

            <p className="mt-2 text-xs leading-5 text-cream-300">
              {isAm
                ? 'ሽያጭ ለመጀመር የመነሻ ገንዘብ ያስገቡ'
                : 'Enter the starting cash float to begin selling.'}
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-black text-coffee-500">
                {isAm
                  ? 'የመነሻ ገንዘብ'
                  : 'Opening Cash'}
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={
                    cashFloat
                  }
                  onChange={(event) =>
                    setCashFloat(
                      event.target
                        .value,
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-cream-300 bg-cream-100 px-4 pr-14 text-center font-mono text-xl font-black text-coffee-900 outline-none transition focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
                />

                <span className="absolute right-4 top-5 text-xs font-black text-coffee-400">
                  ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleOpenShift
              }
              disabled={
                openingShift
              }
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-berbere-500 text-white shadow-card transition hover:bg-berbere-600 active:scale-[0.98] disabled:opacity-50"
            >
              {openingShift ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="font-black">
                  {isAm
                    ? 'ፈረቃ ክፈት'
                    : 'Open Shift'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================================
  // MAIN POS
  // ==========================================================

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-cream-100 font-sans text-coffee-700">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="relative z-30 shrink-0">
        <POSHeader
          isAm={isAm}
          activeShift={
            activeShift
          }
          selectedTable={
            selectedTable
          }
          totalItems={
            totalItems
          }
          totalBill={
            totalBill
          }
          onCloseShift={
            handleCloseShift
          }
          closingShift={
            closingShift
          }
          cartHasItems={
            cartHasItems
          }
          billOpen={
            billOpen
          }
          onToggleBill={() =>
            setBillOpen(
              (current) =>
                !current,
            )
          }
        />

        {/* ====================================================
            BILL DROPDOWN
        ==================================================== */}

        {billOpen &&
          cartHasItems && (
            <>
              <div
                className="fixed inset-0 z-20 bg-black/5"
                onClick={() =>
                  setBillOpen(false)
                }
                aria-hidden="true"
              />

              <div className="absolute inset-x-0 top-full z-30 flex max-h-[72dvh] flex-col overflow-hidden border-x border-b border-cream-300 bg-cream-50 shadow-[0_14px_28px_rgba(65,45,30,0.14)] lg:inset-x-auto lg:right-3 lg:w-[380px] lg:rounded-b-2xl">
                <POSCart
                  cart={cart}
                  totalBill={
                    totalBill
                  }
                  selectedTable={
                    selectedTable
                  }
                  savingTab={
                    savingTab
                  }
                  onIncrease={
                    increaseQuantity
                  }
                  onDecrease={
                    decreaseQuantity
                  }
                  onClearItem={
                    clearCartItem
                  }
                  onSaveTab={
                    handleSaveTab
                  }
                  onCheckout={() => {
                    setShowCheckout(
                      true,
                    )

                    setBillOpen(
                      false,
                    )
                  }}
                  isAm={isAm}
                  hideHeader
                />
              </div>
            </>
          )}
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="min-h-0 flex-1 overflow-hidden">
        {!showCheckout ? (
          <main className="h-full overflow-y-auto subtle-scrollbar">
            <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-2 pb-24 pt-2 sm:px-3 sm:pb-28 sm:pt-3 lg:px-4 lg:pb-6 lg:pt-4">

              {/* ==================================================
                  TABLE WORKSPACE
              ================================================== */}

              <section className="shrink-0 overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-sm">
                <div className="flex items-center gap-2 border-b border-cream-200 px-3 py-2 sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-coffee-400">
                      {isAm
                        ? 'የሽያጭ ቦታ'
                        : 'Sales Area'}
                    </p>

                    <p className="truncate text-xs font-black text-coffee-800">
                      {selectedTable
                        ? selectedTable.name
                        : isAm
                          ? 'ቀጥታ ሽያጭ'
                          : 'Walk-in Sale'}
                    </p>
                  </div>

                  <div className="ml-auto h-6 w-px bg-cream-300" />

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <POSTableSelector
                      tables={tables}
                      selectedTable={
                        selectedTable
                      }
                      isAm={isAm}
                      onSelectTable={(
                        table,
                      ) => {
                        void handleSelectTable(
                          table,
                        )
                      }}
                      onWalkIn={
                        handleWalkIn
                      }
                    />
                  </div>
                </div>
              </section>

              {/* ==================================================
                  CURRENT ORDER STATUS
              ================================================== */}

              {cartHasItems && (
                <div className="sticky top-2 z-20 mx-1 mt-2 animate-in slide-in-from-top-2 duration-300 sm:mx-0 sm:mt-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-berbere-200 bg-berbere-50/95 p-2 shadow-lg backdrop-blur-md sm:p-2.5">

                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-berbere-100">
                        <ShoppingCart className="h-4 w-4 text-berbere-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-black text-berbere-600">
                          {selectedTable
                            ? selectedTable.name
                            : isAm
                              ? 'ቀጥታ ሽያጭ'
                              : 'Walk-in'}
                        </p>

                        <p className="text-xs font-black text-coffee-900">
                          {totalItems} ·{' '}
                          {totalBill.toLocaleString()}{' '}
                          ETB
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {selectedTable &&
                        hasUnsavedChanges && (
                          <DirectSaveOrderButton />
                        )}

                    <button
                          type="button"
                          onClick={() => {
                            setShowCheckout(
                              true,
                            )

                            setBillOpen(
                              false,
                            )
                          }}
                          className="
                            flex
                            h-10
                            items-center
                            gap-1.5
                            rounded-xl
                            bg-berbere-500
                            px-3
                            text-xs
                            font-black
                            text-white
                            shadow-md
                            transition-all
                            duration-200
                            hover:bg-berbere-600
                            active:scale-95
                          "
                        >
                          <Coins className="h-4 w-4" />

                          <span>
                            {isAm
                              ? 'ክፍያ'
                              : 'Pay'}
                          </span>
                        </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  SEARCH + CATEGORY CONTROLS
              ================================================== */}

              <section className="mt-2 shrink-0 overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-sm sm:mt-3">

                <div className="p-2.5 sm:p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />

                    <input
                      type="search"
                      value={
                        productSearch
                      }
                      onChange={(
                        event,
                      ) =>
                        setProductSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder={
                        isAm
                          ? 'ምርት ይፈልጉ...'
                          : 'Search products...'
                      }
                      className="h-10 w-full rounded-xl border border-cream-300 bg-cream-100 pl-10 pr-10 text-sm font-bold text-coffee-800 outline-none transition placeholder:text-coffee-400 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100 sm:h-11"
                      aria-label={
                        isAm
                          ? 'ምርት ይፈልጉ'
                          : 'Search products'
                      }
                    />

                    {productSearch && (
                      <button
                        type="button"
                        onClick={() =>
                          setProductSearch(
                            '',
                          )
                        }
                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-coffee-400 transition hover:bg-cream-200 hover:text-coffee-700"
                        aria-label={
                          isAm
                            ? 'ፍለጋ አጽዳ'
                            : 'Clear search'
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {productSearch.trim() && (
                    <div className="mt-1.5 px-1 text-[10px] font-bold text-coffee-400">
                      {isAm
                        ? `${filteredProducts.length} ምርቶች ተገኝተዋል`
                        : `${filteredProducts.length} product${filteredProducts.length ===
                          1
                          ? ''
                          : 's'
                        } found`}
                    </div>
                  )}
                </div>

                <div className="border-t border-cream-200 px-2.5 py-2 sm:px-3">
                  <POSCategories
                    categories={
                      categories
                    }
                    selectedCategoryId={
                      selectedCategoryId
                    }
                    onSelectCategory={
                      setSelectedCategoryId
                    }
                    isAm={isAm}
                  />
                </div>
              </section>

              {/* ==================================================
                  PRODUCTS
              ================================================== */}

              <section className="mt-2 min-h-[420px] flex-1 sm:mt-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-sm font-black text-coffee-900 sm:text-base">
                      {isAm
                        ? 'ምርቶች'
                        : 'Products'}
                    </h2>

                    <p className="text-[10px] font-semibold text-coffee-400">
                      {
                        filteredProducts.length
                      }{' '}
                      {isAm
                        ? 'ምርቶች'
                        : filteredProducts.length ===
                          1
                          ? 'product'
                          : 'products'}
                    </p>
                  </div>

                  {cartHasItems && (
                    <div className="rounded-full bg-berbere-50 px-2.5 py-1 text-[10px] font-black text-berbere-600">
                      {totalItems}{' '}
                      {isAm
                        ? 'እቃ'
                        : 'items'}{' '}
                      ·{' '}
                      {totalBill.toLocaleString()}{' '}
                      ETB
                    </div>
                  )}
                </div>

                <div className="min-h-[360px] rounded-2xl border border-cream-300 bg-cream-50 p-2.5 shadow-sm sm:p-3">
                  <POSProductGrid
                    products={
                      filteredProducts
                    }
                    cartProductIds={
                      cartProductIds
                    }
                    onAddProduct={
                      addToCart
                    }
                    isAm={isAm}
                  />
                </div>
              </section>
            </div>

            {/* ==================================================
                SAVE BAR
            ================================================== */}

            {canSaveTableOrder && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-cream-50/95 p-2 shadow-[0_-8px_24px_rgba(65,45,30,0.12)] backdrop-blur sm:p-3 lg:static lg:mt-4 lg:border lg:shadow-sm lg:backdrop-blur-0">
                <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 lg:px-1">

                  <div className="hidden min-w-0 flex-1 sm:block">
                    <p className="truncate text-xs font-black text-coffee-900">
                      {selectedTable?.name}
                    </p>

                    <p className="text-[10px] font-semibold text-coffee-400">
                      {totalItems}{' '}
                      {isAm
                        ? 'እቃ'
                        : totalItems ===
                          1
                          ? 'item'
                          : 'items'}{' '}
                      ·{' '}
                      {totalBill.toLocaleString()}{' '}
                      ETB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setBillOpen(
                        true,
                      )
                    }
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-cream-100 px-3 text-sm font-black text-coffee-800 transition hover:bg-cream-200 sm:flex-none"
                  >
                    <ShoppingCart className="h-4 w-4" />

                    <span>
                      {isAm
                        ? 'ትዕዛዝ'
                        : 'Order'}
                    </span>
                  </button>

                  <div className="flex-[1.4] sm:flex-none">
                    <DirectSaveOrderButton />
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : (
          // ====================================================
          // CHECKOUT
          // ====================================================

          <main className="h-full overflow-y-auto subtle-scrollbar">
            <div className="mx-auto w-full max-w-2xl p-3 sm:p-4 lg:p-6">
              <POSCheckout
                cart={cart}
                totalBill={
                  totalBill
                }
                selectedTable={
                  selectedTable
                }
                manualTip={
                  manualTip
                }
                onManualTipChange={
                  setManualTip
                }
                onBack={() =>
                  setShowCheckout(
                    false,
                  )
                }
                onConfirmPayment={
                  handleFinalizeSale
                }
                isAm={isAm}
              />
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

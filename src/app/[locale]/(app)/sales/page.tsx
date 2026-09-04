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
  ShoppingCart,
} from 'lucide-react'

import { getDB } from '../../../../lib/offline/db'

import type { Shift } from '../../../../types/database/operations'

import { finalizeSale } from '@/lib/offline/saleService'

import POSHeader from '../../../../components/pos/POSHeader'
import POSBillDropdown from '@/components/pos/POSBillDropdown'

import type {
  POSCartItem,
  POSCategory,
  POSProduct,
  POSTable,
  PaymentSplit,
} from '../../../../components/pos/types'

import {
  calculateCartTotal,
  calculateCartItemCount,
  createCartQuantityMap,

  addToCart as addToCartLogic,
  increaseCartQuantity,
  decreaseCartQuantity,
  removeCartItem,

  filterPOSProducts,

  serializeCart,
  EMPTY_CART_SNAPSHOT,

  notifyInventoryUpdated,

  DEFAULT_CASH_FLOAT,

  tabBelongsToTable,
  loadPOSDataFromDB,
  restoreCartFromTab,

  saveTableTab,
  removeOpenTabsForTable,
} from '@/components/pos/posUtils'

import POSTableSelector from '@/components/pos/POSTableSelector'
import POSCategories from '@/components/pos/POSCategories'
import POSProductGrid from '@/components/pos/POSProductGrid'
import POSCheckout from '@/components/pos/POSCheckout'
import POSSearch from '@/components/ui/Search'

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
   * True only when the selected table
   * contains changes that are not saved.
   */
  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] = useState(false)

  /**
   * Last saved snapshot for the
   * currently selected table.
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

        const data =
          await loadPOSDataFromDB(db)

        setActiveShift(
          data.activeShift,
        )

        setProducts(
          data.products,
        )

        setCategories(
          data.categories,
        )

        setTables(
          data.tables,
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
    useMemo(
      () =>
        filterPOSProducts({
          products,
          categoryId:
            selectedCategoryId,
          search: productSearch,
        }),
      [
        products,
        selectedCategoryId,
        productSearch,
      ],
    )

  // ==========================================================
  // CART CALCULATIONS
  // ==========================================================

  const totalBill =
    useMemo(
      () =>
        calculateCartTotal(cart),
      [cart],
    )

  const totalItems =
    useMemo(
      () =>
        calculateCartItemCount(cart),
      [cart],
    )

  const cartQuantities =
    useMemo(
      () =>
        createCartQuantityMap(cart),
      [cart],
    )

  const cartHasItems =
    cart.length > 0

  // ==========================================================
  // UNSAVED ORDER STATE
  // ==========================================================

  /**
   * Empty carts are always considered clean.
   *
   * This prevents unnecessary confirmation
   * dialogs when switching between empty tables.
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
   * Automatically close the bill
   * when the cart becomes empty.
   */
  useEffect(() => {
    if (!cartHasItems) {
      setBillOpen(false)
    }
  }, [cartHasItems])
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

          const restoredCart =
            restoreCartFromTab(
              existingTab,
            )

          setCart(
            restoredCart,
          )

          setSavedCartSnapshot(
            serializeCart(
              restoredCart,
            ),
          )

          setHasUnsavedChanges(
            false,
          )
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
       * Confirm only when the current
       * table actually has unsaved items.
       */
      if (
        selectedTable &&
        selectedTable.id !==
        table.id &&
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

      setSelectedTable(table)

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
       * Confirm only when leaving
       * a table with unsaved work.
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

  /**
   * Keep the existing page-level function name.
   *
   * Actual cart logic lives in posUtils.ts.
   */
  const addToCart =
    (
      product: POSProduct,
    ) => {
      setCart(
        (currentCart) =>
          addToCartLogic(
            currentCart,
            product,
          ),
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

  /**
   * Keep the existing page-level API.
   *
   * Actual mutation logic lives in posUtils.ts.
   */
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
          increaseCartQuantity(
            currentCart,
            id,
            amount,
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

  /**
   * Keep the existing page-level API.
   */
  const decreaseQuantity =
    (id: string) => {
      setCart(
        (currentCart) =>
          decreaseCartQuantity(
            currentCart,
            id,
          ),
      )

      if (selectedTable) {
        setHasUnsavedChanges(
          true,
        )
      }
    }

  const setCartQuantity = (id: string, quantity: number) => {
    const nextQuantity = Math.max(
      0,
      Math.floor(Number(quantity) || 0),
    )

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
              ...item,
              quantity: nextQuantity,
            }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )

    if (selectedTable) {
      setHasUnsavedChanges(true)
    }
  }
  // ==========================================================
  // CART - CLEAR ITEM
  // ==========================================================

  /**
   * Keep the existing page-level API.
   */
  const clearCartItem =
    (id: string) => {
      setCart(
        (currentCart) =>
          removeCartItem(
            currentCart,
            id,
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

  const handleSaveTab = async () => {
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
      const db = await getDB()

      const result =
        await saveTableTab({
          db,
          table: selectedTable,
          cart,
          totalBill,
        })

      setSavedCartSnapshot(
        result.snapshot,
      )

      setHasUnsavedChanges(false)

      await loadPOSData()

      // Start a fresh order.
      // The saved order remains in IndexedDB.
      setCart([])

      setSelectedTable(null)

      setSavedCartSnapshot(
        EMPTY_CART_SNAPSHOT,
      )

      setHasUnsavedChanges(false)

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

        // Sale successfully saved locally.
        notifyInventoryUpdated(
          sale.localId,
        )

        // Remove the saved table order
        // after successful payment.
        if (paidTable) {
          const db =
            await getDB()

          await removeOpenTabsForTable(
            db,
            paidTable,
          )
        }

        await loadPOSData()

        setCart([])

        setSelectedTable(null)

        setSavedCartSnapshot(
          EMPTY_CART_SNAPSHOT,
        )

        setHasUnsavedChanges(false)

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
                  onChange={(
                    event,
                  ) =>
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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-cream-100 font-sans text-coffee-700">
      {/* ======================================================
        POS HEADER
    ====================================================== */}

      <div className="relative z-50 shrink-0">
        <POSHeader
          isAm={isAm}
          activeShift={activeShift}
          selectedTable={selectedTable}
          totalItems={totalItems}
          totalBill={totalBill}
          onCloseShift={handleCloseShift}
          closingShift={closingShift}
          cartHasItems={cartHasItems}
          billOpen={billOpen}
          onToggleBill={() =>
            setBillOpen((current) => !current)
          }
        />

        {/* ====================================================
          CURRENT BILL / ORDER DROPDOWN
      ==================================================== */}

        {billOpen && cartHasItems && (
          <POSBillDropdown
            cart={cart}
            totalBill={totalBill}
            selectedTable={selectedTable}
            savingTab={savingTab}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            onClearItem={clearCartItem}
            onSaveTab={handleSaveTab}
            onCheckout={() => {
              setShowCheckout(true)
              setBillOpen(false)
            }}
            onClose={() => setBillOpen(false)}
            isAm={isAm}
          />
        )}
      </div>

      {/* ======================================================
        POS CONTENT
    ====================================================== */}

      <div className="min-h-0 flex-1 overflow-hidden">
        {!showCheckout ? (
          <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden subtle-scrollbar">
            <div
              className="
    mx-auto
    flex
    w-full
    max-w-[1600px]
    flex-col
    px-2
    pb-[calc(5rem+env(safe-area-inset-bottom))]
    pt-1.5
    sm:px-3
    sm:pb-[calc(5rem+env(safe-area-inset-bottom))]
    sm:pt-2
    lg:px-4
    lg:pb-6
    lg:pt-2.5
  "
            >
              {/* ==================================================
                TABLE + ORDER ACTIONS
            ================================================== */}

              <section
                className="
                sticky
                top-0
                z-30
                shrink-0
                overflow-hidden
                rounded-lg
                border
                border-cream-300
                bg-cream-50/95
                shadow-sm
                backdrop-blur-md
              "
              >
                <div
                  className="
                  flex
                  min-h-10
                  items-center
                  gap-1.5
                  px-1.5
                  py-1
                  sm:px-2
                "
                >
                  {/* TABLE SELECTOR */}

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <POSTableSelector
                      tables={tables}
                      selectedTable={selectedTable}
                      isAm={isAm}
                      onSelectTable={(table) => {
                        void handleSelectTable(table)
                      }}
                      onWalkIn={handleWalkIn}
                    />
                  </div>

                  {/* ORDER ACTIONS */}

                  {cartHasItems && (
                    <div className="flex shrink-0 items-center gap-1">
                      {selectedTable && hasUnsavedChanges && (
                        <DirectSaveOrderButton />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckout(true)
                          setBillOpen(false)
                        }}
                        className="
                        flex
                        h-8
                        shrink-0
                        items-center
                        justify-center
                        gap-1
                        rounded-lg
                        bg-berbere-500
                        px-2.5
                        text-[11px]
                        font-black
                        text-white
                        shadow-sm
                        transition
                        hover:bg-berbere-600
                        active:scale-95
                      "
                      >
                        <Coins className="h-3.5 w-3.5" />

                        <span>
                          {isAm ? 'ክፍያ' : 'Pay'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* ==================================================
                SEARCH + CATEGORIES
            ================================================== */}

              <section
                className="
                mt-1.5
                shrink-0
                overflow-hidden
                rounded-lg
                border
                border-cream-300
                bg-cream-50
                shadow-sm
                sm:mt-2
              "
              >
                <POSSearch
                  value={productSearch}
                  onChange={setProductSearch}
                  resultCount={filteredProducts.length}
                  isAm={isAm}
                />

                <div
                  className="
                  border-t
                  border-cream-200
                  px-1.5
                  py-1
                  sm:px-2
                "
                >
                  <POSCategories
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    isAm={isAm}
                  />
                </div>
              </section>

              {/* ==================================================
                PRODUCTS
            ================================================== */}

              <section className="mt-2 shrink-0 sm:mt-2.5">
                <div className="mb-1.5 flex items-center px-1">
                  <div>
                    <h2 className="text-sm font-black text-coffee-900 sm:text-base">
                      {isAm ? 'ምርቶች' : 'Products'}
                    </h2>

                    <p className="text-[10px] font-semibold text-coffee-400">
                      {filteredProducts.length}{' '}
                      {isAm
                        ? 'ምርቶች'
                        : filteredProducts.length === 1
                          ? 'product'
                          : 'products'}
                    </p>
                  </div>
                </div>

                <div className="w-full">
                  <POSProductGrid
                    products={filteredProducts}
                    cartQuantities={cartQuantities}
                    onAddProduct={addToCart}
                    onIncreaseQuantity={(id) => increaseQuantity(id)}
                    onDecreaseQuantity={(id) => decreaseQuantity(id)}
                    onSetQuantity={setCartQuantity}
                    isAm={isAm}
                  />
                </div>
              </section>
            </div>
          </main>
        ) : (
          // ====================================================
          // CHECKOUT
          // ====================================================

          <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden subtle-scrollbar">
            <div className="mx-auto w-full max-w-2xl p-3 sm:p-4 lg:p-6">
              <POSCheckout
                cart={cart}
                totalBill={totalBill}
                selectedTable={selectedTable}
                manualTip={manualTip}
                onManualTipChange={setManualTip}
                onBack={() => setShowCheckout(false)}
                onConfirmPayment={handleFinalizeSale}
                isAm={isAm}
              />
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
// src/app/[locale]/(app)/sales/page.tsx
'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Coins, Loader2 } from 'lucide-react'

import { getDB } from '../../../../lib/offline/db'
import type { Shift } from '../../../../types/database/operations'
import { finalizeSale } from '@/lib/offline/saleService'
import { useBusinessContext } from '@/lib/auth/useBusinessContext'

import POSHeader from '../../../../components/pos/POSHeader'
import POSBillDropdown from '@/components/pos/POSBillDropdown'
import POSTableSelector from '@/components/pos/POSTableSelector'
import POSCategories from '@/components/pos/POSCategories'
import POSProductGrid from '@/components/pos/POSProductGrid'
import POSCheckout from '@/components/pos/POSCheckout'
import SellerDailyStatement from '@/components/pos/SellerDailyStatement'
import POSSearch from '@/components/ui/Search'

import { useToast } from '@/components/ui/ToastProvider'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

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
  saveTableTab
} from '@/components/pos/posUtils'

// ============================================================
// PAGE
// ============================================================

export default function SalesPage() {
  const params = useParams()
  const router = useRouter()
  const locale = String(params.locale || 'en')
  const isAm = locale === 'am'

  const { toast } = useToast()

  const {
    businessId,
    branchId,
    userId,
    loading: businessContextLoading,
    error: businessContextError,
  } = useBusinessContext()

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [tables, setTables] = useState<POSTable[]>([])

  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [selectedTable, setSelectedTable] =
    useState<POSTable | null>(null)
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [activeShift, setActiveShift] = useState<Shift | null>(null)

  const [showCheckout, setShowCheckout] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [savingTab, setSavingTab] = useState(false)
  const [openingShift, setOpeningShift] = useState(false)
  const [closingShift, setClosingShift] = useState(false)

  const [cashFloat, setCashFloat] =
    useState(DEFAULT_CASH_FLOAT)
  const [manualTip, setManualTip] = useState('')

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false)

  const [savedCartSnapshot, setSavedCartSnapshot] =
    useState(EMPTY_CART_SNAPSHOT)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: (() => void) | null
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  })

  const closeConfirmDialog = () =>
    setConfirmDialog({
      open: false,
      title: '',
      message: '',
      onConfirm: null,
    })

  // =========================================================
  // LEGACY SHIFT REPAIR
  // =========================================================

  const normalizeActiveShiftContext = useCallback(
    async (
      shift: Shift | null,
    ): Promise<Shift | null> => {
      if (!shift) {
        return null
      }

      /*
       * We only repair the old placeholder identities
       * created by the previous POS implementation.
       *
       * We do NOT blindly overwrite legitimate shift
       * business/branch/cashier IDs.
       */
      const hasLegacyBusinessId =
        shift.business_id ===
        'biz_active'

      const hasLegacyBranchId =
        shift.branch_id ===
        'branch_main'

      const hasLegacyCashierId =
        shift.cashier_id ===
        'cashier_default'

      if (
        !hasLegacyBusinessId &&
        !hasLegacyBranchId &&
        !hasLegacyCashierId
      ) {
        return shift
      }

      if (
        !businessId ||
        !branchId ||
        !userId
      ) {
        console.warn(
          '[POS] Cannot repair legacy active shift yet. Business context is incomplete.',
          {
            businessId,
            branchId,
            userId,
          },
        )

        return shift
      }

      const repairedShift: Shift = {
        ...shift,

        business_id:
          businessId,

        branch_id:
          branchId,

        cashier_id:
          userId,

        opened_by:
          shift.opened_by ===
            'cashier_default'
            ? userId
            : shift.opened_by,

        updated_at:
          new Date().toISOString(),
      }

      const db = await getDB()

      await db.put(
        'active_shift',
        repairedShift,
      )

      console.log(
        '[POS] Repaired legacy active shift context:',
        {
          businessId:
            repairedShift.business_id,

          branchId:
            repairedShift.branch_id,

          cashierId:
            repairedShift.cashier_id,
        },
      )

      return repairedShift
    },
    [
      businessId,
      branchId,
      userId,
    ],
  )

  // ==========================================================
  // LOAD POS DATA
  // ==========================================================
  const loadPOSData = useCallback(
    async () => {
      try {
        const db = await getDB()

        let currentShift =
          (await db.get(
            'active_shift',
            'current',
          )) || null

        /*
         * Repair the legacy shift before loading
         * products/inventory.
         *
         * This is critical because loadPOSDataFromDB()
         * uses active_shift.branch_id to match inventory.
         */
        if (currentShift) {
          const repairedShift =
            await normalizeActiveShiftContext(
              currentShift,
            )

          currentShift =
            repairedShift
        }

        const data =
          await loadPOSDataFromDB(db)

        /*
         * loadPOSDataFromDB() reads active_shift itself,
         * so after repairing it, its returned value should
         * contain the corrected branch_id.
         */
        setActiveShift(
          data.activeShift ??
          currentShift,
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
    },
    [
      normalizeActiveShiftContext,
    ],
  )

  useEffect(() => {
    if (businessContextLoading) {
      return
    }

    void loadPOSData()
  }, [
    businessContextLoading,
    loadPOSData,
  ])

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const filteredProducts = useMemo(
    () =>
      filterPOSProducts({
        products,
        categoryId: selectedCategoryId,
        search: productSearch,
      }),
    [products, selectedCategoryId, productSearch],
  )

  const totalBill = useMemo(
    () => calculateCartTotal(cart),
    [cart],
  )

  const totalItems = useMemo(
    () => calculateCartItemCount(cart),
    [cart],
  )

  const cartQuantities = useMemo(
    () => createCartQuantityMap(cart),
    [cart],
  )

  const cartHasItems = cart.length > 0

  // ==========================================================
  // UNSAVED ORDER STATE
  // ==========================================================

  useEffect(() => {
    if (!selectedTable || !cartHasItems) {
      setHasUnsavedChanges(false)
      return
    }

    setHasUnsavedChanges(
      serializeCart(cart) !== savedCartSnapshot,
    )
  }, [
    cart,
    cartHasItems,
    selectedTable,
    savedCartSnapshot,
  ])

  useEffect(() => {
    if (!cartHasItems) setBillOpen(false)
  }, [cartHasItems])

  // ==========================================================
  // LOAD TABLE ORDER
  // ==========================================================

  const loadTableTab = useCallback(
    async (table: POSTable) => {
      try {
        const db = await getDB()

        if (!db.objectStoreNames.contains('open_tabs')) {
          setCart([])
          setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
          setHasUnsavedChanges(false)
          return
        }

        const allTabs = await db.getAll('open_tabs')

        const existingTab = allTabs.find((tab: any) =>
          tabBelongsToTable(tab, table),
        )

        const restoredCart =
          restoreCartFromTab(existingTab)

        setCart(restoredCart)
        setSavedCartSnapshot(
          serializeCart(restoredCart),
        )
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error(
          '[POS] Failed to load table tab:',
          error,
        )

        setCart([])
        setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
        setHasUnsavedChanges(false)
      }
    },
    [],
  )

  // ==========================================================
  // SELECT TABLE
  // ==========================================================

  const handleSelectTable = async (table: POSTable) => {
    if (
      selectedTable &&
      selectedTable.id !== table.id &&
      cartHasItems &&
      hasUnsavedChanges
    ) {
      setConfirmDialog({
        open: true,
        title: isAm ? 'ያልተቀመጠ ትዕዛዝ' : 'Unsaved order',
        message: isAm
          ? 'ያለዎትን ትዕዛዝ ሳያስቀምጡ ወደ ሌላ ጠረጴዛ መቀየር ይፈልጋሉ?'
          : 'You have an unsaved order. Do you want to switch tables without saving it?',
        onConfirm: () => {
          closeConfirmDialog()
          setSelectedTable(table)
          void loadTableTab(table)
          setShowCheckout(false)
          setBillOpen(false)
          setManualTip('')
        },
      })

      return
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

  const handleWalkIn = () => {
    if (
      selectedTable &&
      cartHasItems &&
      hasUnsavedChanges
    ) {
      setConfirmDialog({
        open: true,
        title: isAm ? 'ያልተቀመጠ ትዕዛዝ' : 'Unsaved order',
        message: isAm
          ? 'ያለዎትን ትዕዛዝ ሳያስቀምጡ ወደ ቀጥታ ሽያጭ መሄድ ይፈልጋሉ?'
          : 'Switch to walk-in without saving the current order?',
        onConfirm: () => {
          closeConfirmDialog()

          setSelectedTable(null)
          setCart([])
          setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
          setHasUnsavedChanges(false)
          setShowCheckout(false)
          setBillOpen(false)
          setManualTip('')
        },
      })

      return
    }

    setSelectedTable(null)
    setCart([])
    setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
    setHasUnsavedChanges(false)
    setShowCheckout(false)
    setBillOpen(false)
    setManualTip('')
  }

  // ==========================================================
  // CART
  // ==========================================================

  const addToCart = (product: POSProduct) => {
    setCart((current) =>
      addToCartLogic(current, product),
    )

    if (selectedTable) setHasUnsavedChanges(true)
  }

  const increaseQuantity = (
    id: string,
    amount = 1,
  ) => {
    if (amount <= 0) return

    setCart((current) =>
      increaseCartQuantity(current, id, amount),
    )

    if (selectedTable) setHasUnsavedChanges(true)
  }

  const decreaseQuantity = (id: string) => {
    setCart((current) =>
      decreaseCartQuantity(current, id),
    )

    if (selectedTable) setHasUnsavedChanges(true)
  }

  const setCartQuantity = (
    id: string,
    quantity: number,
  ) => {
    const nextQuantity = Math.max(
      0,
      Math.floor(Number(quantity) || 0),
    )

    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: nextQuantity }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )

    if (selectedTable) setHasUnsavedChanges(true)
  }

  const clearCartItem = (id: string) => {
    setCart((current) =>
      removeCartItem(current, id),
    )

    if (selectedTable) setHasUnsavedChanges(true)
  }

  // ==========================================================
  // SHIFT
  // ==========================================================

  const handleOpenShift = async () => {
    if (openingShift) return

    if (
      businessContextLoading
    ) {
      toast(
        isAm
          ? 'የንግድ መረጃ እየተጫነ ነው። እባክዎ ይጠብቁ።'
          : 'Business context is still loading. Please wait.',
        'info',
      )

      return
    }

    if (
      !businessId ||
      !branchId ||
      !userId
    ) {
      console.error(
        '[POS] Cannot open shift. Missing business context:',
        {
          businessId,
          branchId,
          userId,
          businessContextError,
        },
      )

      toast(
        isAm
          ? 'የንግድ፣ ቅርንጫፍ ወይም ተጠቃሚ መረጃ አልተገኘም።'
          : 'Business, branch, or cashier context is unavailable.',
        'error',
      )

      return
    }

    setOpeningShift(true)

    try {
      const db = await getDB()

      const openingCash =
        Number.parseFloat(
          cashFloat,
        ) || 0

      const now =
        new Date().toISOString()

      const newShift: Shift = {
        id: 'current',

        business_id:
          businessId,

        branch_id:
          branchId,

        cashier_id:
          userId,

        opened_by:
          userId,

        closed_by:
          null,

        shift_label:
          `Shift-${new Date().toLocaleDateString()}` as Shift['shift_label'],

        opened_at:
          now,

        closed_at:
          null,

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

        total_sales:
          0,

        total_transactions:
          0,

        status:
          'open' as Shift['status'],

        is_first_shift:
          false,

        notes:
          null,

        created_at:
          now,

        updated_at:
          now,

        closing_float:
          null,

        actual_cash:
          null,

        difference:
          null,
      }

      await db.put(
        'active_shift',
        newShift,
      )

      setActiveShift(
        newShift,
      )

      /*
       * Log the exact context used by the POS.
       * Very useful while testing the branch/inventory
       * relationship.
       */
      console.log(
        '[POS] Shift opened with business context:',
        {
          businessId:
            newShift.business_id,

          branchId:
            newShift.branch_id,

          cashierId:
            newShift.cashier_id,
        },
      )

      toast(
        isAm
          ? 'ፈረቃው በተሳካ ሁኔታ ተከፍቷል'
          : 'Shift opened successfully.',
        'success',
      )
    } catch (error) {
      console.error(
        '[POS] Failed to open shift:',
        error,
      )

      toast(
        isAm
          ? 'ፈረቃ መክፈት አልተሳካም'
          : 'Failed to open shift.',
        'error',
      )
    } finally {
      setOpeningShift(
        false,
      )
    }
  }

  const handleCloseShift = async () => {
    if (closingShift) return

    setConfirmDialog({
      open: true,
      title: isAm ? 'ፈረቃ ዝጋ' : 'Close shift',
      message: isAm
        ? 'የአሁኑን ፈረቃ መዝጋት ይፈልጋሉ?'
        : 'Are you sure you want to close this shift?',
      onConfirm: () => {
        closeConfirmDialog()
        void closeShift()
      },
    })
  }

  const closeShift = async () => {
    if (closingShift) return

    setClosingShift(true)

    try {
      const db = await getDB()

      await db.delete('active_shift', 'current')

      setActiveShift(null)
      setCart([])
      setSelectedTable(null)
      setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
      setHasUnsavedChanges(false)
      setShowCheckout(false)
      setManualTip('')
      setBillOpen(false)

      toast(
        isAm
          ? 'ፈረቃው ተዘግቷል'
          : 'Shift closed successfully.',
        'success',
      )
    } catch (error) {
      console.error(
        '[POS] Failed to close shift:',
        error,
      )

      toast(
        isAm
          ? 'ፈረቃ መዝጋት አልተሳካም'
          : 'Failed to close shift.',
        'error',
      )
    } finally {
      setClosingShift(false)
    }
  }

  // ==========================================================
  // SAVE TABLE ORDER
  // ==========================================================

  const handleSaveTab = async () => {
    if (
      !selectedTable ||
      !cartHasItems ||
      !hasUnsavedChanges ||
      savingTab
    ) {
      return
    }

    setSavingTab(true)

    try {
      const db = await getDB()

      const result = await saveTableTab({
        db,
        table: selectedTable,
        cart,
        totalBill,
      })

      setSavedCartSnapshot(result.snapshot)
      setHasUnsavedChanges(false)

      await loadPOSData()

      setCart([])
      setSelectedTable(null)
      setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
      setHasUnsavedChanges(false)
      setShowCheckout(false)
      setBillOpen(false)
      setManualTip('')

      toast(
        isAm
          ? 'ትዕዛዙ በጠረጴዛው ላይ ተቀምጧል!'
          : 'Order saved to table successfully.',
        'success',
      )
    } catch (error) {
      console.error(
        '[POS] Failed to save table tab:',
        error,
      )

      toast(
        isAm
          ? 'ትዕዛዙን ማስቀመጥ አልተቻለም'
          : 'Failed to save table order.',
        'error',
      )
    } finally {
      setSavingTab(false)
    }
  }

  // ==========================================================
  // FINALIZE SALE
  // ==========================================================

  // ==========================================================
  // FINALIZE SALE
  // ==========================================================

  // ==========================================================
  // FINALIZE SALE
  // ==========================================================

  const handleFinalizeSale = async (
    splitPayments: PaymentSplit,
  ) => {
    if (!activeShift || cart.length === 0) return

    try {
      const sale = await finalizeSale({
        splitPayments,
        manualTip,
        activeShift,
        selectedTable,
        cart,
        totalBill,
      })

      notifyInventoryUpdated(sale.localId)

      await loadPOSData()

      setCart([])
      setSelectedTable(null)
      setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
      setHasUnsavedChanges(false)
      setShowCheckout(false)
      setManualTip('')
      setBillOpen(false)

      // ======================================================
      // SALE SUCCESS
      // ======================================================

      toast(
        isAm
          ? 'ሽያጩ በተሳካ ሁኔታ ተቀምጧል'
          : 'Sale completed successfully.',
        'success',
      )

      // ======================================================
      // INVENTORY WARNING
      // ======================================================

      if (sale.inventoryWarnings.length > 0) {
        toast(
          isAm
            ? 'ሽያጩ ተቀምጧል፣ ለአንዳንድ ምርቶች የኢንቬንተሪ ማስጠንቀቂያ አለ።'
            : 'Sale saved, but inventory warnings were detected for some products.',
          'warning',
        )
      }

      // ======================================================
      // OPEN SALE RECEIPT
      // ======================================================

      router.push(
        `/${locale}/sales/${sale.localId}`,
      )
    } catch (error) {
      console.error(
        '[POS] Failed to finalize sale:',
        error,
      )

      toast(
        isAm
          ? 'ሽያጩን ማስቀመጥ አልተሳካም'
          : 'Unable to save the sale locally.',
        'error',
      )
    }
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
            {isAm ? 'በመጫን ላይ...' : 'Loading POS...'}
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // OPEN SHIFT
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
              {isAm ? 'ፈረቃ ይክፈቱ' : 'Open Your Shift'}
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
                  value={cashFloat}
                  onChange={(event) =>
                    setCashFloat(event.target.value)
                  }
                  className="
                    h-14 w-full rounded-2xl border border-cream-300
                    bg-cream-100 px-4 pr-14 text-center font-mono
                    text-xl font-black text-coffee-900 outline-none
                    transition focus:border-berbere-400
                    focus:ring-2 focus:ring-berbere-100
                  "
                />

                <span className="absolute right-4 top-5 text-xs font-black text-coffee-400">
                  ETB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleOpenShift()
              }}
              disabled={
                openingShift ||
                businessContextLoading ||
                !businessId ||
                !branchId ||
                !userId
              }
              className="
                flex h-14 w-full items-center justify-center gap-2
                rounded-2xl bg-berbere-500 text-white shadow-card
                transition hover:bg-berbere-600 active:scale-[0.98]
                disabled:opacity-50
              "
            >
              {openingShift ||
                businessContextLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />

                  <span className="font-black">
                    {isAm
                      ? 'በመጫን ላይ...'
                      : 'Loading...'}
                  </span>
                </>
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
      {/* POS HEADER */}

      <div className="relative z-50 shrink-0">
        <POSHeader
          isAm={isAm}
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
          onCheckout={() => {
            setShowCheckout(true)
            setBillOpen(false)
          }}
          hasUnsavedTableOrder={Boolean(
            selectedTable && cartHasItems && hasUnsavedChanges,
          )}
          savingTab={savingTab}
          onSaveOrder={handleSaveTab}
        />

        {/* CURRENT BILL */}

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

      {/* POS CONTENT */}

      <div className="min-h-0 flex-1 overflow-hidden">
        {!showCheckout ? (
          <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden subtle-scrollbar">
            <div
              className="
                mx-auto flex w-full max-w-[1600px] flex-col
                px-2 pb-[calc(5rem+env(safe-area-inset-bottom))]
                pt-1.5 sm:px-3 sm:pt-2
                lg:px-4 lg:pb-6 lg:pt-2.5
              "
            >
              <SellerDailyStatement
                businessId={businessId}
                branchId={branchId}
                cashierId={activeShift.cashier_id ?? userId}
                locale={locale}
                isAm={isAm}
              />

              {/* TABLE + ACTIONS */}

              <section
                className="
                  sticky top-0 z-30 shrink-0 overflow-hidden
                  rounded-lg border border-cream-300 bg-cream-50/95
                  shadow-sm backdrop-blur-md
                "
              >
                <div className="flex min-h-10 items-center gap-1.5 px-1.5 py-1 sm:px-2">
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

                </div>
              </section>

              {/* SEARCH + CATEGORIES */}

              <section
                className="
                  mt-1.5 shrink-0 overflow-hidden rounded-lg
                  border border-cream-300 bg-cream-50 shadow-sm
                  sm:mt-2
                "
              >
                <POSSearch
                  value={productSearch}
                  onChange={setProductSearch}
                  resultCount={filteredProducts.length}
                  isAm={isAm}
                />

                <div className="border-t border-cream-200 px-1.5 py-1 sm:px-2">
                  <POSCategories
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    isAm={isAm}
                  />
                </div>
              </section>

              {/* PRODUCTS */}

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

                <POSProductGrid
                  products={filteredProducts}
                  cartQuantities={cartQuantities}
                  onAddProduct={addToCart}
                  onIncreaseQuantity={(id) =>
                    increaseQuantity(id)
                  }
                  onDecreaseQuantity={(id) =>
                    decreaseQuantity(id)
                  }
                  onSetQuantity={setCartQuantity}
                  isAm={isAm}
                />
              </section>
            </div>
          </main>
        ) : (
          // CHECKOUT

          <main className="h-full min-h-0 overflow-y-auto overflow-x-hidden subtle-scrollbar">
            <div
  className="
    mx-auto w-full max-w-2xl
    p-3 pb-[calc(6rem+env(safe-area-inset-bottom))]
    sm:p-4
    lg:p-6 lg:pb-6
  "
>
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

      {/* CONFIRMATION UI */}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={isAm ? 'አዎ' : 'Continue'}
        cancelLabel={isAm ? 'ሰርዝ' : 'Cancel'}
        onConfirm={() => {
          confirmDialog.onConfirm?.()
        }}
        onCancel={closeConfirmDialog}
      />
    </div>
  )
}

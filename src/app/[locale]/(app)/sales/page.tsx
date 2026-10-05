// src/app/[locale]/(app)/sales/page.tsx
'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, Coins, LayoutGrid, Loader2, Search, Send, WifiOff, X } from 'lucide-react'

import { getDB } from '../../../../lib/offline/db'
import type { Shift } from '../../../../types/database/operations'
import { finalizeSale } from '@/lib/offline/saleService'
import {
  sanitizeActiveShiftContext,
  isSameOpenShiftInstance,
  isDuplicateShiftClosure,
  toLocalActiveShift,
} from '@/lib/offline/shiftContext'
import { useBusinessContext } from '@/lib/auth/useBusinessContext'
import createClient from '@/lib/supabase/client'

import POSHeader from '../../../../components/pos/POSHeader'
import POSBillDropdown from '@/components/pos/POSBillDropdown'
import POSTableSelector from '@/components/pos/POSTableSelector'
import POSCategories from '@/components/pos/POSCategories'
import POSProductGrid from '@/components/pos/POSProductGrid'
import POSCheckout from '@/components/pos/POSCheckout'
import SellerDailyStatement from '@/components/pos/SellerDailyStatement'
import POSSearch from '@/components/ui/Search'
import CloseShiftDialog from '@/components/pos/CloseShiftDialog'

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

type ShiftReportDeliveryStatus = 'queued' | 'sent' | 'disabled'

interface ClosedShiftFeedback {
  reportId: string
  status: ShiftReportDeliveryStatus
}

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
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [selectedTable, setSelectedTable] =
    useState<POSTable | null>(null)
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [activeShift, setActiveShift] = useState<Shift | null>(null)

  const [showCheckout, setShowCheckout] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [savingTab, setSavingTab] = useState(false)
  const [openingShift, setOpeningShift] = useState(false)
  const [closingShift, setClosingShift] = useState(false)
  const [finalizingSale, setFinalizingSale] = useState(false)
  const finalizingSaleRef = useRef(false)
  const [closedShiftFeedback, setClosedShiftFeedback] = useState<ClosedShiftFeedback | null>(null)
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false)
  const [actualCashCount, setActualCashCount] = useState('')

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: (() => void) | null
  }>({ open: false, title: '', message: '', onConfirm: null })

  const [cashFloat, setCashFloat] =
    useState(DEFAULT_CASH_FLOAT)
  const [manualTip, setManualTip] = useState('')

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false)

  const [savedCartSnapshot, setSavedCartSnapshot] =
    useState(EMPTY_CART_SNAPSHOT)

  const closeConfirmDialog = () => setConfirmDialog({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  })

  useEffect(() => {
    const handleShiftReportStatus = (event: Event) => {
      const detail = (event as CustomEvent<ClosedShiftFeedback>).detail
      if (!detail?.reportId) return

      setClosedShiftFeedback((current) =>
        current?.reportId === detail.reportId
          ? { reportId: detail.reportId, status: detail.status }
          : current,
      )
    }

    window.addEventListener('liyu:shift-report-status', handleShiftReportStatus)
    return () => window.removeEventListener('liyu:shift-report-status', handleShiftReportStatus)
  }, [])

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

      const repairedShift = sanitizeActiveShiftContext(shift, {
        businessId,
        branchId,
        userId,
      })

      if (!repairedShift) {
        return null
      }

      const hasLegacyBusinessId =
        shift.business_id === 'biz_active' || !shift.business_id

      const hasLegacyBranchId =
        shift.branch_id === 'branch_main' || !shift.branch_id

      const hasLegacyCashierId =
        shift.cashier_id === 'cashier_default' || !shift.cashier_id

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

      const finalShift: Shift = {
        ...repairedShift,
        business_id: repairedShift.business_id ?? businessId,
        branch_id: repairedShift.branch_id ?? branchId,
        cashier_id: repairedShift.cashier_id ?? userId,
        opened_by:
          shift.opened_by === 'cashier_default' || !shift.opened_by
            ? userId
            : shift.opened_by,
        updated_at: new Date().toISOString(),
      }

      const db = await getDB()

      await db.put(
        'active_shift',
        finalShift,
      )

      console.log(
        '[POS] Repaired legacy active shift context:',
        {
          businessId: finalShift.business_id,
          branchId: finalShift.branch_id,
          cashierId: finalShift.cashier_id,
        },
      )

      return finalShift
    },
    [
      businessId,
      branchId,
      userId,
    ],
  )

  const resolveExistingOpenShift = useCallback(
    async (): Promise<Shift | null> => {
      if (
        !businessId ||
        !branchId ||
        !userId ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        return null
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('business_id', businessId)
          .eq('branch_id', branchId)
          .eq('cashier_id', userId)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)

        if (error) {
          console.warn('[POS] Failed to resolve remote open shift:', error)
          return null
        }

        const remoteShift = Array.isArray(data) && data.length > 0 ? data[0] : null
        if (!remoteShift) {
          return null
        }

        const normalized = sanitizeActiveShiftContext(remoteShift, {
          businessId,
          branchId,
          userId,
        })

        if (!normalized) {
          return null
        }

        const db = await getDB()
        const localShift = toLocalActiveShift(normalized)
        await db.put('active_shift', localShift)

        return localShift
      } catch (error) {
        console.warn('[POS] Shared shift lookup failed:', error)
        return null
      }
    },
    [businessId, branchId, userId],
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

        if (businessId && branchId && userId) {
          const remoteOpenShift = await resolveExistingOpenShift()
          if (remoteOpenShift) {
            if (!currentShift || !isSameOpenShiftInstance(currentShift, remoteOpenShift)) {
              currentShift = remoteOpenShift
            }
          }
        }

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

        if (
          currentShift &&
          !currentShift.real_database_id &&
          currentShift.report_id &&
          currentShift.business_id &&
          currentShift.branch_id &&
          currentShift.cashier_id
        ) {
          const queuedShift = {
            ...currentShift,
            id: 'current',
            real_database_id: currentShift.report_id,
          }
          await db.put('active_shift', queuedShift)
          await db.put('pending_shift_openings', {
            reportId: currentShift.report_id,
            businessId: currentShift.business_id,
            branchId: currentShift.branch_id,
            cashierId: currentShift.cashier_id,
            openedAt: currentShift.opened_at,
            openingCash: Number(currentShift.opening_cash) || 0,
            shiftLabel: currentShift.shift_label,
            attempts: 0,
          })
          currentShift = queuedShift
        }

        const data =
          await loadPOSDataFromDB(db, { businessId, branchId })

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

        setSelectedTable((currentTable) => {
          if (!currentTable) return currentTable
          return data.tables.find((table) => table.id === currentTable.id) ??
            data.tables.find((table) =>
              table.name === currentTable.name ||
              table.table_number === currentTable.table_number,
            ) ??
            currentTable
        })
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
      businessId,
      branchId,
      resolveExistingOpenShift,
      userId,
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

  useEffect(() => {
    const refreshCatalog = () => {
      void loadPOSData()
    }

    window.addEventListener('liyu:sync-complete', refreshCatalog)

    return () => {
      window.removeEventListener('liyu:sync-complete', refreshCatalog)
    }
  }, [loadPOSData])

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
    async (table: POSTable, refreshServer = true) => {
      try {
        if (refreshServer && typeof navigator !== 'undefined' && navigator.onLine) {
          const { syncEngine } = await import('@/lib/offline/syncEngine')
          await syncEngine.refreshOpenTableOrders()
        }

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

  useEffect(() => {
    const refreshTableOrders = () => {
      void loadPOSData()
      if (selectedTable && !hasUnsavedChanges) {
        void loadTableTab(selectedTable, false)
      }
    }

    window.addEventListener('liyu:table-orders-updated', refreshTableOrders)
    return () => window.removeEventListener('liyu:table-orders-updated', refreshTableOrders)
  }, [hasUnsavedChanges, loadPOSData, loadTableTab, selectedTable])

  useEffect(() => {
    const refreshConfiguredTables = () => {
      if (!navigator.onLine) return
      void import('@/lib/offline/syncEngine').then(({ syncEngine }) =>
        syncEngine.refreshOpenTableOrders(),
      )
    }

    refreshConfiguredTables()
    window.addEventListener('online', refreshConfiguredTables)
    return () => window.removeEventListener('online', refreshConfiguredTables)
  }, [])

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

    if (activeShift) {
      toast(
        isAm
          ? 'አሁን ተከፍቷል ፈረቃ አለ። እባክዎ አስተካክል ወይም መዝጋት ይፈልጋሉ።'
          : 'A shift is already active for this cashier. Use the current open shift instead of reopening it.',
        'info',
      )

      return
    }

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

    try {
      const sharedOpenShift = await resolveExistingOpenShift()
      if (sharedOpenShift) {
        setActiveShift(sharedOpenShift)
        setClosedShiftFeedback(null)
        setActualCashCount('')

        toast(
          isAm
            ? 'አሁን በሌላ መሣሪያ የተከፈተ ፈረቃ እየሰራ ነው። ያለውን ፈረቃ ተጠቀም።'
            : 'There is already an open shift for this cashier on another device. Reusing the active shift.',
          'info',
        )

        return
      }
    } catch (error) {
      console.warn('[POS] Shared shift resolution failed before opening a new shift.', error)
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

      const reportId = crypto.randomUUID()

      const newShift: Shift = {
        id: 'current',

        report_id: reportId,

        real_database_id: reportId,

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
          'Full Day',

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
      await db.put('pending_shift_openings', {
        reportId,
        businessId,
        branchId,
        cashierId: userId,
        openedAt: now,
        openingCash,
        shiftLabel: newShift.shift_label,
        attempts: 0,
      })

      setClosedShiftFeedback(null)
      setActualCashCount('')
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

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { syncEngine } = await import('@/lib/offline/syncEngine')
        void syncEngine.syncAll()
      }
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
    if (!activeShift) return

    if (hasUnsavedChanges || (cartHasItems && !selectedTable)) {
      toast(
        isAm
          ? 'ፈረቃውን ከመዝጋትዎ በፊት ክፍያውን ያጠናቅቁ ወይም ትዕዛዙን ያስቀምጡ።'
          : 'Finish payment or save the current order before closing the shift.',
        'warning',
      )
      return
    }

    setCloseShiftDialogOpen(true)
  }

  const closeShift = async (countedCash: number | null) => {
    if (closingShift) return

    setClosingShift(true)

    try {
      const db = await getDB()

      if (activeShift) {
        const pendingClosures = await db.getAll('pending_shift_closures')
        const existingQueuedClosure = pendingClosures.find((closure) =>
          isDuplicateShiftClosure(closure, activeShift),
        )

        if (existingQueuedClosure) {
          console.warn('[POS] Prevented duplicate shift-close report for the same shared shift.', {
            reportId: existingQueuedClosure.reportId,
            businessId: activeShift.business_id,
            branchId: activeShift.branch_id,
            cashierId: activeShift.cashier_id,
            openedAt: activeShift.opened_at,
          })

          await db.delete('active_shift', 'current')
          setActiveShift(null)
          setCloseShiftDialogOpen(false)
          setActualCashCount('')
          setCart([])
          setSelectedTable(null)
          setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
          setHasUnsavedChanges(false)
          setShowCheckout(false)
          setManualTip('')
          setBillOpen(false)

          toast(
            isAm
              ? 'ይህ ፈረቃ በሌላ መሣሪያ አስቀድሞ ተዘግቷል። ሪፖርቱ እንደገና አይላክም።'
              : 'This shift has already been closed elsewhere; the report is not being sent twice.',
            'info',
          )

          return
        }

        const reportId = activeShift.report_id || activeShift.real_database_id || crypto.randomUUID()
        await db.put('pending_shift_closures', {
          reportId,
          businessId: activeShift.business_id,
          branchId: activeShift.branch_id,
          cashierId: activeShift.cashier_id,
          openedAt: activeShift.opened_at,
          closedAt: new Date().toISOString(),
          openingCash: Number(activeShift.opening_cash) || 0,
          actualCash: countedCash,
          attempts: 0,
        })
        setClosedShiftFeedback({ reportId, status: 'queued' })
      }

      await db.delete('active_shift', 'current')

      setActiveShift(null)
      setCloseShiftDialogOpen(false)
      setActualCashCount('')
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
          : 'Shift closed. Sales are saved; check the report status on this screen.',
        'success',
      )

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { syncEngine } = await import('@/lib/offline/syncEngine')
        void syncEngine.syncAll()
      }
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

  const confirmCloseShift = () => {
    const countedCash = actualCashCount.trim() === '' ? null : Number(actualCashCount)
    if (countedCash !== null && (!Number.isFinite(countedCash) || countedCash < 0)) {
      toast(
        isAm ? 'እባክዎ ትክክለኛ የካሽ መጠን ያስገቡ።' : 'Enter a valid cash count, or leave the field blank.',
        'warning',
      )
      return
    }

    void closeShift(countedCash)
  }

  // ==========================================================
  // SAVE TABLE ORDER
  // ==========================================================

  const clearCurrentOrder = async () => {
    const table = selectedTable
    if (table) {
      const db = await getDB()
      const [tabs, queuedOrders] = await Promise.all([
        db.getAll('open_tabs'),
        db.getAll('pending_table_orders'),
      ])
      const tableTabs = tabs.filter((tab) => tabBelongsToTable(tab, table))
      const queuedForTable = queuedOrders
        .filter((order) => order.tableId === table.id)
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      const firstSave = queuedForTable.find((order) => order.operation === 'save')
      const baseItems = firstSave?.baseItems ?? tableTabs[0]?.items ?? []
      const transaction = db.transaction(['open_tabs', 'pending_table_orders'], 'readwrite')
      const orderStore = transaction.objectStore('pending_table_orders')

      for (const order of queuedForTable) {
        if (order.operation === 'save') await orderStore.delete(order.localId)
      }
      for (const tab of tableTabs) {
        await transaction.objectStore('open_tabs').delete(tab.id)
      }

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(table.id)) {
        await orderStore.put({
          localId: crypto.randomUUID(),
          tableId: table.id,
          tableNumber: table.table_number || table.name,
          businessId: businessId || activeShift?.business_id || '',
          branchId: branchId || activeShift?.branch_id || '',
          cashierId: userId || activeShift?.cashier_id || '',
          operation: 'cancel',
          baseItems,
          items: [],
          totalAmount: 0,
          createdAt: new Date().toISOString(),
          attempts: 0,
        })
      }

      await transaction.done
    }

    setCart([])
    setSelectedTable(null)
    setSavedCartSnapshot(EMPTY_CART_SNAPSHOT)
    setHasUnsavedChanges(false)
    setShowCheckout(false)
    setBillOpen(false)
    setManualTip('')
    await loadPOSData()

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const { syncEngine } = await import('@/lib/offline/syncEngine')
      void syncEngine.syncAll()
    }
  }

  const handleRestoreCartItem = (item: POSCartItem) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id)
      if (existing) {
        return current.map((entry) => entry.id === item.id
          ? { ...entry, quantity: entry.quantity + item.quantity }
          : entry)
      }
      return [...current, item]
    })
    if (selectedTable) setHasUnsavedChanges(true)
  }

  const handleClearOrder = () => {
    if (!cartHasItems) return

    setConfirmDialog({
      open: true,
      title: isAm ? 'ትዕዛዙን ያጽዱ?' : 'Clear this order?',
      message: selectedTable
        ? isAm ? `${selectedTable.name} ላይ ያለውን ትዕዛዝ ሙሉ በሙሉ ማጥፋት ይፈልጋሉ?` : `Remove the saved order for ${selectedTable.name}?`
        : isAm ? 'ሁሉንም ዕቃዎች ከዚህ ትዕዛዝ ማጥፋት ይፈልጋሉ?' : 'Remove all items from this order?',
      onConfirm: () => {
        closeConfirmDialog()
        void clearCurrentOrder().catch((error) => {
          console.error('[POS] Failed to clear the current order:', error)
          toast(isAm ? 'ትዕዛዙን ማጥፋት አልተቻለም' : 'Could not clear this order.', 'error')
        })
      },
    })
  }

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
        businessId: businessId || activeShift?.business_id || '',
        branchId: branchId || activeShift?.branch_id || '',
        cashierId: userId || activeShift?.cashier_id || '',
      })

      setSavedCartSnapshot(result.snapshot)
      setHasUnsavedChanges(false)
      await loadPOSData()
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === selectedTable.id
            ? { ...table, has_open_tab: true }
            : table,
        ),
      )
      setSelectedTable((currentTable) =>
        currentTable?.id === selectedTable.id
          ? { ...currentTable, has_open_tab: true }
          : currentTable,
      )

      toast(
        isAm
          ? typeof navigator !== 'undefined' && !navigator.onLine
            ? 'ትዕዛዙ በዚህ መሣሪያ ተቀምጧል። ኢንተርኔት ሲመለስ ይላካል።'
            : 'ትዕዛዙ ተቀምጧል።'
          : typeof navigator !== 'undefined' && !navigator.onLine
            ? 'Order saved on this device. It will sync when you are online.'
            : 'Order saved.',
        'success',
      )

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { syncEngine } = await import('@/lib/offline/syncEngine')
        void syncEngine.syncAll()
      }
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
    if (finalizingSaleRef.current || !activeShift || cart.length === 0) return

    finalizingSaleRef.current = true
    setFinalizingSale(true)

    try {
      const safeShift = await normalizeActiveShiftContext(activeShift)

      if (!safeShift || !safeShift.business_id || !safeShift.branch_id || !safeShift.cashier_id) {
        toast(
          isAm
            ? 'የሽያጭ ሂደት ለአሁኑ ንግድ ሁኔታ አልተዘጋጀም። እባክዎ እንደገና ይግቡ።'
            : 'This sale is missing a valid business context. Please refresh and try again.',
          'error',
        )
        return
      }

      const sale = await finalizeSale({
        splitPayments,
        manualTip,
        activeShift: safeShift,
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
          ? typeof navigator !== 'undefined' && !navigator.onLine
            ? 'ሽያጩ በዚህ መሣሪያ ተቀምጧል። ኢንተርኔት ሲመለስ ይላካል።'
            : 'ሽያጩ ተቀምጧል።'
          : typeof navigator !== 'undefined' && !navigator.onLine
            ? 'Sale saved on this device. It will sync when you are online.'
            : 'Sale saved.',
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
    } finally {
      finalizingSaleRef.current = false
      setFinalizingSale(false)
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
      <div className="flex min-h-full items-start justify-center overflow-y-auto bg-coffee-900 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:items-center sm:p-4">
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

          {closedShiftFeedback && (
            <div
              role="status"
              className={`mx-4 mt-4 flex items-start gap-3 rounded-2xl border p-3.5 ${
                closedShiftFeedback.status === 'sent'
                  ? 'border-berbere-200 bg-berbere-50 text-berbere-800'
                  : closedShiftFeedback.status === 'disabled'
                    ? 'border-cream-300 bg-cream-100 text-coffee-700'
                    : 'border-gold-200 bg-gold-50 text-gold-800'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {closedShiftFeedback.status === 'sent' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : closedShiftFeedback.status === 'disabled' ? (
                  <WifiOff className="h-5 w-5" />
                ) : (
                  <Clock3 className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-xs font-black">
                  {closedShiftFeedback.status === 'sent'
                    ? isAm ? 'ሪፖርቱ ተልኳል' : 'Shift report sent'
                    : closedShiftFeedback.status === 'disabled'
                      ? isAm ? 'ሪፖርት አልተላከም' : 'Report was not sent'
                      : isAm ? 'ሪፖርቱ ለመላክ ተጠብቋል' : 'Report is waiting to send'}
                </p>
                <p className="mt-1 text-[11px] leading-4 opacity-80">
                  {closedShiftFeedback.status === 'sent'
                    ? isAm ? 'ሪፖርቱ ለንግድዎ ነቅተው ላሉ ተቀባዮች ደርሷል።' : 'The report reached this business’s enabled Telegram recipients.'
                    : closedShiftFeedback.status === 'disabled'
                      ? isAm ? 'ባለቤቱ በቅንብር ውስጥ የሪፖርት መላክን ማንቃት አለበት።' : 'Ask the owner to enable Telegram reports in settings.'
                      : isAm ? 'ግንኙነት ሲመለስ በራሱ እንደገና ይሞክራል።' : 'It will retry automatically when the connection is available.'}
                </p>
              </div>
              {closedShiftFeedback.status === 'sent' && <Send className="ml-auto mt-0.5 h-4 w-4 shrink-0" />}
            </div>
          )}

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
          todayReport={(
            <SellerDailyStatement
              businessId={businessId}
              branchId={branchId}
              cashierId={activeShift.cashier_id ?? userId}
              locale={locale}
              isAm={isAm}
              initiallyExpanded
            />
          )}
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
            onRestoreItem={handleRestoreCartItem}
            onClearItem={clearCartItem}
            onSaveTab={handleSaveTab}
            onCheckout={() => {
              setShowCheckout(true)
              setBillOpen(false)
            }}
            onClearCart={handleClearOrder}
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
              {/* VISIBLE, COMPACT PRODUCT AND TABLE CONTROLS */}

              <div
                className="sticky top-0 z-30 -mx-2 shrink-0 bg-cream-100/95 px-2 pb-1.5 pt-0.5 backdrop-blur-md sm:-mx-3 sm:px-3 lg:-mx-4 lg:px-4"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setShowProductSearch(false)
                    setProductSearch('')
                  }
                }}
              >
                <section className="overflow-hidden rounded-xl border border-cream-300 bg-white shadow-sm">
                  <div className="border-b border-cream-100 px-2 pt-1.5 sm:px-2.5">
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

                  <div className="relative px-1.5 py-1 sm:px-2">
                    <div className="mb-0.5 flex items-center justify-between gap-2 px-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-coffee-600">
                        <LayoutGrid className="h-3.5 w-3.5 text-berbere-500" aria-hidden="true" />
                        {isAm ? 'ምርትን በዓይነት ይምረጡ' : 'Choose product type'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (showProductSearch) {
                            setProductSearch('')
                            setShowProductSearch(false)
                          } else {
                            setShowProductSearch(true)
                          }
                        }}
                        aria-expanded={showProductSearch}
                        aria-controls="pos-product-search"
                        aria-label={isAm ? 'ምርት ይፈልጉ' : 'Search for a product'}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-berbere-600 transition hover:bg-berbere-50 active:scale-95"
                      >
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                        {isAm ? 'ፈልግ' : 'Search'}
                      </button>
                    </div>
                    <POSCategories
                      categories={categories}
                      selectedCategoryId={selectedCategoryId}
                      onSelectCategory={setSelectedCategoryId}
                      isAm={isAm}
                    />

                    {showProductSearch && (
                      <div
                        role="search"
                        id="pos-product-search"
                        aria-label={isAm ? 'ምርቶችን ፈልግ' : 'Search products'}
                        className="absolute right-2 top-0 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-cream-300 bg-white p-1.5 shadow-elevated"
                      >
                        <div className="flex items-center gap-1.5">
                          <POSSearch
                            value={productSearch}
                            onChange={setProductSearch}
                            resultCount={filteredProducts.length}
                            showResultCount={false}
                            isAm={isAm}
                            placeholder={isAm ? 'ምርት በስም ይፈልጉ' : 'Type a product name'}
                            autoFocus
                            className="!min-w-0 !flex-1 !p-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowProductSearch(false)
                              setProductSearch('')
                            }}
                            aria-label={isAm ? 'ዝጋ' : 'Close search'}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-coffee-500 hover:bg-cream-100"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

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
                isSubmitting={finalizingSale}
              />
            </div>
          </main>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={isAm ? 'አዎ' : 'Continue'}
        cancelLabel={isAm ? 'ሰርዝ' : 'Cancel'}
        onConfirm={() => confirmDialog.onConfirm?.()}
        onCancel={closeConfirmDialog}
      />

      <CloseShiftDialog
        open={closeShiftDialogOpen}
        isAm={isAm}
        openingCash={Number(activeShift?.opening_cash) || 0}
        actualCash={actualCashCount}
        busy={closingShift}
        onActualCashChange={setActualCashCount}
        onConfirm={confirmCloseShift}
        onCancel={() => setCloseShiftDialogOpen(false)}
      />
    </div>
  )
}

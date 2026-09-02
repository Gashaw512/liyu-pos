'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useParams } from 'next/navigation'
import {
  PlusCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'

import { getDB } from '@/lib/offline/db'
import { toast } from '@/lib/utils/toast'
import { getLocalInventoryProducts } from '@/hooks/useInventoryData'
import { useInventoryActions } from '@/hooks/useInventoryActions'
import { computeLiveLocalStock } from '@/lib/calculations/stockCalculator'

import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import ReceiveStockModal from '@/components/inventory/ReceiveStockModal'
import InventoryCategoryTabs from '@/components/inventory/InventoryCategoryTabs'
import InventoryValuation from '@/components/inventory/InventoryValuation'
import InventoryEmptyState from '@/components/inventory/InventoryEmptyState'
import InventoryProductList from '@/components/inventory/InventoryProductList'

import type {
  InventoryProduct,
  LiveMetaData,
} from '@/types/inventory'

export const dynamic = 'force-dynamic'

// ============================================================
// CONSTANTS
// ============================================================

const INVENTORY_REFRESH_EVENT = 'liyu:inventory-updated'
const SYNC_COMPLETE_EVENT = 'liyu:sync-complete'
const INVENTORY_CHANNEL_NAME = 'liyu-pos-inventory'

const REFRESH_DEBOUNCE_MS = 180
const AUTO_REFRESH_INTERVAL_MS = 60_000

const COLORS = {
  navy: '#1B2B50',
  orange: '#F26522',
  cream: '#F7F4EB',
  text: '#2B1E1A',
  muted: '#6B625D',
  border: '#E8E0D6',
  white: '#FFFFFF',
} as const

const LIVE_REFRESH_OPTIONS = {
  silent: true,
  preserveEditedCounts: true,
} as const

type RefreshOptions = {
  silent?: boolean
  preserveEditedCounts?: boolean
}

// ============================================================
// HELPERS
// ============================================================

function getLocalizedValue(
  english: string | null | undefined,
  amharic: string | null | undefined,
  isAm: boolean
) {
  return (isAm && amharic ? amharic : english) ?? ''
}

// ============================================================
// PAGE
// ============================================================

export default function InventoryPage() {
  const params = useParams()

  const locale =
    typeof params.locale === 'string'
      ? params.locale
      : 'am'

  const isAm = locale === 'am'

  // ==========================================================
  // STATE
  // ==========================================================

  const [products, setProducts] =
    useState<InventoryProduct[] | null>(null)

  const [liveStockMap, setLiveStockMap] =
    useState<Record<string, LiveMetaData>>({})

  const [counts, setCounts] =
    useState<Record<string, number>>({})

  const [searchQuery, setSearchQuery] =
    useState('')

  const [selectedCategory, setSelectedCategory] =
    useState('All')

  const [isSaving, setIsSaving] =
    useState(false)

  const [rowSavingId, setRowSavingId] =
    useState<string | null>(null)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [isOnline, setIsOnline] =
    useState(
      typeof navigator !== 'undefined'
        ? navigator.onLine
        : true
    )

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null)

  // Receive stock
  const [showReceiveModal, setShowReceiveModal] =
    useState(false)

  const [receiveProductId, setReceiveProductId] =
    useState('')

  const [receiveQty, setReceiveQty] =
    useState(0)

  const [receiveUnitCost, setReceiveUnitCost] =
    useState(0)

  // ==========================================================
  // REFS
  // ==========================================================

  const mountedRef =
    useRef(true)

  const refreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshingRef =
    useRef(false)

  const broadcastChannelRef =
    useRef<BroadcastChannel | null>(null)

  // ==========================================================
  // LOCALIZATION
  // ==========================================================

  const t = useCallback(
    (
      english: string,
      amharic: string
    ) => (isAm ? amharic : english),
    [isAm]
  )

  const getProductLabel = useCallback(
    (product: InventoryProduct) =>
      getLocalizedValue(
        product.name,
        product.name_am,
        isAm
      ),
    [isAm]
  )

  // ==========================================================
  // INVENTORY ACTIONS
  // ==========================================================

  const {
    handleSaveSingleRow,
    handleSaveAll,
  } = useInventoryActions(
    setLiveStockMap,
    setRowSavingId,
    setIsSaving,
    t,
    isAm
  )

  // ==========================================================
  // REFRESH INVENTORY
  // ==========================================================

  const refreshInventory = useCallback(
    async (
      options: RefreshOptions = {}
    ) => {
      if (refreshingRef.current) {
        return
      }

      refreshingRef.current = true

      const silent =
        options.silent ?? false

      const preserveEditedCounts =
        options.preserveEditedCounts ?? true

      if (!silent && mountedRef.current) {
        setIsRefreshing(true)
      }

      try {
        const db = await getDB()

        const baseProducts =
          await getLocalInventoryProducts()

        const computedMap =
          await computeLiveLocalStock(
            db,
            baseProducts
          )

        if (!mountedRef.current) {
          return
        }

        setProducts(baseProducts)
        setLiveStockMap(computedMap)

        setCounts(previous => {
          const next: Record<string, number> = {}

          for (const product of baseProducts) {
            const systemCount =
              computedMap[product.id]?.systemCount ??
              product.opening_count ??
              0

            const hasExistingCount =
              Object.prototype.hasOwnProperty.call(
                previous,
                product.id
              )

            next[product.id] =
              preserveEditedCounts &&
                hasExistingCount
                ? previous[product.id]
                : systemCount
          }

          return next
        })

        setLastUpdated(new Date())
      } catch (error) {
        console.error(
          '[InventoryPage] refresh failed',
          error
        )

        if (
          !silent &&
          mountedRef.current
        ) {
          toast(
            t(
              'Unable to refresh inventory right now.',
              'የእቃ መረጃውን አሁን ማደስ አልተቻለም።'
            ),
            'error'
          )
        }
      } finally {
        refreshingRef.current = false

        if (mountedRef.current) {
          setIsRefreshing(false)
        }
      }
    },
    [t]
  )

  // ==========================================================
  // DEBOUNCED REFRESH
  // ==========================================================

  const scheduleInventoryRefresh =
    useCallback(
      (
        options: RefreshOptions = {}
      ) => {
        if (refreshTimerRef.current) {
          clearTimeout(
            refreshTimerRef.current
          )
        }

        refreshTimerRef.current =
          setTimeout(() => {
            void refreshInventory(
              options
            )
          }, REFRESH_DEBOUNCE_MS)
      },
      [refreshInventory]
    )

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true

    void refreshInventory({
      silent: true,
      preserveEditedCounts: false,
    })

    return () => {
      mountedRef.current = false

      if (refreshTimerRef.current) {
        clearTimeout(
          refreshTimerRef.current
        )
      }
    }
  }, [refreshInventory])

  // ==========================================================
  // AUTOMATIC REFRESH
  //
  // Refresh every 60 seconds while the page is visible.
  // Existing event-based refresh remains active below.
  // ==========================================================

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState !==
          'visible'
        ) {
          return
        }

        void refreshInventory(
          LIVE_REFRESH_OPTIONS
        )
      }, AUTO_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [refreshInventory])

  // ==========================================================
  // ONLINE / OFFLINE
  // ==========================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)

      scheduleInventoryRefresh(
        LIVE_REFRESH_OPTIONS
      )
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener(
      'online',
      handleOnline
    )

    window.addEventListener(
      'offline',
      handleOffline
    )

    return () => {
      window.removeEventListener(
        'online',
        handleOnline
      )

      window.removeEventListener(
        'offline',
        handleOffline
      )
    }
  }, [scheduleInventoryRefresh])

  // ==========================================================
  // REFRESH WHEN USER RETURNS TO PAGE
  // ==========================================================

  useEffect(() => {
    const refresh = () => {
      scheduleInventoryRefresh(
        LIVE_REFRESH_OPTIONS
      )
    }

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        refresh()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    )

    window.addEventListener(
      'focus',
      refresh
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      )

      window.removeEventListener(
        'focus',
        refresh
      )
    }
  }, [scheduleInventoryRefresh])

  // ==========================================================
  // INVENTORY / SYNC EVENTS
  // ==========================================================

  useEffect(() => {
    const refresh = () => {
      scheduleInventoryRefresh(
        LIVE_REFRESH_OPTIONS
      )
    }

    window.addEventListener(
      INVENTORY_REFRESH_EVENT,
      refresh
    )

    window.addEventListener(
      SYNC_COMPLETE_EVENT,
      refresh
    )

    return () => {
      window.removeEventListener(
        INVENTORY_REFRESH_EVENT,
        refresh
      )

      window.removeEventListener(
        SYNC_COMPLETE_EVENT,
        refresh
      )
    }
  }, [scheduleInventoryRefresh])

  // ==========================================================
  // CROSS-TAB / CROSS-WINDOW SYNC
  // ==========================================================

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof BroadcastChannel ===
      'undefined'
    ) {
      return
    }

    const channel =
      new BroadcastChannel(
        INVENTORY_CHANNEL_NAME
      )

    broadcastChannelRef.current =
      channel

    const handleMessage = (
      event: MessageEvent
    ) => {
      const type =
        event.data?.type

      const shouldRefresh =
        type ===
        INVENTORY_REFRESH_EVENT ||
        type ===
        SYNC_COMPLETE_EVENT

      if (shouldRefresh) {
        scheduleInventoryRefresh(
          LIVE_REFRESH_OPTIONS
        )
      }
    }

    channel.addEventListener(
      'message',
      handleMessage
    )

    return () => {
      channel.removeEventListener(
        'message',
        handleMessage
      )

      channel.close()

      broadcastChannelRef.current =
        null
    }
  }, [scheduleInventoryRefresh])

  // ==========================================================
  // RESET CATEGORY WHEN LANGUAGE CHANGES
  // ==========================================================

  useEffect(() => {
    setSelectedCategory('All')
  }, [isAm])

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const dynamicCategories =
    useMemo(() => {
      if (!products) {
        return ['All']
      }

      const categories =
        new Set<string>()

      for (const product of products) {
        const category =
          getLocalizedValue(
            product.category_name,
            product.category_name_am,
            isAm
          )

        if (category) {
          categories.add(
            category
          )
        }
      }

      return [
        'All',
        ...Array.from(
          categories
        ).sort((a, b) =>
          a.localeCompare(b)
        ),
      ]
    }, [products, isAm])

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  const filteredProducts =
    useMemo(() => {
      if (!products) {
        return []
      }

      let result = products

      if (
        selectedCategory !==
        'All'
      ) {
        result =
          result.filter(
            product => {
              const category =
                getLocalizedValue(
                  product.category_name,
                  product.category_name_am,
                  isAm
                )

              return (
                category ===
                selectedCategory
              )
            }
          )
      }

      const query =
        searchQuery
          .toLowerCase()
          .trim()

      if (!query) {
        return result
      }

      return result.filter(
        product => {
          const searchableValues = [
            product.name,
            product.name_am,
            product.category_name,
            product.category_name_am,
            product.barcode,
          ]

          return searchableValues.some(
            value =>
              value
                ?.toLowerCase()
                .includes(query)
          )
        }
      )
    }, [
      products,
      selectedCategory,
      searchQuery,
      isAm,
    ])

  // ==========================================================
  // COUNT CHANGE
  // ==========================================================

  const handleCountChange =
    useCallback(
      (
        productId: string,
        value: number
      ) => {
        if (
          !Number.isFinite(value)
        ) {
          return
        }

        setCounts(previous => ({
          ...previous,

          [productId]:
            Math.max(
              0,
              Math.floor(value)
            ),
        }))
      },
      []
    )

  // ==========================================================
  // RESET COUNTS
  // ==========================================================

  const handleResetForm =
    useCallback(() => {
      if (!products) {
        return
      }

      const confirmed =
        window.confirm(
          t(
            'Clear all unsaved count changes?',
            'ሁሉንም ያልተቀመጡ የቆጠራ ለውጦች ማጥፋት ይፈልጋሉ?'
          )
        )

      if (!confirmed) {
        return
      }

      const nextCounts: Record<
        string,
        number
      > = {}

      for (const product of products) {
        nextCounts[product.id] =
          liveStockMap[
            product.id
          ]?.systemCount ??
          product.opening_count ??
          0
      }

      setCounts(nextCounts)

      toast(
        t(
          'Count changes cleared.',
          'የቆጠራ ለውጦች ጸድተዋል።'
        ),
        'success'
      )
    }, [
      products,
      liveStockMap,
      t,
    ])

  // ==========================================================
  // RECEIVE STOCK
  // ==========================================================

  const handleReceiveStockSubmit =
    useCallback(
      async (
        e: FormEvent
      ) => {
        e.preventDefault()

        // ----------------------------------------------------
        // Product
        // ----------------------------------------------------

        if (!receiveProductId) {
          toast(
            t(
              'Please select a product.',
              'እባክዎ ምርት ይምረጡ።'
            ),
            'error'
          )
          return
        }

        // ----------------------------------------------------
        // Quantity
        // ----------------------------------------------------

        const rawQuantity =
          Number(receiveQty)

        if (
          !Number.isFinite(
            rawQuantity
          ) ||
          rawQuantity <= 0
        ) {
          toast(
            t(
              'Quantity must be greater than zero.',
              'ብዛቱ ከዜሮ በላይ መሆን አለበት።'
            ),
            'error'
          )
          return
        }

        const quantity =
          Math.floor(
            rawQuantity
          )

        if (quantity <= 0) {
          toast(
            t(
              'Please enter a valid quantity.',
              'እባክዎ ትክክለኛ የእቃ ብዛት ያስገቡ።'
            ),
            'error'
          )
          return
        }

        // ----------------------------------------------------
        // Unit cost
        // ----------------------------------------------------

        const unitCost =
          Number(
            receiveUnitCost
          )

        if (
          !Number.isFinite(
            unitCost
          ) ||
          unitCost < 0
        ) {
          toast(
            t(
              'Please enter a valid unit cost.',
              'እባክዎ ትክክለኛ የመግዣ ዋጋ ያስገቡ።'
            ),
            'error'
          )
          return
        }

        // ----------------------------------------------------
        // Product
        // ----------------------------------------------------

        const matchedProduct =
          products?.find(
            product =>
              product.id ===
              receiveProductId
          )

        if (!matchedProduct) {
          toast(
            t(
              'Product could not be found.',
              'ምርቱ አልተገኘም።'
            ),
            'error'
          )
          return
        }

        try {
          const db =
            await getDB()

          // --------------------------------------------------
          // Active shift
          // --------------------------------------------------

          const activeShift =
            await db.get(
              'active_shift',
              'current'
            )

          if (!activeShift) {
            toast(
              t(
                'Please open an active shift first.',
                'እባክዎ መጀመሪያ ክፍት የፈረቃ ስራ ይጀምሩ።'
              ),
              'error'
            )
            return
          }

          // --------------------------------------------------
          // Total cost
          // --------------------------------------------------

          const totalCost =
            quantity *
            unitCost

          if (
            !Number.isFinite(
              totalCost
            )
          ) {
            throw new Error(
              'Invalid receipt total.'
            )
          }

          // --------------------------------------------------
          // Save receipt locally
          //
          // Sync layer will process it later.
          // --------------------------------------------------

          const receipt = {
            localId:
              crypto.randomUUID(),

            createdAt:
              new Date().toISOString(),

            syncStatus:
              'pending' as const,

            retryCount: 0,

            product_id:
              matchedProduct.id,

            business_id:
              activeShift.business_id,

            branch_id:
              activeShift.branch_id,

            shift_id:
              activeShift.id,

            quantity,

            unit_cost:
              unitCost,

            total_cost:
              totalCost,

            notes:
              'Stock received from inventory screen',
          }

          const tx =
            db.transaction(
              'pending_stock_receipts',
              'readwrite'
            )

          await tx
            .objectStore(
              'pending_stock_receipts'
            )
            .put(receipt)

          await tx.done

          // --------------------------------------------------
          // Update visible stock immediately
          // --------------------------------------------------

          const currentStock =
            liveStockMap[
              matchedProduct.id
            ]?.systemCount ??
            matchedProduct.opening_count ??
            0

          const newStock =
            currentStock +
            quantity

          setLiveStockMap(
            previous => ({
              ...previous,

              [matchedProduct.id]: {
                ...previous[
                matchedProduct.id
                ],

                systemCount:
                  newStock,

                hasPendingTransactions:
                  true,
              },
            })
          )

          setCounts(
            previous => ({
              ...previous,

              [matchedProduct.id]:
                newStock,
            })
          )

          // --------------------------------------------------
          // Notify other inventory views/tabs
          // --------------------------------------------------

          window.dispatchEvent(
            new CustomEvent(
              INVENTORY_REFRESH_EVENT
            )
          )

          broadcastChannelRef.current?.postMessage(
            {
              type:
                INVENTORY_REFRESH_EVENT,

              productId:
                matchedProduct.id,
            }
          )

          // --------------------------------------------------
          // Success message
          // --------------------------------------------------

          const label =
            getProductLabel(
              matchedProduct
            )

          toast(
            t(
              `Received ${quantity} units of ${label}.`,
              `${quantity} ፍሬ ${label} ገቢ ተደርጓል።`
            ),
            'success'
          )

          // --------------------------------------------------
          // Reset modal
          // --------------------------------------------------

          setShowReceiveModal(
            false
          )

          setReceiveProductId(
            ''
          )

          setReceiveQty(0)

          setReceiveUnitCost(0)
        } catch (error) {
          console.error(
            '[InventoryPage] receive stock failed',
            error
          )

          toast(
            t(
              'Failed to save received stock locally.',
              'የገቢ ዕቃውን በአካባቢው ማስቀመጥ አልተቻለም።'
            ),
            'error'
          )
        }
      },
      [
        products,
        receiveProductId,
        receiveQty,
        receiveUnitCost,
        liveStockMap,
        getProductLabel,
        t,
      ]
    )

  // ==========================================================
  // HEADER
  // ==========================================================

  const lastUpdatedLabel =
    lastUpdated
      ? lastUpdated.toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )
      : '--:--'

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!products) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundColor:
            COLORS.cream,
        }}
      >
        <LoadingSpinner />
      </div>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor:
          COLORS.cream,
        color: COLORS.text,
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <PageHeader
        title={t(
          'Inventory',
          'የእቃ ማስተዳደሪያ',
        )}
        subtitle={t(
          'Check stock, receive items, and correct counts',
          'እቃዎን ይመልከቱ፣ ይቀበሉ እና ቆጠራዎን ያስተካክሉ',
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowReceiveModal(true)}
            >
              <PlusCircle className="h-4 w-4" />

              <span>
                {t(
                  'Receive',
                  'ተቀበል',
                )}
              </span>
            </Button>

            <Button
              onClick={() =>
                handleSaveAll(
                  products,
                  counts,
                  liveStockMap,
                )
              }
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <span>
                  {t(
                    'Save All',
                    'ሁሉንም አስቀምጥ',
                  )}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 sm:px-5 lg:px-6">

        {/* ----------------------------------------------------
            VALUATION
        ----------------------------------------------------- */}

        <InventoryValuation
          products={products}
          liveStockMap={liveStockMap}
          isAm={isAm}
        />

        {/* ----------------------------------------------------
            SEARCH
        ----------------------------------------------------- */}

        <SearchInput
          value={searchQuery}
          onChange={
            setSearchQuery
          }
          placeholder={t(
            'Search products or barcode...',
            'ምርቶችን ወይም ባርኮድ ይፈልጉ...'
          )}
        />

        {/* ----------------------------------------------------
            CATEGORIES
        ----------------------------------------------------- */}

        <InventoryCategoryTabs
          categories={
            dynamicCategories
          }
          selected={
            selectedCategory
          }
          onSelect={
            setSelectedCategory
          }
          allLabel={t(
            'All Groups',
            'ሁሉም ምድቦች'
          )}
        />

        {/* ----------------------------------------------------
            PRODUCTS
        ----------------------------------------------------- */}

        {filteredProducts.length ===
          0 ? (
          <InventoryEmptyState
            t={t}
          />
        ) : (
          <InventoryProductList
            products={
              filteredProducts
            }
            counts={counts}
            liveStockMap={
              liveStockMap
            }
            rowSavingId={
              rowSavingId
            }
            isAm={isAm}
            t={t}
            onCountChange={
              handleCountChange
            }
            onSaveRow={
              product =>
                handleSaveSingleRow(
                  product,
                  counts,
                  liveStockMap
                )
            }
          />
        )}

        {/* ----------------------------------------------------
            CLEAR UNSAVED CHANGES
        ----------------------------------------------------- */}

        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            onClick={
              handleResetForm
            }
            className="text-xs"
            aria-label={t(
              'Clear unsaved count changes',
              'ያልተቀመጡ የቆጠራ ለውጦችን አጽዳ'
            )}
            title={t(
              'Clear unsaved count changes',
              'ያልተቀመጡ የቆጠራ ለውጦችን አጽዳ'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />

            {t(
              'Clear Changes',
              'ለውጦችን አጽዳ'
            )}
          </Button>
        </div>
      </main>

      {/* ======================================================
          RECEIVE STOCK MODAL
      ====================================================== */}

      <ReceiveStockModal
        open={
          showReceiveModal
        }
        onClose={() =>
          setShowReceiveModal(
            false
          )
        }
        products={products}
        isAm={isAm}
        receiveProductId={
          receiveProductId
        }
        setReceiveProductId={
          setReceiveProductId
        }
        receiveQty={
          receiveQty
        }
        setReceiveQty={
          setReceiveQty
        }
        receiveUnitCost={
          receiveUnitCost
        }
        setReceiveUnitCost={
          setReceiveUnitCost
        }
        onSubmit={
          handleReceiveStockSubmit
        }
        t={t}
      />
    </div>
  )
}
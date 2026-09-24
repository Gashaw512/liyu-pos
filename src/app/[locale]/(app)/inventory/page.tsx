// src/app/[locale]/(app)/reports/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import {
  PlusCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { getDB } from "@/lib/offline/db";
import { toast } from "@/lib/utils/toast";
import { getLocalInventoryProducts } from "@/hooks/useInventoryData";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { computeLiveLocalStock } from "@/lib/calculations/stockCalculator";

import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

import ReceiveStockModal from "@/components/inventory/ReceiveStockModal";
import InventoryCategoryTabs from "@/components/inventory/InventoryCategoryTabs";
import InventoryValuation from "@/components/inventory/InventoryValuation";
import InventoryEmptyState from "@/components/inventory/InventoryEmptyState";
import InventoryProductList from "@/components/inventory/InventoryProductList";
import { useBusinessContext } from "@/lib/auth/useBusinessContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type {
  InventoryProduct,
  LiveMetaData,
} from "@/types/inventory";

export const dynamic = "force-dynamic";

// ============================================================
// CONSTANTS
// ============================================================

const INVENTORY_REFRESH_EVENT = "liyu:inventory-updated";
const SYNC_COMPLETE_EVENT = "liyu:sync-complete";
const INVENTORY_CHANNEL_NAME = "liyu-pos-inventory";

const REFRESH_DEBOUNCE_MS = 180;
const AUTO_REFRESH_INTERVAL_MS = 60_000;

const LIVE_REFRESH_OPTIONS = {
  silent: true,
  preserveEditedCounts: true,
} as const;

type RefreshOptions = {
  silent?: boolean;
  preserveEditedCounts?: boolean;
};

// ============================================================
// HELPERS
// ============================================================

function getLocalizedValue(
  english: string | null | undefined,
  amharic: string | null | undefined,
  isAm: boolean,
): string {
  return (isAm && amharic ? amharic : english) ?? "";
}

// ============================================================
// PAGE
// ============================================================

export default function InventoryPage() {
  const params = useParams();

  const locale =
    typeof params.locale === "string"
      ? params.locale
      : "am";

  const isAm = locale === "am";

  const { businessId, branchId } = useBusinessContext();

  // ==========================================================
  // STATE
  // ==========================================================

  const [products, setProducts] =
    useState<InventoryProduct[] | null>(null);

  const [liveStockMap, setLiveStockMap] =
    useState<Record<string, LiveMetaData>>({});

  const [fifoCostValueByProduct, setFifoCostValueByProduct] =
    useState<Record<string, number>>({});

  const [fifoCostDataAvailable, setFifoCostDataAvailable] =
    useState(false);

  const [counts, setCounts] =
    useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [isSaving, setIsSaving] =
    useState(false);

  const [rowSavingId, setRowSavingId] =
    useState<string | null>(null);

  // Receive stock
  const [showReceiveModal, setShowReceiveModal] =
    useState(false);

  const [receiveProductId, setReceiveProductId] =
    useState("");

  const [receiveQty, setReceiveQty] =
    useState(0);

  const [receiveUnitCost, setReceiveUnitCost] =
    useState(0);

  // ==========================================================
  // REFS
  // ==========================================================

  const mountedRef =
    useRef(true);

  const refreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshingRef =
    useRef(false);

  const broadcastChannelRef =
    useRef<BroadcastChannel | null>(null);

  // ==========================================================
  // LOCALIZATION
  // ==========================================================

  const t = useCallback(
    (
      english: string,
      amharic: string,
    ): string => {
      return isAm ? amharic : english;
    },
    [isAm],
  );

  const getProductLabel = useCallback(
    (product: InventoryProduct): string => {
      return getLocalizedValue(
        product.name,
        product.name_am,
        isAm,
      );
    },
    [isAm],
  );

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
    isAm,
  );

  // ==========================================================
  // REFRESH INVENTORY
  // ==========================================================

  const refreshInventory = useCallback(
    async (
      options: RefreshOptions = {},
    ): Promise<void> => {
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;

      const silent =
        options.silent ?? false;

      const preserveEditedCounts =
        options.preserveEditedCounts ?? true;

      try {
        const db = await getDB();

        const baseProducts =
          await getLocalInventoryProducts();

        const computedMap =
          await computeLiveLocalStock(
            db,
            baseProducts,
          );

        const nextFifoCostValueByProduct: Record<string, number> = {};
        let nextFifoCostDataAvailable = false;

        if (businessId && branchId) {
          try {
            const { data, error } = await getSupabaseBrowserClient()
              .from("inventory_cost_layers")
              .select("product_id, quantity_remaining, unit_cost")
              .eq("business_id", businessId)
              .eq("branch_id", branchId)
              .gt("quantity_remaining", 0);

            if (error) throw error;

            for (const layer of data ?? []) {
              const layerValue =
                Number(layer.quantity_remaining) * Number(layer.unit_cost);

              if (!Number.isFinite(layerValue)) continue;

              nextFifoCostValueByProduct[layer.product_id] =
                (nextFifoCostValueByProduct[layer.product_id] ?? 0) + layerValue;
            }

            nextFifoCostDataAvailable = true;
          } catch (error) {
            // The inventory screen remains usable offline and falls back to cached costs.
            console.warn(
              "[InventoryPage] FIFO valuation unavailable; using cached product costs.",
              error,
            );
          }
        }

        if (!mountedRef.current) {
          return;
        }

        setProducts(baseProducts);
        setLiveStockMap(computedMap);
        setFifoCostValueByProduct(nextFifoCostValueByProduct);
        setFifoCostDataAvailable(nextFifoCostDataAvailable);

        setCounts((previous) => {
          const next: Record<string, number> = {};

          for (const product of baseProducts) {
            const systemCount =
              computedMap[product.id]?.systemCount ??
              product.opening_count ??
              0;

            const hasExistingCount =
              Object.prototype.hasOwnProperty.call(
                previous,
                product.id,
              );

            next[product.id] =
              preserveEditedCounts &&
              hasExistingCount
                ? previous[product.id]
                : systemCount;
          }

          return next;
        });
      } catch (error) {
        console.error(
          "[InventoryPage] refresh failed",
          error,
        );

        if (
          !silent &&
          mountedRef.current
        ) {
          toast(
            t(
              "Unable to refresh inventory right now.",
              "የእቃ መረጃውን አሁን ማደስ አልተቻለም።",
            ),
            "error",
          );
        }
      } finally {
        refreshingRef.current = false;
      }
    },
    [businessId, branchId, t],
  );

  // ==========================================================
  // DEBOUNCED REFRESH
  // ==========================================================

  const scheduleInventoryRefresh =
    useCallback(
      (
        options: RefreshOptions = {},
      ): void => {
        if (refreshTimerRef.current) {
          clearTimeout(
            refreshTimerRef.current,
          );
        }

        refreshTimerRef.current =
          setTimeout(() => {
            refreshTimerRef.current = null;
            void refreshInventory(options);
          }, REFRESH_DEBOUNCE_MS);
      },
      [refreshInventory],
    );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    void refreshInventory({
      silent: true,
      preserveEditedCounts: false,
    });

    return () => {
      mountedRef.current = false;

      if (refreshTimerRef.current) {
        clearTimeout(
          refreshTimerRef.current,
        );

        refreshTimerRef.current = null;
      }
    };
  }, [refreshInventory]);

  // ==========================================================
  // AUTOMATIC REFRESH
  // ==========================================================

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        void refreshInventory(
          LIVE_REFRESH_OPTIONS,
        );
      }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshInventory]);

  // ==========================================================
  // REFRESH WHEN USER RETURNS
  // ==========================================================

  useEffect(() => {
    const refresh = (): void => {
      scheduleInventoryRefresh(
        LIVE_REFRESH_OPTIONS,
      );
    };

    const handleVisibility = (): void => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refresh();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "focus",
      refresh,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "focus",
        refresh,
      );
    };
  }, [scheduleInventoryRefresh]);

  // ==========================================================
  // INVENTORY / SYNC EVENTS
  // ==========================================================

  useEffect(() => {
    const refresh = (): void => {
      scheduleInventoryRefresh(
        LIVE_REFRESH_OPTIONS,
      );
    };

    window.addEventListener(
      INVENTORY_REFRESH_EVENT,
      refresh,
    );

    window.addEventListener(
      SYNC_COMPLETE_EVENT,
      refresh,
    );

    return () => {
      window.removeEventListener(
        INVENTORY_REFRESH_EVENT,
        refresh,
      );

      window.removeEventListener(
        SYNC_COMPLETE_EVENT,
        refresh,
      );
    };
  }, [scheduleInventoryRefresh]);

  // ==========================================================
  // CROSS-TAB / CROSS-WINDOW SYNC
  // ==========================================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return;
    }

    const channel =
      new BroadcastChannel(
        INVENTORY_CHANNEL_NAME,
      );

    broadcastChannelRef.current =
      channel;

    const handleMessage = (
      event: MessageEvent,
    ): void => {
      const type =
        event.data?.type;

      if (
        type === INVENTORY_REFRESH_EVENT ||
        type === SYNC_COMPLETE_EVENT
      ) {
        scheduleInventoryRefresh(
          LIVE_REFRESH_OPTIONS,
        );
      }
    };

    channel.addEventListener(
      "message",
      handleMessage,
    );

    return () => {
      channel.removeEventListener(
        "message",
        handleMessage,
      );

      channel.close();

      if (
        broadcastChannelRef.current ===
        channel
      ) {
        broadcastChannelRef.current =
          null;
      }
    };
  }, [scheduleInventoryRefresh]);

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const dynamicCategories =
    useMemo(() => {
      if (!products) {
        return ["All"];
      }

      const categories =
        new Set<string>();

      for (const product of products) {
        const category =
          getLocalizedValue(
            product.category_name,
            product.category_name_am,
            isAm,
          );

        if (category) {
          categories.add(category);
        }
      }

      return [
        "All",
        ...Array.from(categories).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      ];
    }, [products, isAm]);

  // Keep the selected category valid when
  // the locale changes and category labels change.
  const effectiveSelectedCategory =
    dynamicCategories.includes(
      selectedCategory,
    )
      ? selectedCategory
      : "All";

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  const filteredProducts =
    useMemo(() => {
      if (!products) {
        return [];
      }

      let result = products;

      if (
        effectiveSelectedCategory !==
        "All"
      ) {
        result = result.filter(
          (product) => {
            const category =
              getLocalizedValue(
                product.category_name,
                product.category_name_am,
                isAm,
              );

            return (
              category ===
              effectiveSelectedCategory
            );
          },
        );
      }

      const query =
        searchQuery
          .toLowerCase()
          .trim();

      if (!query) {
        return result;
      }

      return result.filter(
        (product) => {
          const searchableValues = [
            product.name,
            product.name_am,
            product.category_name,
            product.category_name_am,
            product.barcode,
          ];

          return searchableValues.some(
            (value) =>
              value
                ?.toLowerCase()
                .includes(query),
          );
        },
      );
    }, [
      products,
      effectiveSelectedCategory,
      searchQuery,
      isAm,
    ]);

  // ==========================================================
  // COUNT CHANGE
  // ==========================================================

  const handleCountChange =
    useCallback(
      (
        productId: string,
        value: number,
      ): void => {
        if (
          !Number.isFinite(value)
        ) {
          return;
        }

        setCounts((previous) => ({
          ...previous,
          [productId]: Math.max(
            0,
            Math.floor(value),
          ),
        }));
      },
      [],
    );

  // ==========================================================
  // RESET COUNTS
  // ==========================================================

  const handleResetForm =
    useCallback((): void => {
      if (!products) {
        return;
      }

      const confirmed =
        window.confirm(
          t(
            "Clear all unsaved count changes?",
            "ሁሉንም ያልተቀመጡ የቆጠራ ለውጦች ማጥፋት ይፈልጋሉ?",
          ),
        );

      if (!confirmed) {
        return;
      }

      const nextCounts:
        Record<string, number> = {};

      for (const product of products) {
        nextCounts[product.id] =
          liveStockMap[product.id]
            ?.systemCount ??
          product.opening_count ??
          0;
      }

      setCounts(nextCounts);

      toast(
        t(
          "Count changes cleared.",
          "የቆጠራ ለውጦች ጸድተዋል።",
        ),
        "success",
      );
    }, [
      products,
      liveStockMap,
      t,
    ]);

  // ==========================================================
  // RECEIVE STOCK
  // ==========================================================

  const handleReceiveStockSubmit =
    useCallback(
      async (
        e: FormEvent<HTMLFormElement>,
      ): Promise<void> => {
        e.preventDefault();

        if (!receiveProductId) {
          toast(
            t(
              "Please select a product.",
              "እባክዎ ምርት ይምረጡ።",
            ),
            "error",
          );
          return;
        }

        const rawQuantity =
          Number(receiveQty);

        if (
          !Number.isFinite(
            rawQuantity,
          ) ||
          rawQuantity <= 0
        ) {
          toast(
            t(
              "Quantity must be greater than zero.",
              "ብዛቱ ከዜሮ በላይ መሆን አለበት።",
            ),
            "error",
          );
          return;
        }

        const quantity =
          Math.floor(rawQuantity);

        if (quantity <= 0) {
          toast(
            t(
              "Please enter a valid quantity.",
              "እባክዎ ትክክለኛ የእቃ ብዛት ያስገቡ።",
            ),
            "error",
          );
          return;
        }

        const unitCost =
          Number(receiveUnitCost);

        if (
          !Number.isFinite(
            unitCost,
          ) ||
          unitCost < 0
        ) {
          toast(
            t(
              "Please enter a valid unit cost.",
              "እባክዎ ትክክለኛ የመግዣ ዋጋ ያስገቡ።",
            ),
            "error",
          );
          return;
        }

        const matchedProduct =
          products?.find(
            (product) =>
              product.id ===
              receiveProductId,
          );

        if (!matchedProduct) {
          toast(
            t(
              "Product could not be found.",
              "ምርቱ አልተገኘም።",
            ),
            "error",
          );
          return;
        }

        try {
          const db = await getDB();

          const activeShift =
            await db.get(
              "active_shift",
              "current",
            );

          if (!activeShift) {
            toast(
              t(
                "Please open an active shift first.",
                "እባክዎ መጀመሪያ ክፍት የፈረቃ ስራ ይጀምሩ።",
              ),
              "error",
            );
            return;
          }

          const totalCost =
            quantity * unitCost;

          if (
            !Number.isFinite(
              totalCost,
            )
          ) {
            throw new Error(
              "Invalid receipt total.",
            );
          }

          const receipt = {
            localId:
              crypto.randomUUID(),

            createdAt:
              new Date().toISOString(),

            syncStatus:
              "pending" as const,

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
              "Stock received",
          };

          const tx =
            db.transaction(
              "pending_stock_receipts",
              "readwrite",
            );

          await tx
            .objectStore(
              "pending_stock_receipts",
            )
            .put(receipt);

          await tx.done;

          // Update visible stock immediately.
          const currentStock =
            liveStockMap[
              matchedProduct.id
            ]?.systemCount ??
            matchedProduct.opening_count ??
            0;

          const newStock =
            currentStock + quantity;

          setLiveStockMap(
            (previous) => ({
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
            }),
          );

          setCounts(
            (previous) => ({
              ...previous,

              [matchedProduct.id]:
                newStock,
            }),
          );

          // Notify this window.
          window.dispatchEvent(
            new CustomEvent(
              INVENTORY_REFRESH_EVENT,
            ),
          );

          // Notify other tabs/windows.
          broadcastChannelRef.current?.postMessage(
            {
              type:
                INVENTORY_REFRESH_EVENT,
              productId:
                matchedProduct.id,
            },
          );

          const label =
            getProductLabel(
              matchedProduct,
            );

          toast(
            t(
              `Received ${quantity} units of ${label}.`,
              `${quantity} ፍሬ ${label} ገቢ ተደርጓል።`,
            ),
            "success",
          );

          setShowReceiveModal(false);
          setReceiveProductId("");
          setReceiveQty(0);
          setReceiveUnitCost(0);
        } catch (error) {
          console.error(
            "[InventoryPage] receive stock failed",
            error,
          );

          toast(
            t(
              "Failed to save received stock locally.",
              "የገቢ ዕቃውን በአካባቢው ማስቀመጥ አልተቻለም።",
            ),
            "error",
          );
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
      ],
    );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!products) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingSpinner />
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-cream text-coffee-900">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <PageHeader
        title={t(
          "Inventory",
          "የእቃ ማስተዳደሪያ",
        )}
        subtitle={t(
          "Manage stock, receive items, and update counts.",
          "እቃዎችን ያስተዳድሩ፣ ይቀበሉ እና ቆጠራን ያስተካክሉ።",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                setShowReceiveModal(true)
              }
            >
              <PlusCircle className="h-4 w-4" />

              <span>
                {t(
                  "Receive",
                  "ተቀበል",
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
                    "Save Changes",
                    "ለውጦችን አስቀምጥ",
                  )}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <div className="space-y-3">
          {/* --------------------------------------------------
              STOCK OVERVIEW
          -------------------------------------------------- */}

          <InventoryValuation
            products={products}
            liveStockMap={liveStockMap}
            fifoCostValueByProduct={fifoCostValueByProduct}
            fifoCostDataAvailable={fifoCostDataAvailable}
            isAm={isAm}
          />

          {/* --------------------------------------------------
              SEARCH
          -------------------------------------------------- */}

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t(
              "Search product or barcode...",
              "ምርት ወይም ባርኮድ ይፈልጉ...",
            )}
          />

          {/* --------------------------------------------------
              CATEGORY FILTER
          -------------------------------------------------- */}

          <div className="-mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
            <InventoryCategoryTabs
              categories={
                dynamicCategories
              }
              selected={
                effectiveSelectedCategory
              }
              onSelect={
                setSelectedCategory
              }
              allLabel={t(
                "All",
                "ሁሉም",
              )}
            />
          </div>

          {/* --------------------------------------------------
              PRODUCTS
          -------------------------------------------------- */}

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
                (product) =>
                  handleSaveSingleRow(
                    product,
                    counts,
                    liveStockMap,
                  )
              }
            />
          )}

          {/* --------------------------------------------------
              UNSAVED CHANGES
          -------------------------------------------------- */}

          <div className="flex justify-end pt-0.5">
            <Button
              variant="ghost"
              onClick={
                handleResetForm
              }
              className="text-sm"
              aria-label={t(
                "Clear unsaved count changes",
                "ያልተቀመጡ የቆጠራ ለውጦችን አጽዳ",
              )}
              title={t(
                "Clear unsaved count changes",
                "ያልተቀመጡ የቆጠራ ለውጦችን አጽዳ",
              )}
            >
              <RotateCcw className="h-4 w-4" />

              {t(
                "Clear Changes",
                "ለውጦችን አጽዳ",
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* ======================================================
          RECEIVE STOCK
      ====================================================== */}

      <ReceiveStockModal
        open={
          showReceiveModal
        }
        onClose={() =>
          setShowReceiveModal(false)
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
  );
}

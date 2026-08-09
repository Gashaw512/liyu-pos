// src/app/[locale]/(app)/inventory/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ArrowDownToLine
} from 'lucide-react'
import { getDB } from '@/lib/offline/db'
import { toast } from '@/lib/utils/toast'
import { getLocalInventoryProducts } from '@/hooks/useInventoryData'
import { useInventoryActions } from '@/hooks/useInventoryActions'
import { computeLiveLocalStock } from '@/lib/calculations/stockCalculator'
import { SearchInput } from "@/components/ui/SearchInput"
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ReceiveStockModal from '@/components/inventory/ReceiveStockModal'
import InventoryBottomBar from '@/components/inventory/InventoryBottomBar'
import InventoryCategoryTabs from '@/components/inventory/InventoryCategoryTabs'
import InventoryValuation from '@/components/inventory/InventoryValuation'
import InventorySummaryCard from '@/components/inventory/InventorySummaryCard'
import InventoryEmptyState from '@/components/inventory/InventoryEmptyState'
import InventoryProductList from '@/components/inventory/InventoryProductList'

import type { InventoryProduct, LocalPendingStockCount } from '@/types/inventory'

export const dynamic = 'force-dynamic';

import type { LiveMetaData } from '@/types/inventory'

export default function InventoryPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  const [products, setProducts] = useState<InventoryProduct[] | null>(null)
  const [liveStockMap, setLiveStockMap] = useState<Record<string, LiveMetaData>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [isSaving, setIsSaving] = useState(false)
  const [rowSavingId, setRowSavingId] = useState<string | null>(null)

  // const [isValuationExpanded, setIsValuationExpanded] = useState<boolean>(false)
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false)

  const [receiveProductId, setReceiveProductId] = useState<string>('')
  const [receiveQty, setReceiveQty] = useState<number>(0)
  const [receiveUnitCost, setReceiveUnitCost] = useState<number>(0)

  const t = (en: string, am: string) => (isAm ? am : en)

  const {
    handleSaveSingleRow,
    handleSaveAll
  } = useInventoryActions(
    setLiveStockMap,
    setRowSavingId,
    setIsSaving,
    t,
    isAm
  )

  useEffect(() => {
    async function loadStockSheet() {
      try {
        const db = await getDB();
        const baseProducts = await getLocalInventoryProducts();
        const computedMap = await computeLiveLocalStock(db, baseProducts);

        setProducts(baseProducts);
        setLiveStockMap(computedMap);

        const initialCounts: Record<string, number> = {};
        baseProducts.forEach((p) => {
          initialCounts[p.id] = computedMap[p.id]?.systemCount ?? p.opening_count;
        });
        setCounts(initialCounts);
      } catch (err) {
        console.error('Critical snapshot assembly loop failure:', err);
      }
    }
    loadStockSheet();
  }, []);

  const dynamicCategories = useMemo(() => {
    if (!products) return ['All']
    const tags = new Set<string>()
    products.forEach(p => {
      const name = isAm && p.category_name_am ? p.category_name_am : p.category_name
      if (name) tags.add(name)
    })
    return ['All', ...Array.from(tags)]
  }, [products, isAm])

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let list = products;

    if (selectedCategory !== 'All') {
      list = list.filter(p => {
        const catName = isAm && p.category_name_am ? p.category_name_am : p.category_name
        return catName === selectedCategory
      })
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return list;

    return list.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      (p.name_am && p.name_am.toLowerCase().includes(query)) ||
      p.category_name.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    );
  }, [searchQuery, products, selectedCategory, isAm]);

  const handleCountChange = (productId: string, value: number) => {
    setCounts((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  const handleResetForm = () => {
    if (!products) return
    if (confirm(t('Reset all modifications back to current system baselines?', 'ሁሉንም ማስተካከያዎች ወደ ነበረበት የስርዓት መለኪያ ይመልሱ?'))) {
      const initialCounts: Record<string, number> = {}
      products.forEach((p) => {
        initialCounts[p.id] = liveStockMap[p.id]?.systemCount ?? p.opening_count
      })
      setCounts(initialCounts)
    }
  }

  const handleReceiveStockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiveProductId || receiveQty <= 0) return
    const matchedProd = products?.find(p => p.id === receiveProductId)
    const label = matchedProd ? (isAm && matchedProd.name_am ? matchedProd.name_am : matchedProd.name) : 'Product'

    toast(t(
      `Stock incoming requested: ${receiveQty} units for ${label}.`,
      `አዲስ ገቢ ዕቃ ተመዝግቧል: ${receiveQty} ፍሬ ለ ${label}።`
    ))
    setShowReceiveModal(false)
    setReceiveQty(0)
    setReceiveUnitCost(0)
    setReceiveProductId('')
  }

  if (!products) {
    return (
      <div className="min-h-screen bg-[#F7F4EB]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="
    min-h-screen
    bg-[#F7F4EB]
    text-[#2B1E1A]
    pb-32
  "
    >

      {/* Top Action Header Control Grid */}
      <PageHeader
        title={t("Inventory Count", "የእቃ ቆጠራ")}
        subtitle={t(
          "Manage stock quantities",
          "የእቃ ብዛት ያስተዳድሩ"
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                router.push(`/${locale}/reports`)
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <Button
              onClick={() =>
                setShowReceiveModal(true)
              }
            >
              <PlusCircle className="w-4 h-4" />

              {t(
                "Receive",
                "ተቀበል"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleResetForm}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <main
        className="
            max-w-3xl
            mx-auto
            px-4
            py-4
            space-y-4
            "
      >

        {/* Expanded Evaluation Summary Panel Dropdown */}
        <InventorySummaryCard
          products={products}
          liveStockMap={liveStockMap}
          isAm={isAm}
          t={t}
        />

        {/* Global Catalog Text Query Filter Control Input */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t(
            "Search products...",
            "ምርቶችን ይፈልጉ..."
          )}
        />

        {/* Categories Tab Row Selection List */}
        <InventoryCategoryTabs
          categories={dynamicCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          allLabel={t(
            'All Groups',
            'ሁሉም ምድብ'
          )}
        />

        {/* Clean Main Feed List Loop Container */}
        <div className="space-y-4">
          {filteredProducts.length === 0 ? (
            <InventoryEmptyState t={t} />
          ) : (
            <InventoryProductList
              products={filteredProducts}
              counts={counts}
              liveStockMap={liveStockMap}
              rowSavingId={rowSavingId}
              isAm={isAm}
              t={t}
              onCountChange={handleCountChange}
              // onSaveRow={handleSaveSingleRow}



              onSaveRow={(product) =>
                handleSaveSingleRow(
                  product,
                  counts,
                  liveStockMap
                )
              }
            />
          )}
        </div>
      </main>

      {/* Persistent App Sync Floating Trigger Action Tray */}
      <InventoryBottomBar
        loading={isSaving}
        onSave={() =>
          handleSaveAll(
            products!,
            counts,
            liveStockMap
          )
        }
        label={t(
          'Save All Changes',
          'ሁሉንም አስቀምጥ'
        )}
      />

      {/* Stock Reception Popover Menu Dialog Window Box */}
      <ReceiveStockModal
        open={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        products={products}
        isAm={isAm}
        receiveProductId={receiveProductId}
        setReceiveProductId={setReceiveProductId}
        receiveQty={receiveQty}
        setReceiveQty={setReceiveQty}
        receiveUnitCost={receiveUnitCost}
        setReceiveUnitCost={setReceiveUnitCost}
        onSubmit={handleReceiveStockSubmit}
        t={t}
      />

    </div>
  )
}
// src/app/[locale]/(app)/management/price-group/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ArrowLeft,
  Coins,
  Layers
} from 'lucide-react'

import { getBusinessId } from '@/lib/auth/getBusinessId'
import {
  getPriceGroups,
  deletePriceGroup
} from '@/queries/usePriceGroupQueries'

export default function PriceGroupsPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ NEW: Preview Drawer State
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewGroup, setPreviewGroup] = useState<any>(null)

  /* ───────────────── LOAD ───────────────── */
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) return

      const data = await getPriceGroups(businessId)
      setGroups(data)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  /* ───────────────── DELETE ───────────────── */
  const handleDelete = async (id: string) => {
    const ok = confirm(
      isAm
        ? 'ይህን ቦኖ ማጥፋት እርግጠኛ ነዎት?'
        : 'Delete this price group?'
    )
    if (!ok) return

    try {
      await deletePriceGroup(id)
      await loadGroups()
    } catch (err) {
      console.error(err)
      alert(isAm ? 'ማጥፋት አልተሳካም' : 'Delete failed')
    }
  }

  /* ───────────────── UI STATES ───────────────── */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-berbere-500" />
      </div>
    )
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="max-w-md mx-auto pb-24 space-y-5 px-4 pt-4">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">

        <button
          onClick={() => router.push(`/${locale}/management`)}
          className="flex items-center gap-2 text-xs font-bold text-coffee-500"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAm ? 'Back' : 'Back'}
        </button>

        <button
          onClick={() =>
            router.push(`/${locale}/management/price-groups/new`)
          }
          className="bg-berbere-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isAm ? 'አዲስ' : 'Create'}
        </button>

      </div>

      {/* TITLE */}
      <div className="flex items-center gap-3">

        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-berbere-500 to-red-500 flex items-center justify-center shadow-lg">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-30 bg-white" />
          <Coins className="w-6 h-6 text-white relative z-10" />
        </div>

        <div className="flex flex-col">
          <h1 className="text-lg font-black text-coffee-900 tracking-tight">
            {isAm ? 'ቦኖ ስርዓት' : 'Bono Pricing System'}
          </h1>
          <p className="text-[11px] font-bold text-coffee-400 uppercase tracking-widest">
            {isAm ? 'የዋጋ ቡድን አስተዳደር' : 'Group-based pricing engine'}
          </p>
        </div>

      </div>

      {/* SUMMARY CARD */}
      <div className="bg-gradient-to-r from-berbere-500 to-red-500 rounded-3xl p-5 text-white">
        <p className="text-xs uppercase tracking-widest opacity-80">
          Price Groups
        </p>

        <h2 className="text-3xl font-black">
          {groups.length}
        </h2>

        <p className="text-xs opacity-90">
          Active Bono Configurations
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-3">

        {groups.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-10">
            {isAm ? 'ምንም ቦኖ የለም' : 'No price groups found'}
          </p>
        ) : (
          groups.map((g) => (
            <div
              key={g.id}
              onClick={() => {
                setPreviewGroup(g)
                setPreviewOpen(true)
              }}
              className="bg-white rounded-2xl border border-cream-200 shadow-card overflow-hidden hover:shadow-lg transition-all cursor-pointer"
            >

              {/* HEADER */}
              <div className="p-4 flex items-start justify-between">

                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-berbere-500 to-red-500 flex items-center justify-center shadow-md">
                    <Coins className="w-5 h-5 text-white" />
                  </div>

                  <div>
                    <h3 className="font-black text-coffee-900 text-base">
                      {isAm ? g.name_am : g.name}
                    </h3>

                    <p className="text-[11px] text-coffee-400 font-bold uppercase">
                      {isAm ? g.name : g.name_am}
                    </p>

                    <p className="text-[10px] text-coffee-300 mt-1">
                      {g.is_active ? 'Active Pricing Rule' : 'Inactive'}
                    </p>
                  </div>

                </div>

                <div className="text-right">
                  <div className="bg-berbere-50 text-berbere-700 px-3 py-1.5 rounded-xl font-black text-lg">
                    {Number(g.amount).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-coffee-400">
                    ETB / Group
                  </p>
                </div>

              </div>

              {/* INFO */}
              <div className="px-4 pb-3 flex justify-between text-xs font-bold text-coffee-500">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-coffee-400" />
                  {g.products?.length ?? 0} Products
                </div>

                <span className="text-[10px] uppercase">
                  Click to preview
                </span>
              </div>

              {/* ACTIONS */}
              <div className="flex border-t border-cream-100">

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/${locale}/management/price-groups/${g.id}/edit`)
                  }}
                  className="flex-1 py-3 flex items-center justify-center gap-2 text-gold-700 hover:bg-gold-50"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">
                    {isAm ? 'አርም' : 'Edit'}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(g.id)
                  }}
                  className="flex-1 py-3 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">
                    {isAm ? 'ሰርዝ' : 'Delete'}
                  </span>
                </button>

              </div>

            </div>
          ))
        )}

      </div>

      {/*
          BONO QUICK PREVIEW DRAWER
     */}
    {previewOpen && previewGroup && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-end">

    {/* BACKDROP */}
    <div
      className="absolute inset-0"
      onClick={() => setPreviewOpen(false)}
    />

    {/* SHEET */}
    <div className="relative w-full bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up">

      {/* HANDLE */}
      <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-black text-coffee-900">
            {previewGroup.name}
          </h3>

          <p className="text-[11px] text-gray-400 font-bold uppercase">
            BONO Intelligence Panel
          </p>
        </div>

        <button
          onClick={() => setPreviewOpen(false)}
          className="text-xs font-bold text-gray-500"
        >
          Close
        </button>
      </div>

      {/* =========================
          1. IMPACT SUMMARY
      ========================== */}
      <div className="grid grid-cols-2 gap-3 mb-5">

        <div className="bg-cream-50 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-gray-500">
            Products
          </p>
          <p className="text-lg font-black">
            {previewGroup.products?.length ?? 0}
          </p>
        </div>

        <div className="bg-cream-50 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-gray-500">
            Price
          </p>
          <p className="text-lg font-black text-berbere-600">
            {Number(previewGroup.amount).toFixed(2)} ETB
          </p>
        </div>

      </div>

      {/* =========================
          2. INTELLIGENCE SUMMARY
      ========================== */}
      <div className="mb-5 space-y-2">

        <p className="text-[11px] font-black text-gray-500 uppercase">
          Impact Analysis
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-bold text-blue-700">
          📊 {previewGroup.products?.length ?? 0} products will be priced under this BONO rule
        </div>

        {(previewGroup.products?.length ?? 0) > 10 && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs font-bold text-yellow-700">
            ⚠ Large group detected — pricing impact is significant
          </div>
        )}

      </div>

      {/* =========================
          3. SMART PRODUCT LIST
      ========================== */}
      <div className="space-y-3">

        <p className="text-[11px] font-black text-gray-500 uppercase">
          Linked Products
        </p>

        {(previewGroup.products?.length ?? 0) === 0 ? (
          <p className="text-xs text-gray-400">
            No products assigned
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">

              {(previewGroup.products || [])
                .slice(0, 8)
                .map((p: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-berbere-50 text-berbere-700 rounded-full text-[11px] font-bold"
                  >
                    {p.name || p}
                  </span>
                ))}

            </div>

            {(previewGroup.products?.length ?? 0) > 8 && (
              <p className="text-[11px] text-gray-400 font-bold">
                +{previewGroup.products.length - 8} more products
              </p>
            )}
          </>
        )}

      </div>

      {/* =========================
          4. REVENUE SIMULATION
      ========================== */}
      <div className="mt-5 space-y-2">

        <p className="text-[11px] font-black text-gray-500 uppercase">
          Revenue Estimate
        </p>

        <div className="bg-green-50 border border-green-100 rounded-xl p-3">

          <p className="text-xs font-bold text-green-700">
            Avg price per item: <span className="font-black">{Number(previewGroup.amount).toFixed(2)} ETB</span>
          </p>

          <p className="text-xs font-bold text-green-700 mt-1">
            Estimated full batch value:
            <span className="font-black">
              {" "}{((previewGroup.products?.length ?? 0) * Number(previewGroup.amount || 0)).toFixed(2)} ETB
            </span>
          </p>

        </div>

      </div>

      {/* =========================
          FOOTER
      ========================== */}
      <div className="mt-5 pt-3 border-t text-[10px] text-gray-400">
        Last updated:{" "}
        {new Date(previewGroup.updated_at || Date.now()).toLocaleString()}
      </div>

    </div>
  </div>
)}

    </div>
  )
}
// src/app/[locale]/(app)/management/products/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles
} from 'lucide-react'

import { getBusinessId } from '@/lib/auth/getBusinessId'
import { getProducts, deleteProduct } from '@/queries/useProductsQuery'
import type { ProductListItem } from '@/types/dto/product.dt'

export default function ProductsPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ───────────────── LOAD ───────────────── */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error(isAm ? 'ቢዝነስ አልተገኘም' : 'Missing business session')
      }

      const data = await getProducts(businessId)
      setProducts(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [isAm])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  /* ───────────────── DELETE ───────────────── */
  const handleDelete = async (id: string) => {
    const confirmed = confirm(isAm ? 'እርግጠኛ ነዎት?' : 'Delete this product?')
    if (!confirmed) return

    setProducts(prev => prev.filter(p => p.id !== id))

    try {
      const ok = await deleteProduct(id)
      if (!ok) throw new Error()
    } catch {
      alert(isAm ? 'ማጥፋት አልተሳካም' : 'Delete failed')
      loadProducts()
    }
  }

  /* ───────────────── STATES ───────────────── */
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-berbere-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-bold text-red-600">{error}</p>

        <button
          onClick={loadProducts}
          className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold"
        >
          {isAm ? 'እንደገና ሞክር' : 'Retry'}
        </button>
      </div>
    )
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="max-w-md mx-auto pb-28 space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between px-1">

        <button
          onClick={() => router.push(`/${locale}/management`)}
          className="flex items-center gap-2 text-coffee-500 font-bold text-[12px]"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <button
          onClick={() => router.push(`/${locale}/management/products/new`)}
          className="bg-coffee-900 text-white px-4 py-2 rounded-xl text-[12px] font-black flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isAm ? 'አዲስ' : 'Add'}
        </button>
      </div>

      {/* TITLE */}
      <div className="px-1">
        <h1 className="text-xl font-black flex items-center gap-2">
          <Package className="w-6 h-6 text-berbere-500" />
          {isAm ? 'ምርቶች' : 'Products'}
        </h1>

        <p className="text-[11px] text-coffee-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-berbere-500" />
          {products.length} {isAm ? 'ንጥሎች' : 'items in system'}
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-3">

        {products.map((p) => {
          const isGroup = p.price_type === 'group'
          const isInactive = !p.is_active

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-cream-200 p-3 shadow-sm hover:shadow-md transition"
            >

              {/* TOP ROW */}
              <div className="flex justify-between items-center">

                {/* LEFT */}
                <div className="flex items-center gap-3">

                  <div className="w-14 h-14 rounded-xl bg-cream-100 flex items-center justify-center border overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div>
                    <p className="font-black text-sm text-coffee-900">
                      {p.name}
                    </p>

                    <p className="text-[11px] text-coffee-400">
                      {p.category_name || (isAm ? 'ምድብ የለም' : 'No category')}
                    </p>
                  </div>

                </div>

                {/* RIGHT PRICE */}
                <div className="text-right">
                  <p className="font-black text-berbere-600 text-sm">
                    {p.retail_price} ETB
                  </p>
                  <p className="text-[10px] text-coffee-400">
                    retail price
                  </p>
                </div>

              </div>

              {/* TAGS */}
              <div className="flex gap-2 mt-3 flex-wrap">

                <span className={`text-[10px] px-2 py-1 rounded-full font-black ${
                  isGroup
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isGroup ? (isAm ? 'ቡኖ' : 'BONO') : (isAm ? 'ቀጥታ' : 'FIXED')}
                </span>

                {isInactive && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 font-black">
                    {isAm ? 'ተዘግቷል' : 'Inactive'}
                  </span>
                )}

                {/* LIGHT INTELLIGENCE SIGNAL */}
                {isGroup && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-black">
                    ⚡ BONO LINKED
                  </span>
                )}

              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-2 mt-3">

                <button
                  onClick={() =>
                    router.push(`/${locale}/management/products/${p.id}/edit`)
                  }
                  className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>

              </div>

            </div>
          )
        })}

        {/* EMPTY */}
        {products.length === 0 && (
          <div className="text-center py-20 text-sm font-bold text-gray-400">
            {isAm ? 'ምርት አልተገኘም' : 'No products found'}
          </div>
        )}

      </div>
    </div>
  )
}
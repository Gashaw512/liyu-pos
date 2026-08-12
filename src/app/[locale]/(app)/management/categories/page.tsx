'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react'

import { getCategories, deleteCategory } from '@/queries/useCategoryQueries'
import { getBusinessId } from '@/lib/auth/getBusinessId'

export default function CategoriesPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'empty'>('all')

  /* ───────────────── LOAD ───────────────── */
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) return

      const data = await getCategories(businessId)
      setCategories(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  /* ───────────────── DELETE ───────────────── */
  const handleDelete = async (id: string) => {
    const ok = confirm(
      isAm ? 'ይህን ምድብ ማጥፋት እርግጠኛ ነዎት?' : 'Delete this category?'
    )
    if (!ok) return

    try {
      await deleteCategory(id)
      await loadCategories()
    } catch (err) {
      alert(isAm ? 'ማጥፋት አልተሳካም' : 'Delete failed')
    }
  }

  /* ───────────────── FILTERED DATA ───────────────── */
  const filtered = useMemo(() => {
    return categories.filter(c => {
      const q = search.toLowerCase()
      const count = c.products?.length ?? 0

      const matchSearch =
        c.name?.toLowerCase().includes(q) ||
        c.name_am?.toLowerCase().includes(q)

      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'empty'
            ? count === 0
            : count > 0

      return matchSearch && matchFilter
    })
  }, [categories, search, filter])

  const totalProducts = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.products?.length ?? 0), 0)
  }, [categories])

  const emptyCount = useMemo(() => {
    return categories.filter(c => (c.products?.length ?? 0) === 0).length
  }, [categories])

  /* ───────────────── LOADING ───────────────── */
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-berbere-500" />
      </div>
    )
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5 px-4 pt-4">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">

        <button
          onClick={() => router.push(`/${locale}/management`)}
          className="flex items-center gap-2 text-coffee-500 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAm ? 'መመለስ' : 'Back'}
        </button>

        <button
          onClick={() => router.push(`/${locale}/management/categories/new`)}
          className="bg-coffee-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isAm ? 'አዲስ' : 'Add'}
        </button>

      </div>

      {/* HEADER */}
      <div>
        <h1 className="text-xl font-black flex items-center gap-2 text-coffee-900">
          <Tag className="w-6 h-6 text-berbere-500" />
          {isAm ? 'ምድቦች' : 'Categories'}
        </h1>

        <p className="text-[11px] text-coffee-400 font-bold uppercase mt-1">
          {isAm
            ? 'የምርት ምድቦች አስተዳደር'
            : 'Manage your product categories'}
        </p>
      </div>

      {/* SIMPLE INSIGHT BOX (VERY IMPORTANT FOR NON-TECH USERS) */}
      <div className="bg-gradient-to-r from-coffee-900 to-berbere-600 text-white rounded-2xl p-4">

        <p className="text-xs uppercase opacity-80">
          {isAm ? 'የስርዓት መረጃ' : 'System Insight'}
        </p>

        <p className="text-sm font-bold mt-1">
          {emptyCount === 0
            ? isAm
              ? 'ሁሉም ምድቦች በስራ ላይ ናቸው'
              : 'All categories are working well'
            : isAm
              ? `${emptyCount} ምድቦች ባዶ ናቸው`
              : `${emptyCount} categories need attention`}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2">

        <div className="bg-white border rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">
            {isAm ? 'ምድቦች' : 'Categories'}
          </p>
          <p className="text-lg font-black text-coffee-900">
            {categories.length}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">
            {isAm ? 'ምርቶች' : 'Products'}
          </p>
          <p className="text-lg font-black text-berbere-600">
            {totalProducts}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">
            {isAm ? 'ባዶ' : 'Empty'}
          </p>
          <p className="text-lg font-black text-red-500">
            {emptyCount}
          </p>
        </div>

      </div>

      {/* FILTER BUTTONS */}
      <div className="flex gap-2">

        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            filter === 'all' ? 'bg-coffee-900 text-white' : 'bg-gray-100'
          }`}
        >
          {isAm ? 'ሁሉም' : 'All'}
        </button>

        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100'
          }`}
        >
          {isAm ? 'ንቁ' : 'Active'}
        </button>

        <button
          onClick={() => setFilter('empty')}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            filter === 'empty' ? 'bg-red-600 text-white' : 'bg-gray-100'
          }`}
        >
          {isAm ? 'ባዶ' : 'Empty'}
        </button>

      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAm ? 'ፈልግ...' : 'Search categories...'}
          className="w-full h-[44px] pl-10 pr-4 rounded-xl border text-sm font-bold"
        />
      </div>

      {/* LIST */}
      <div className="space-y-3">

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-bold">
            {isAm ? 'ምንም አልተገኘም' : 'No categories found'}
          </div>
        ) : (
          filtered.map((c) => {
            const count = c.products?.length ?? 0

            const status =
              count === 0 ? 'empty' :
              count <= 3 ? 'low' : 'active'

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border p-4 space-y-3 shadow-sm"
              >

                {/* TOP */}
                <div className="flex justify-between">

                  <div>
                    <p className="font-black text-sm text-coffee-900">
                      {c.name}
                    </p>

                    <p className="text-[11px] text-gray-400 font-bold">
                      {c.name_am}
                    </p>

                    <p className="text-[11px] mt-1 font-bold text-gray-500">
                      {status === 'empty' && (isAm ? 'ምንም ምርት የለም' : 'No products')}
                      {status === 'low' && (isAm ? 'ትንሽ ምርት' : 'Low products')}
                      {status === 'active' && (isAm ? 'ጥሩ ምድብ' : 'Healthy category')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-coffee-900">
                      {count}
                    </p>
                    <p className="text-[10px] uppercase text-gray-400">
                      {isAm ? 'ምርቶች' : 'Products'}
                    </p>
                  </div>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 pt-2 border-t">

                  <button
                    onClick={() =>
                      router.push(`/${locale}/management/categories/${c.id}/edit`)
                    }
                    className="flex-1 bg-gray-100 py-2 rounded-lg text-xs font-bold"
                  >
                    {isAm ? 'አርም' : 'Edit'}
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold"
                  >
                    {isAm ? 'ሰርዝ' : 'Delete'}
                  </button>

                </div>

              </div>
            )
          })
        )}

      </div>

    </div>
  )
}
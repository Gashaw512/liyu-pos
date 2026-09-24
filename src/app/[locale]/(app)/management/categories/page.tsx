
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Edit2,
  Search,
  Package,
} from 'lucide-react'

import {
  getCategories,
  deleteCategory,
} from '@/queries/useCategoryQueries'
import { getBusinessId } from '@/lib/auth/getBusinessId'

interface CategoryProduct {
  id: string
}

interface Category {
  id: string
  business_id: string
  name: string
  name_am: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  deleted_at: string | null
  products?: CategoryProduct[]
}

export default function CategoriesPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'empty'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /* ───────────────── LOAD ───────────────── */

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        setCategories([])
        return
      }

      const data = await getCategories(businessId)

      setCategories((data ?? []) as Category[])
    } catch (error) {
      console.error('[CATEGORIES] Failed to load:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  /* ───────────────── DELETE ───────────────── */

  const handleDelete = async (id: string) => {
    const category = categories.find((item) => item.id === id)

    if (!category) return

    const productCount = category.products?.length ?? 0

    const message =
      productCount > 0
        ? isAm
          ? `ይህ ምድብ ${productCount} ምርት አለው። ምድቡን ማጥፋት እርግጠኛ ነዎት?`
          : `This category contains ${productCount} product${
              productCount === 1 ? '' : 's'
            }. Are you sure you want to delete it?`
        : isAm
          ? 'ይህን ባዶ ምድብ ማጥፋት እርግጠኛ ነዎት?'
          : 'Are you sure you want to delete this empty category?'

    if (!confirm(message)) return

    try {
      setDeletingId(id)

      await deleteCategory(id)
      await loadCategories()
    } catch (error) {
      console.error('[CATEGORIES] Delete failed:', error)

      alert(
        isAm
          ? 'ምድቡን ማጥፋት አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
          : 'The category could not be deleted. Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  /* ───────────────── FILTERED DATA ───────────────── */

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return categories.filter((category) => {
      const productCount = category.products?.length ?? 0

      const matchesSearch =
        !query ||
        category.name?.toLowerCase().includes(query) ||
        category.name_am?.toLowerCase().includes(query)

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
            ? category.is_active && productCount > 0
            : productCount === 0

      return matchesSearch && matchesFilter
    })
  }, [categories, search, filter])

  /* ───────────────── SUMMARY ───────────────── */

  const totalProducts = useMemo(() => {
    return categories.reduce(
      (total, category) => total + (category.products?.length ?? 0),
      0
    )
  }, [categories])

  const emptyCount = useMemo(() => {
    return categories.filter(
      (category) => (category.products?.length ?? 0) === 0
    ).length
  }, [categories])

  const activeCount = useMemo(() => {
    return categories.filter((category) => category.is_active).length
  }, [categories])

  /* ───────────────── LOADING ───────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-berbere-500" />
      </div>
    )
  }

  /* ───────────────── UI ───────────────── */

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-4">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/management`)}
          className="flex items-center gap-2 text-xs font-bold text-coffee-500"
        >
          <ArrowLeft className="h-4 w-4" />

          {isAm ? 'መመለስ' : 'Back'}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(`/${locale}/management/categories/new`)
          }
          className="flex items-center gap-2 rounded-xl bg-coffee-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-coffee-800"
        >
          <Plus className="h-4 w-4" />

          {isAm ? 'አዲስ ምድብ' : 'New Category'}
        </button>
      </div>

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-berbere-50">
            <Tag className="h-5 w-5 text-berbere-600" />
          </div>

          <div>
            <h1 className="text-xl font-black text-coffee-900">
              {isAm ? 'ምድቦች' : 'Categories'}
            </h1>

            <p className="text-[11px] font-bold text-coffee-400">
              {isAm
                ? 'የምርት ምድቦችን ያደራጁ'
                : 'Organize your products into categories'}
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            {isAm ? 'ምድቦች' : 'Categories'}
          </p>

          <p className="mt-1 text-lg font-black text-coffee-900">
            {categories.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            {isAm ? 'ምርቶች' : 'Products'}
          </p>

          <p className="mt-1 text-lg font-black text-berbere-600">
            {totalProducts}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            {isAm ? 'ባዶ' : 'Empty'}
          </p>

          <p className="mt-1 text-lg font-black text-red-500">
            {emptyCount}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            isAm ? 'ምድብ ፈልግ...' : 'Search categories...'
          }
          className="h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-berbere-500 focus:ring-2 focus:ring-berbere-100"
        />
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-coffee-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isAm ? 'ሁሉም' : 'All'}
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isAm ? 'ንቁ' : 'Active'} ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('empty')}
          className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition ${
            filter === 'empty'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isAm ? 'ባዶ' : 'Empty'} ({emptyCount})
        </button>
      </div>

      {/* CATEGORY LIST */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>

            <p className="text-sm font-bold text-gray-500">
              {search
                ? isAm
                  ? 'የሚፈልጉት ምድብ አልተገኘም'
                  : 'No matching categories found'
                : isAm
                  ? 'ምንም ምድብ የለም'
                  : 'No categories yet'}
            </p>

            {!search && filter === 'all' && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/${locale}/management/categories/new`)
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-coffee-900 px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                {isAm ? 'ምድብ ይጨምሩ' : 'Add Category'}
              </button>
            )}
          </div>
        ) : (
          filtered.map((category) => {
            const productCount = category.products?.length ?? 0
            const isEmpty = productCount === 0

            return (
              <div
                key={category.id}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                {/* CATEGORY INFO */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            category.color || '#F2652215',
                        }}
                      >
                        <Tag className="h-4 w-4 text-berbere-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-coffee-900">
                          {category.name}
                        </p>

                        {category.name_am && (
                          <p className="truncate text-[11px] font-medium text-gray-400">
                            {category.name_am}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PRODUCT COUNT */}
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Package className="h-3.5 w-3.5 text-gray-400" />

                      <span className="text-lg font-black text-coffee-900">
                        {productCount}
                      </span>
                    </div>

                    <p className="text-[9px] font-bold uppercase text-gray-400">
                      {isAm ? 'ምርቶች' : 'Products'}
                    </p>
                  </div>
                </div>

                {/* EMPTY NOTICE */}
                {isEmpty && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11px] font-medium text-gray-500">
                    {isAm
                      ? 'እስካሁን ምርት አልተመደበለትም።'
                      : 'No products have been assigned to this category yet.'}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/${locale}/management/categories/${category.id}/edit`
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
                  >
                    <Edit2 className="h-3.5 w-3.5" />

                    {isAm ? 'አርም' : 'Edit'}
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === category.id}
                    onClick={() => handleDelete(category.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === category.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}

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


// src/app/[locale]/(app)/management/price-group/new/page.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Save,
  CheckSquare,
  Square,
  Layers,
  Search,
  Check,
  Sparkles
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'
import { createPriceGroup } from '@/queries/usePriceGroupQueries'

const supabase = createClient()

interface Product {
  id: string
  name: string
  name_am: string
}

export default function NewPriceGroupPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    amount: ''
  })

  /* ───────────────── LOAD PRODUCTS ───────────────── */
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoading(true)

        const businessId = await getBusinessId()
        if (!businessId) return

        const { data, error } = await supabase
          .from('products')
          .select('id, name, name_am')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .order('name', { ascending: true })

        if (error) throw error
        setProducts(data || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setInitialLoading(false)
      }
    }

    loadData()
  }, [])

  /* ───────────────── PRODUCT FILTER (OPTIMIZED) ───────────────── */
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return products

    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.name_am?.toLowerCase().includes(q)
    )
  }, [searchQuery, products])

  /* ───────────────── SELECTION LOGIC ───────────────── */
  const toggleProductSelection = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id)

    const allSelected = filteredIds.every(id => selected.includes(id))

    if (allSelected) {
      setSelected(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelected(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  /* ───────────────── SUBMIT ───────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.amount || Number(form.amount) <= 0) return

    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) {
        throw new Error(isAm ? 'የንግድ መለያ አልተገኘም' : 'Business ID Missing')
      }

      const group = await createPriceGroup({
        business_id: businessId,
        name: form.name.trim() || `Bono ${form.amount}`,
        name_am: form.name_am.trim() || `ቦኖ ${form.amount}`,
        amount: Number(form.amount)
      })

      if (selected.length > 0) {
        const { error } = await supabase
          .from('products')
          .update({
            price_group_id: group.id,
            price_type: 'group',
            retail_price: Number(form.amount)
          })
          .in('id', selected)

        if (error) throw error
      }

      router.push(`/${locale}/management/price-groups`)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="max-w-2xl mx-auto pb-28 space-y-6 px-4 pt-3">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-coffee-400 font-bold text-[11px] uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <div className="flex items-center gap-2 text-[10px] text-coffee-400 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-berbere-500" />
          BONO ENGINE
        </div>
      </div>

      {/* TITLE */}
      <div>
        <h1 className="text-xl font-black text-coffee-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-berbere-500" />
          {isAm ? 'አዲስ ቦኖ' : 'Create BONO Group'}
        </h1>

        <p className="text-[11px] font-bold text-coffee-400 uppercase tracking-widest">
          {isAm
            ? 'የቡድን ዋጋ አስተዳደር'
            : 'Group-based pricing engine'}
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* INPUTS */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-card space-y-4">

          <input
            placeholder={isAm ? 'አማርኛ ስም' : 'Amharic name'}
            className="w-full h-12 px-4 rounded-xl border font-bold"
            value={form.name_am}
            onChange={e => setForm(p => ({ ...p, name_am: e.target.value }))}
          />

          <input
            placeholder="English name"
            className="w-full h-12 px-4 rounded-xl border font-bold"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />

          <input
            type="number"
            placeholder="Price (ETB)"
            className="w-full h-12 px-4 rounded-xl border font-black text-berbere-600"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          />
        </div>

        {/* INTELLIGENCE BAR */}
        <div className="bg-berbere-50 border border-berbere-100 rounded-xl p-3 text-xs font-bold text-berbere-700">
          ⚡ {selected.length} products selected — BONO will apply instantly
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300" />
          <input
            className="w-full h-11 pl-10 rounded-xl border"
            placeholder={isAm ? 'ፍለጋ...' : 'Search products...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* SELECT ALL */}
        <button
          type="button"
          onClick={handleSelectAllFiltered}
          className="text-xs font-black text-gold-600 uppercase"
        >
          {isAm ? 'ሁሉንም ምረጥ' : 'Toggle Filter Selection'}
        </button>

        {/* PRODUCTS */}
        <div className="border rounded-xl bg-white max-h-[260px] overflow-auto divide-y">

          {initialLoading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-coffee-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-coffee-400">
              {isAm ? 'ምንም አልተገኘም' : 'No products found'}
            </div>
          ) : (
            filteredProducts.map(p => {
              const checked = selected.includes(p.id)

              return (
                <div
                  key={p.id}
                  onClick={() => toggleProductSelection(p.id)}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-cream-50"
                >
                  <div className="flex items-center gap-2">
                    {checked ? (
                      <CheckSquare className="w-5 h-5 text-berbere-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}

                    <span className="text-sm font-bold">
                      {isAm ? p.name_am || p.name : p.name}
                    </span>
                  </div>

                  {checked && (
                    <span className="text-[10px] font-black text-green-600">
                      ✓ selected
                    </span>
                  )}
                </div>
              )
            })
          )}

        </div>

        {/* SUBMIT */}
        <button
          disabled={loading}
          className="w-full h-14 bg-coffee-900 text-white rounded-xl font-black flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isAm ? 'አስቀምጥ' : 'Save BONO'}
        </button>

      </form>
    </div>
  )
}
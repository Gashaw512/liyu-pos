// src/app/[locale]/(app)/management/products/[id]/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Save,
  Edit3,
  Coins,
  User
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'
import { getProductById, updateProduct } from '@/queries/useProductsQuery'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()

  const id = String(params?.id ?? '')
  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [categories, setCategories] = useState<any[]>([])
  const [priceGroups, setPriceGroups] = useState<any[]>([])

  const [priceType, setPriceType] = useState<'group' | 'fixed'>('fixed')

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    category_id: '',
    price: '',
    price_group_id: '',
    image_url: '',
    is_active: true
  })

  /* ───────────────────────── LOAD DATA ───────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) {
        router.replace(`/${locale}/login`)
        return
      }

      const [product, catsRes, groupsRes] = await Promise.all([
        getProductById(id),

        supabase
          .from('categories')
          .select('id, name, name_am')
          .eq('business_id', businessId)
          .eq('is_active', true),

        supabase
          .from('price_groups')
          .select('id, name, name_am, amount')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .eq('is_active', true)
      ])

      setCategories(catsRes.data || [])
      setPriceGroups(groupsRes.data || [])

      if (product) {
        setPriceType(product.price_type ?? 'fixed')

        setForm({
          name: product.name ?? '',
          name_am: product.name_am ?? '',
          category_id: product.category_id ?? '',
          price: String(product.retail_price ?? 0),
          price_group_id: product.price_group_id ?? '',
          image_url: product.image_url ?? '',
          is_active: product.is_active ?? true
        })
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, id, router, locale])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ───────────────────────── UPDATE ───────────────────────── */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (saving) return

    setSaving(true)

    try {
      const businessId = await getBusinessId()
      if (!businessId) return

      let retail_price = Number(form.price)

      if (priceType === 'group') {
        const group = priceGroups.find(g => g.id === form.price_group_id)

        if (!group) {
          alert(isAm ? 'ቦኖ ይምረጡ' : 'Select price group')
          return
        }

        retail_price = group.amount
      }

      await updateProduct(id, {
        name: form.name.trim(),
        name_am: form.name_am.trim() || null,
        category_id: form.category_id || null,
        retail_price,
        price_type: priceType,
        price_group_id: priceType === 'group' ? form.price_group_id : null,
        image_url: form.image_url || null,
        is_active: form.is_active
      })

      router.push(`/${locale}/management/products`)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  /* ───────────────────────── UI ───────────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-berbere-500" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto pb-28 space-y-5 px-4 pt-4">

      {/* BACK */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-coffee-500 font-bold text-[12px]"
      >
        <ArrowLeft className="w-4 h-4" />
        {isAm ? 'ተመለስ' : 'Back'}
      </button>

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
          <Edit3 className="w-5 h-5 text-gold-500" />
        </div>

        <h1 className="font-black text-lg">
          {isAm ? 'ምርት ማስተካከያ' : 'Edit Product'}
        </h1>
      </div>

      {/* FORM */}
      <form onSubmit={handleUpdate} className="space-y-4">

        <input
          value={form.name}
          className="w-full h-[52px] px-4 border rounded-xl"
          placeholder="English name"
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <input
          value={form.name_am}
          className="w-full h-[52px] px-4 border rounded-xl"
          placeholder="Amharic name"
          onChange={e => setForm({ ...form, name_am: e.target.value })}
        />

        {/* CATEGORY */}
        <select
          value={form.category_id}
          className="w-full h-[52px] px-4 border rounded-xl"
          onChange={e => setForm({ ...form, category_id: e.target.value })}
        >
          <option value="">
            {isAm ? 'ምድብ ይምረጡ' : 'Select category'}
          </option>

          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* PRICE TYPE */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPriceType('group')}
            className={`flex-1 p-3 border rounded-xl ${
              priceType === 'group' ? 'bg-green-100' : ''
            }`}
          >
            <Coins className="w-4 h-4" />
            Group
          </button>

          <button
            type="button"
            onClick={() => setPriceType('fixed')}
            className={`flex-1 p-3 border rounded-xl ${
              priceType === 'fixed' ? 'bg-blue-100' : ''
            }`}
          >
            <User className="w-4 h-4" />
            Fixed
          </button>
        </div>

        {/* PRICE INPUT */}
        {priceType === 'fixed' ? (
          <input
            type="number"
            value={form.price}
            className="w-full h-[52px] px-4 border rounded-xl"
            onChange={e => setForm({ ...form, price: e.target.value })}
          />
        ) : (
          <select
            value={form.price_group_id}
            className="w-full h-[52px] px-4 border rounded-xl"
            onChange={e => setForm({ ...form, price_group_id: e.target.value })}
          >
            <option value="">
              {isAm ? 'ቦኖ ይምረጡ' : 'Select group'}
            </option>

            {priceGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} - {g.amount} ETB
              </option>
            ))}
          </select>
        )}

        {/* IMAGE */}
        <input
          value={form.image_url}
          className="w-full h-[52px] px-4 border rounded-xl"
          placeholder="Image URL"
          onChange={e => setForm({ ...form, image_url: e.target.value })}
        />

        {/* ACTIVE */}
        <label className="flex items-center justify-between p-3 border rounded-xl">
          <span>{isAm ? 'ንቁ ነው?' : 'Active'}</span>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })}
          />
        </label>

        {/* SAVE */}
        <button
          disabled={saving}
          className="w-full h-[60px] bg-berbere-500 text-white rounded-xl font-black flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isAm ? 'አዘምን' : 'Update'}
        </button>

      </form>
    </div>
  )
}
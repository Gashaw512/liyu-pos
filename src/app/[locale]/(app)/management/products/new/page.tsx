'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Save,
  Package,
  Coins,
  User,
  Image as ImageIcon
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { createProduct } from '@/queries/useProductsQuery'
import { getBusinessId } from '@/lib/auth/getBusinessId'

type PriceType = 'group' | 'fixed'

export default function NewProductPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  const [categories, setCategories] = useState<any[]>([])
  const [priceGroups, setPriceGroups] = useState<any[]>([])

  const [priceType, setPriceType] = useState<PriceType>('group')

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    category_id: '',
    price: '',
    price_group_id: '',
    image_url: ''
  })

  /* ───────────────────────── LOAD DATA ───────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setDataLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) return

      const [catsRes, groupsRes] = await Promise.all([
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
      ])

      if (catsRes.error) throw catsRes.error
      if (groupsRes.error) throw groupsRes.error

      setCategories(catsRes.data || [])
      setPriceGroups(groupsRes.data || [])
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ───────────────────────── derived ───────────────────────── */
  const selectedGroup = useMemo(() => {
    return priceGroups.find(g => g.id === form.price_group_id)
  }, [form.price_group_id, priceGroups])

  /* ───────────────────────── SUBMIT ───────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        alert(isAm ? 'Business not found' : 'Missing business session')
        router.replace(`/${locale}/login`)
        return
      }

      if (!form.category_id) {
        alert(isAm ? 'ምድብ ይምረጡ' : 'Select category')
        return
      }

      let retail_price = 0

      if (priceType === 'fixed') {
        retail_price = Number(form.price)

        if (!retail_price || retail_price <= 0) {
          alert(isAm ? 'ትክክለኛ ዋጋ ያስገቡ' : 'Enter valid price')
          return
        }
      }

      if (priceType === 'group') {
        if (!selectedGroup) {
          alert(isAm ? 'ቦኖ ይምረጡ' : 'Select price group')
          return
        }
        retail_price = selectedGroup.amount
      }

      const { error } = await createProduct({
        business_id: businessId,
        category_id: form.category_id,
        name: form.name.trim(),
        name_am: form.name_am.trim(),
        retail_price,
        price_type: priceType,
        price_group_id: priceType === 'group' ? form.price_group_id : null,
        image_url: form.image_url || null
      })

      if (error) throw error

      router.push(`/${locale}/management/products`)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  /* ───────────────────────── UI ───────────────────────── */
  return (
    <div className="max-w-md mx-auto pb-28 space-y-6 px-4 pt-4">

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
        <div className="w-10 h-10 rounded-xl bg-berbere-50 flex items-center justify-center">
          <Package className="w-5 h-5 text-berbere-500" />
        </div>

        <div>
          <h1 className="font-black text-lg">
            {isAm ? 'አዲስ ምርት' : 'New Product'}
          </h1>
          <p className="text-[11px] text-coffee-400 font-bold uppercase">
            {isAm ? 'የ BONO ወይም ቀጥታ ዋጋ' : 'Bono or Fixed Pricing'}
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* NAMES */}
        <input
          required
          placeholder={isAm ? 'አማርኛ ስም' : 'Amharic name'}
          className="w-full h-[52px] px-4 rounded-xl border"
          onChange={e =>
            setForm(prev => ({ ...prev, name_am: e.target.value }))
          }
        />

        <input
          required
          placeholder="English name"
          className="w-full h-[52px] px-4 rounded-xl border"
          onChange={e =>
            setForm(prev => ({ ...prev, name: e.target.value }))
          }
        />

        {/* CATEGORY */}
        <select
          required
          disabled={dataLoading}
          className="w-full h-[52px] px-4 rounded-xl border"
          onChange={e =>
            setForm(prev => ({ ...prev, category_id: e.target.value }))
          }
        >
          <option value="">
            {dataLoading ? 'Loading...' : isAm ? 'ምድብ ይምረጡ' : 'Select category'}
          </option>

          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* PRICE TYPE */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPriceType('group')}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm ${
              priceType === 'group' ? 'bg-berbere-50 text-berbere-700' : ''
            }`}
          >
            <Coins className="w-4 h-4" />
            {isAm ? 'ቦኖ' : 'Group'}
          </button>

          <button
            type="button"
            onClick={() => setPriceType('fixed')}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm ${
              priceType === 'fixed' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <User className="w-4 h-4" />
            {isAm ? 'ቀጥታ' : 'Fixed'}
          </button>
        </div>

        {/* CONDITIONAL PRICE */}
        {priceType === 'fixed' ? (
          <input
            type="number"
            placeholder="Price"
            className="w-full h-[52px] px-4 border rounded-xl font-bold"
            onChange={e =>
              setForm(prev => ({ ...prev, price: e.target.value }))
            }
          />
        ) : (
          <select
            required
            disabled={dataLoading}
            className="w-full h-[52px] px-4 border rounded-xl"
            onChange={e =>
              setForm(prev => ({ ...prev, price_group_id: e.target.value }))
            }
          >
            <option value="">
              {isAm ? 'ቦኖ ይምረጡ' : 'Select group'}
            </option>

            {priceGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.amount} ETB
              </option>
            ))}
          </select>
        )}

        {/* IMAGE */}
        <input
          placeholder={isAm ? 'የምስል URL' : 'Image URL'}
          className="w-full h-[52px] px-4 border rounded-xl"
          onChange={e =>
            setForm(prev => ({ ...prev, image_url: e.target.value }))
          }
        />

        {/* GROUP INFO PREVIEW */}
        {priceType === 'group' && selectedGroup && (
          <div className="text-xs bg-cream-50 p-3 rounded-xl font-bold text-coffee-600">
            {isAm ? 'ተመርጧል:' : 'Selected:'} {selectedGroup.name} — {selectedGroup.amount} ETB
          </div>
        )}

        {/* SUBMIT */}
        <button
          disabled={loading}
          className="w-full h-[60px] bg-berbere-500 text-white rounded-xl font-black flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isAm ? 'አስቀምጥ' : 'Save'}
        </button>
      </form>
    </div>
  )
}
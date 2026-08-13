// src/app/[locale]/(app)/management/price-groups/[id]/edit/page.tsx

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'

import {
  ArrowLeft,
  Loader2,
  Save,
  CheckSquare,
  Square,
  Layers,
  AlertTriangle,
  Coins
} from 'lucide-react'

// Strongly-typed DTO for products queried in price group editing
interface ProductRow {
  id: string
  name: string
  name_am: string | null
  price_group_id: string | null
}

export default function EditPriceGroupPage() {
  const router = useRouter()
  const params = useParams()

  const id = String(params?.id ?? '')
  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState<ProductRow[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    nameAm: '',
    amount: ''
  })

  /* ───────────────────── LOAD DATA ───────────────────── */
  const loadData = useCallback(async () => {
    if (!id) return

    setLoading(true)

    try {
      const businessId = await getBusinessId()
      if (!businessId) throw new Error('Missing business')

      // 1. Load group
      const { data: group, error: groupError } = await supabase
        .from('price_groups')
        .select('*')
        .eq('id', id)
        .eq('business_id', businessId)
        .single()

      if (groupError) throw groupError

      setFormData({
        name: group.name ?? '',
        nameAm: group.name_am ?? '',
        amount: String(group.amount ?? 0)
      })

      // 2. Load products (with conflict visibility)
      const { data: prods, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_am, price_group_id')
        .eq('business_id', businessId)

      if (prodError) throw prodError

      // Type-cast the raw query result
      const productsData = (prods as unknown as ProductRow[]) || []
      setProducts(productsData)

      // 3. Preselect linked products
      const linked = productsData
        .filter((p: ProductRow) => p.price_group_id === id)
        .map((p: ProductRow) => p.id)

      setSelectedProductIds(linked)

    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ───────────────────── TOGGLE ───────────────────── */
  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  /* ───────────────────── MVP INTELLIGENCE ───────────────────── */

  const selectedProducts = useMemo(
    () => products.filter((p: ProductRow) => selectedProductIds.includes(p.id)),
    [products, selectedProductIds]
  )

  const totalProducts = selectedProducts.length

  const estimatedImpact = useMemo(() => {
    const amount = Number(formData.amount || 0)
    return totalProducts * amount
  }, [formData.amount, totalProducts])

  const conflicts = useMemo(() => {
    return products.filter(
      (p: ProductRow) =>
        selectedProductIds.includes(p.id) &&
        p.price_group_id &&
        p.price_group_id !== id
    )
  }, [products, selectedProductIds, id])

  /* ───────────────────── UPDATE ───────────────────── */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const businessId = await getBusinessId()
      if (!businessId) throw new Error('Missing business')

      const newAmount = Number(formData.amount)

      // 1. Update group
      const { error: groupError } = await supabase
        .from('price_groups')
        .update({
          name: formData.name,
          name_am: formData.nameAm,
          amount: newAmount
        })
        .eq('id', id)
        .eq('business_id', businessId)

      if (groupError) throw groupError

      // 2. Unlink removed products
      await supabase
        .from('products')
        .update({
          price_group_id: null,
          price_type: 'fixed'
        })
        .eq('price_group_id', id)

      // 3. Link selected products
      if (selectedProductIds.length > 0) {
        const { error: linkError } = await supabase
          .from('products')
          .update({
            price_group_id: id,
            price_type: 'group',
            retail_price: newAmount
          })
          .in('id', selectedProductIds)

        if (linkError) throw linkError
      }

      router.push(`/${locale}/management/price-groups`)
    } catch (err) {
      console.error(err)
      alert(isAm ? 'ስህተት ተፈጥሯል' : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  /* ───────────────────── UI STATES ───────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-berbere-500" />
      </div>
    )
  }

  /* ───────────────────── UI ───────────────────── */
  return (
    <div className="max-w-md mx-auto pb-24 space-y-5 px-4 bg-cream-100 min-h-screen pt-4">

      {/* HEADER */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-coffee-400 font-bold text-[11px] uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        {isAm ? 'ተመለስ' : 'Back'}
      </button>

      {/* BONO HEADER CARD */}
      <div className="bg-gradient-to-r from-berbere-500 to-red-500 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>

          <div>
            <h2 className="font-black text-lg">
              {isAm ? 'ቦኖ ማስተካከያ' : 'Edit BONO Group'}
            </h2>
            <p className="text-xs opacity-90">
              {totalProducts} products • {Number(formData.amount || 0)} ETB
            </p>
          </div>
        </div>
      </div>

      {/* INTELLIGENCE PANEL */}
      <div className="bg-white rounded-2xl p-4 border border-cream-200 space-y-2">

        <div className="flex items-center gap-2 text-xs font-black text-coffee-500 uppercase">
          <Layers className="w-4 h-4" />
          BONO Impact Preview
        </div>

        <div className="text-xs font-bold text-coffee-600">
          Estimated value:{" "}
          <span className="text-berbere-600 font-black">
            {estimatedImpact.toFixed(2)} ETB
          </span>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-red-50 text-red-700 p-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {conflicts.length} conflict(s) detected in other BONO groups
          </div>
        )}

      </div>

      {/* FORM */}
      <form onSubmit={handleUpdate} className="space-y-4">

        <input
          value={formData.nameAm}
          className="w-full h-[52px] px-4 rounded-xl border"
          placeholder={isAm ? 'አማርኛ ስም' : 'Amharic name'}
          onChange={e =>
            setFormData({ ...formData, nameAm: e.target.value })
          }
        />

        <input
          value={formData.name}
          className="w-full h-[52px] px-4 rounded-xl border"
          placeholder="English name"
          onChange={e =>
            setFormData({ ...formData, name: e.target.value })
          }
        />

        <input
          type="number"
          value={formData.amount}
          className="w-full h-[52px] px-4 rounded-xl border font-bold"
          placeholder="Amount"
          onChange={e =>
            setFormData({ ...formData, amount: e.target.value })
          }
        />

        {/* PRODUCTS */}
        <div className="border rounded-xl bg-white max-h-[260px] overflow-auto divide-y">

          {products.map((p: ProductRow) => {
            const checked = selectedProductIds.includes(p.id)
            const conflict = p.price_group_id && p.price_group_id !== id

            return (
              <div
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer ${conflict ? 'bg-yellow-50' : ''
                  }`}
              >
                {checked ? (
                  <CheckSquare className="w-5 h-5 text-berbere-500" />
                ) : (
                  <Square className="w-5 h-5 text-gray-300" />
                )}

                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {p.name}
                  </span>

                  {conflict && (
                    <span className="text-[10px] text-yellow-600 font-bold">
                      Already in another BONO group
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* SAVE */}
        <button
          disabled={saving}
          className="w-full h-[56px] bg-berbere-500 text-white rounded-xl font-black flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isAm ? 'አዘምን' : 'Update'}
        </button>

      </form>
    </div>
  )
}
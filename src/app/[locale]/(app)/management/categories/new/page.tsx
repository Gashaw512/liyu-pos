// src/app/[locale]/management/categories/new/page.tsx

'use client'

import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Save,
  Tag,
  Palette,
  Sparkles,
  CheckCircle2
} from 'lucide-react'

import { createCategory } from '@/queries/useCategoryQueries'
import { getBusinessId } from '@/lib/auth/getBusinessId'

const ICONS = ['📦', '☕', '🍔', '🥤', '🍕', '🍰', '🥗', '🍩', '🍺', '🛒']

const COLORS = [
  '#8B2635', // berbere
  '#1F2937', // coffee
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#EF4444', // red
  '#A855F7', // purple
  '#F97316'  // orange
]

export default function NewCategoryPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    icon: '📦',
    color: '#8B2635'
  })

  const isValid = useMemo(
    () => form.name.trim().length > 0 && form.name_am.trim().length > 0,
    [form]
  )

  const previewStyle = {
    borderColor: `${form.color}40`,
    backgroundColor: `${form.color}08`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!isValid) return

    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId) return

      await createCategory({
        business_id: businessId,
        name: form.name.trim(),
        name_am: form.name_am.trim(),
        icon: form.icon,
        color: form.color,
        sort_order: 0
      })

      router.push(`/${locale}/management/categories`)
    } catch (err) {
      console.error(err)
      alert(isAm ? 'ስህተት ተፈጥሯል' : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-cream-50 px-4 pb-24 pt-4 space-y-5">

      {/* TOP NAV */}
      <div className="flex items-center justify-between">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black text-coffee-500"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <div className="text-[10px] font-black uppercase text-berbere-600 bg-berbere-50 px-3 py-1 rounded-full">
          {isAm ? 'አዲስ ምድብ' : 'New Category'}
        </div>
      </div>

      {/* HERO HEADER */}
      <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3">

        <div className="flex items-start gap-3">

          <div className="w-12 h-12 rounded-2xl bg-berbere-50 flex items-center justify-center">
            <Tag className="w-6 h-6 text-berbere-500" />
          </div>

          <div>
            <h1 className="text-lg font-black text-coffee-900">
              {isAm ? 'አዲስ ምድብ ፍጠር' : 'Create Category'}
            </h1>

            <p className="text-[11px] font-bold text-gray-400 uppercase">
              {isAm
                ? 'ምርቶችን በቀላሉ ለመደርደር'
                : 'Organize products easily'}
            </p>
          </div>

        </div>

        {/* SIMPLE EXPLANATION */}
        <div className="bg-cream-50 border border-cream-200 rounded-2xl p-3">
          <p className="text-xs font-bold text-coffee-600 leading-relaxed">
            {isAm
              ? 'ምድቦች ምርቶችን ለማደራጀት ይረዳሉ (ምሳሌ: መጠጦች, ምግቦች)'
              : 'Categories help organize your products (Drinks, Food, Coffee etc.)'}
          </p>
        </div>

        {/* PRO TIP */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black text-gray-400 uppercase">
            💡 {isAm ? 'ጠቃሚ ምክር' : 'Pro Tip'}
          </div>

          <div className="text-[10px] font-black text-berbere-600 bg-berbere-50 px-2 py-1 rounded-full">
            {isAm ? 'ቀላል ይሁን' : 'Keep simple'}
          </div>
        </div>

      </div>

      {/* LIVE PREVIEW */}
      <div className="space-y-2">

        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          {isAm ? 'ቅድመ እይታ' : 'Live Preview'}
        </label>

        <div className="bg-white border rounded-3xl p-5 shadow-sm" style={previewStyle}>

          <div className="flex items-center gap-4">

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-sm"
              style={{ backgroundColor: form.color }}
            >
              {form.icon}
            </div>

            <div>
              <p className="text-lg font-black text-coffee-900">
                {form.name || 'Category Name'}
              </p>
              <p className="text-sm text-gray-500 font-bold">
                {form.name_am || 'የምድብ ስም'}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* NAME EN */}
        <div className="bg-white border rounded-2xl p-4 space-y-2">
          <label className="text-[11px] font-black text-gray-500 uppercase">
            {isAm ? 'ስም (English)' : 'Name (English)'}
          </label>

          <input
            value={form.name}
            onChange={(e) =>
              setForm(prev => ({ ...prev, name: e.target.value }))
            }
            className="w-full h-12 px-4 rounded-xl bg-gray-50 border font-bold"
            placeholder="e.g. Drinks"
          />
        </div>

        {/* NAME AM */}
        <div className="bg-white border rounded-2xl p-4 space-y-2">
          <label className="text-[11px] font-black text-gray-500 uppercase">
            {isAm ? 'ስም (አማርኛ)' : 'Name (Amharic)'}
          </label>

          <input
            value={form.name_am}
            onChange={(e) =>
              setForm(prev => ({ ...prev, name_am: e.target.value }))
            }
            className="w-full h-12 px-4 rounded-xl bg-gray-50 border font-bold"
            placeholder="ምሳሌ: መጠጦች"
          />
        </div>

        {/* ICONS */}
        <div className="bg-white border rounded-2xl p-4 space-y-2">

          <p className="text-[11px] font-black text-gray-500 uppercase">
            {isAm ? 'አይኮን' : 'Icon'}
          </p>

          <div className="grid grid-cols-5 gap-2">
            {ICONS.map(icon => (
              <button
                type="button"
                key={icon}
                onClick={() => setForm(prev => ({ ...prev, icon }))}
                className={`h-12 rounded-xl text-xl border flex items-center justify-center ${
                  form.icon === icon
                    ? 'border-berbere-500 bg-berbere-50'
                    : 'bg-gray-50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

        </div>

        {/* COLORS */}
        <div className="bg-white border rounded-2xl p-4 space-y-2">

          <p className="text-[11px] font-black text-gray-500 uppercase">
            {isAm ? 'ቀለም' : 'Color'}
          </p>

          <div className="flex flex-wrap gap-3">
            {COLORS.map(color => (
              <button
                type="button"
                key={color}
                onClick={() => setForm(prev => ({ ...prev, color }))}
                className={`w-10 h-10 rounded-xl ${
                  form.color === color ? 'ring-2 ring-coffee-900 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

        </div>

        {/* SUBMIT */}
        <button
          disabled={!isValid || loading}
          className="w-full h-14 rounded-2xl bg-berbere-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isAm ? 'አስቀምጥ' : 'Save Category'}
        </button>

      </form>

    </div>
  )
}
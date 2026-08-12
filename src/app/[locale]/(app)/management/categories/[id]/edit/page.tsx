// src/app/[locale]/management/categories/[id]/edit/page.tsx
// src/app/[locale]/management/categories/[id]/edit/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Loader2,
  Save,
  Tag,
  Sparkles,
  HelpCircle
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'
  const id = String(params?.id ?? '')

  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    name_am: ''
  })

  /* ───────────────── LOAD ───────────────── */
  const loadCategory = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()
      if (!businessId || !id) return

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_am')
        .eq('id', id)
        .eq('business_id', businessId)
        .single()

      if (error) throw error

      setForm({
        name: data?.name || '',
        name_am: data?.name_am || ''
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCategory()
  }, [loadCategory])

  /* ───────────────── SAVE ───────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    try {
      setSaving(true)

      const businessId = await getBusinessId()
      if (!businessId) return

      const { error } = await supabase
        .from('categories')
        .update({
          name: form.name.trim(),
          name_am: form.name_am.trim()
        })
        .eq('id', id)
        .eq('business_id', businessId)

      if (error) throw error

      router.push(`/${locale}/management/categories`)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(isAm ? 'ማስተካከያ አልተሳካም' : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const isValid = useMemo(
    () => form.name.trim().length > 0 && form.name_am.trim().length > 0,
    [form]
  )

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
    <div className="max-w-md mx-auto pb-24 space-y-6 px-4 pt-4">

      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-coffee-400 font-bold text-[11px] uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        {isAm ? 'ተመለስ' : 'Back'}
      </button>

      {/* HEADER (IMPROVED) */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">

        <div className="flex items-start gap-3">

          <div className="w-11 h-11 rounded-xl bg-berbere-50 flex items-center justify-center">
            <Tag className="w-6 h-6 text-berbere-500" />
          </div>

          <div>
            <h1 className="text-lg font-black text-coffee-900">
              {isAm ? 'ምድብ አርም' : 'Edit Category'}
            </h1>

            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {isAm
                ? 'ምድብ ስም ያሻሽሉ እና አዘምኑ'
                : 'Update your category information'}
            </p>
          </div>
        </div>

        {/* SIMPLE EXPLANATION */}
        <div className="bg-cream-50 border border-cream-200 rounded-xl p-3">
          <p className="text-[10px] font-black text-coffee-700 uppercase flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            {isAm ? 'ምን ያደርጋል?' : 'What this does'}
          </p>

          <p className="text-xs text-coffee-600 font-bold mt-1 leading-relaxed">
            {isAm
              ? 'ምድብ ስም በመቀየር ሁሉንም የተያያዙ ምርቶች በቀጥታ ይቀየራሉ።'
              : 'Updating this category will automatically reflect across all linked products.'}
          </p>
        </div>
      </div>

      {/* LIVE PREVIEW (SMART UX) */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">

        <div className="flex items-center gap-2 mb-3 text-[11px] font-black text-gray-400 uppercase">
          <Sparkles className="w-3 h-3 text-amber-500" />
          {isAm ? 'ቅድመ እይታ' : 'Live Preview'}
        </div>

        <div className="flex items-center gap-3">

          <div className="w-12 h-12 rounded-xl bg-berbere-500 flex items-center justify-center text-white font-black">
            {form.name?.charAt(0) || 'C'}
          </div>

          <div>
            <p className="font-black text-coffee-900">
              {form.name || 'Category Name'}
            </p>
            <p className="text-xs text-gray-400 font-bold">
              {form.name_am || 'የምድብ ስም'}
            </p>
          </div>

        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSave} className="space-y-4">

        {/* AM NAME */}
        <div>
          <label className="text-[11px] font-black text-gray-500 uppercase">
            🇪🇹 {isAm ? 'አማርኛ ስም' : 'Amharic Name'}
          </label>

          <input
            value={form.name_am}
            placeholder="ምሳሌ: መጠጦች"
            className="w-full h-[52px] px-4 rounded-xl border bg-gray-50 font-bold text-sm focus:bg-white focus:border-berbere-500 outline-none"
            onChange={(e) =>
              setForm(prev => ({ ...prev, name_am: e.target.value }))
            }
          />
        </div>

        {/* EN NAME */}
        <div>
          <label className="text-[11px] font-black text-gray-500 uppercase">
            🇺🇸 {isAm ? 'እንግሊዝኛ ስም' : 'English Name'}
          </label>

          <input
            value={form.name}
            placeholder="e.g. Drinks"
            className="w-full h-[52px] px-4 rounded-xl border bg-gray-50 font-bold text-sm focus:bg-white focus:border-berbere-500 outline-none"
            onChange={(e) =>
              setForm(prev => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        {/* SAVE BUTTON */}
        <button
          disabled={saving || !isValid}
          className="w-full h-[56px] bg-berbere-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isAm ? 'አስቀምጥ' : 'Save Changes'}
        </button>

      </form>
    </div>
  )
}
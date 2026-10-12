'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Save,
  Tag,
  Palette,
} from 'lucide-react'

import { createCategory } from '@/queries/useCategoryQueries'
import { getBusinessId } from '@/lib/auth/getBusinessId'
import { PreparationStationSelect, type PreparationStation } from '@/components/management/PreparationStationSelect'

const ICONS = [
  '📦',
  '☕',
  '🍔',
  '🥤',
  '🍕',
  '🍰',
  '🥗',
  '🍩',
  '🍺',
  '🛒',
]

const COLORS = [
  '#8B2635', // berbere
  '#1B2B50', // Liyu navy
  '#E2A03F', // gold
  '#10B981', // green
  '#3B82F6', // blue
  '#EF4444', // red
  '#A855F7', // purple
  '#F97316', // orange
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
    color: '#8B2635',
    preparation_station: 'kitchen' as PreparationStation,
  })

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.name_am.trim().length > 0
    )
  }, [form.name, form.name_am])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loading || !isValid) return

    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error('Business ID not found')
      }

      await createCategory({
        business_id: businessId,
        name: form.name.trim(),
        name_am: form.name_am.trim(),
        preparation_station: form.preparation_station,
        icon: form.icon,
        color: form.color,
        sort_order: 0,
      })

      router.replace(`/${locale}/management/categories`)
    } catch (error) {
      console.error('[CATEGORIES] Create failed:', error)

      alert(
        isAm
          ? 'ምድቡን መፍጠር አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
          : 'The category could not be created. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream-50 px-4 pb-24 pt-4">

      {/* TOP BAR */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-coffee-500"
        >
          <ArrowLeft className="h-4 w-4" />

          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <span className="rounded-full bg-berbere-50 px-3 py-1 text-[10px] font-black uppercase text-berbere-600">
          {isAm ? 'አዲስ ምድብ' : 'New Category'}
        </span>
      </div>

      {/* HEADER */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-50">
            <Tag className="h-5 w-5 text-berbere-600" />
          </div>

          <div>
            <h1 className="text-xl font-black text-coffee-900">
              {isAm ? 'አዲስ ምድብ ፍጠር' : 'Create Category'}
            </h1>

            <p className="mt-0.5 text-[11px] font-medium text-gray-400">
              {isAm
                ? 'ምርቶችዎን በምድብ ያደራጁ'
                : 'Organize your products into categories'}
            </p>
          </div>
        </div>
      </div>

      {/* LIVE PREVIEW */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase text-gray-400">
            {isAm ? 'ቅድመ እይታ' : 'Preview'}
          </p>

          <Palette className="h-3.5 w-3.5 text-gray-400" />
        </div>

        <div
          className="rounded-2xl border bg-white p-4 shadow-sm"
          style={{
            borderColor: `${form.color}40`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
              style={{
                backgroundColor: form.color,
              }}
            >
              {form.icon}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black text-coffee-900">
                {form.name.trim() || (isAm ? 'የምድብ ስም' : 'Category Name')}
              </p>

              <p className="truncate text-xs font-medium text-gray-400">
                {form.name_am.trim() || 'የምድብ ስም'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">

        <PreparationStationSelect
          value={form.preparation_station}
          locale={locale}
          onChange={(preparation_station) => setForm((previous) => ({ ...previous, preparation_station: preparation_station as PreparationStation }))}
        />

        {/* ENGLISH NAME */}
        <div className="rounded-2xl border bg-white p-4">
          <label
            htmlFor="category-name"
            className="mb-2 block text-[10px] font-black uppercase text-gray-500"
          >
            {isAm ? 'ስም (English)' : 'Name (English)'}
          </label>

          <input
            id="category-name"
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="e.g. Drinks"
            autoComplete="off"
            maxLength={100}
            className="h-12 w-full rounded-xl border bg-gray-50 px-4 text-sm font-bold text-coffee-900 outline-none transition placeholder:text-gray-300 focus:border-berbere-500 focus:bg-white focus:ring-2 focus:ring-berbere-100"
          />

          <p className="mt-1.5 text-[10px] font-medium text-gray-400">
            {isAm
              ? 'በምርቶች ላይ የሚታየው የእንግሊዝኛ ስም'
              : 'The English name shown for this category'}
          </p>
        </div>

        {/* AMHARIC NAME */}
        <div className="rounded-2xl border bg-white p-4">
          <label
            htmlFor="category-name-am"
            className="mb-2 block text-[10px] font-black uppercase text-gray-500"
          >
            {isAm ? 'ስም (አማርኛ)' : 'Name (Amharic)'}
          </label>

          <input
            id="category-name-am"
            type="text"
            value={form.name_am}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                name_am: event.target.value,
              }))
            }
            placeholder="ምሳሌ፡ መጠጦች"
            autoComplete="off"
            maxLength={100}
            className="h-12 w-full rounded-xl border bg-gray-50 px-4 text-sm font-bold text-coffee-900 outline-none transition placeholder:text-gray-300 focus:border-berbere-500 focus:bg-white focus:ring-2 focus:ring-berbere-100"
          />

          <p className="mt-1.5 text-[10px] font-medium text-gray-400">
            {isAm
              ? 'በአማርኛ ቋንቋ የሚታየው ስም'
              : 'The Amharic name shown when Amharic is selected'}
          </p>
        </div>

        {/* ICON */}
        <div className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-[10px] font-black uppercase text-gray-500">
            {isAm ? 'አይኮን' : 'Icon'}
          </p>

          <div className="grid grid-cols-5 gap-2">
            {ICONS.map((icon) => {
              const selected = form.icon === icon

              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      icon,
                    }))
                  }
                  aria-label={`${isAm ? 'አይኮን' : 'Icon'} ${icon}`}
                  aria-pressed={selected}
                  className={`flex h-12 items-center justify-center rounded-xl border text-xl transition ${
                    selected
                      ? 'border-berbere-500 bg-berbere-50 ring-2 ring-berbere-100'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        </div>

        {/* COLOR */}
        <div className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-[10px] font-black uppercase text-gray-500">
            {isAm ? 'የምድብ ቀለም' : 'Category Color'}
          </p>

          <div className="flex flex-wrap gap-3">
            {COLORS.map((color) => {
              const selected = form.color === color

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      color,
                    }))
                  }
                  aria-label={`${isAm ? 'ቀለም' : 'Color'} ${color}`}
                  aria-pressed={selected}
                  className={`h-10 w-10 rounded-xl transition ${
                    selected
                      ? 'scale-110 ring-2 ring-coffee-900 ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: color,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* SAVE */}
        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-berbere-600 text-sm font-black text-white shadow-sm transition hover:bg-berbere-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}

          {loading
            ? isAm
              ? 'በማስቀመጥ ላይ...'
              : 'Saving...'
            : isAm
              ? 'ምድብ አስቀምጥ'
              : 'Save Category'}
        </button>
      </form>
    </div>
  )
}

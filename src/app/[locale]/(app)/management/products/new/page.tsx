// src/app/[locale]/(app)/management/products/new/page.tsx

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Barcode,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Image as ImageIcon,
  Info,
  Loader2,
  Package,
  Save,
  Scale,
  Settings2,
  Tag,
  X,
} from 'lucide-react'

import createClient from '@/lib/supabase/client'

import { createProduct } from '@/queries/useProductsQuery'
import { getBusinessId } from '@/lib/auth/getBusinessId'

import type { UnitOfMeasure } from '@/types/enum'

/* ============================================================
   TYPES
============================================================ */

type PriceType = 'group' | 'fixed'

interface CategoryOption {
  id: string
  name: string
  name_am: string | null
}

interface PriceGroupOption {
  id: string
  name: string
  name_am: string | null
  amount: number
}

/* ============================================================
   UNIT OPTIONS
============================================================ */

const UNIT_OPTIONS: {
  value: UnitOfMeasure
  en: string
  am: string
}[] = [
  {
    value: 'piece',
    en: 'Piece',
    am: 'ቁራጭ',
  },
  {
    value: 'kg',
    en: 'Kilogram',
    am: 'ኪሎ ግራም',
  },
  {
    value: 'liter',
    en: 'Liter',
    am: 'ሊትር',
  },
  {
    value: 'box',
    en: 'Box',
    am: 'ሳጥን',
  },
  {
    value: 'pack',
    en: 'Pack',
    am: 'ፓኬት',
  },
  {
    value: 'set',
    en: 'Set',
    am: 'ስብስብ',
  },
  {
    value: 'crate',
    en: 'Crate',
    am: 'ሳጥን / ክሬት',
  },
]

/* ============================================================
   PAGE
============================================================ */

export default function NewProductPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const supabase = createClient()

  /* ============================================================
     STATE
  ============================================================ */

  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [priceGroups, setPriceGroups] = useState<PriceGroupOption[]>([])

  const [error, setError] = useState<string | null>(null)

  const [priceType, setPriceType] = useState<PriceType>('fixed')

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    description: '',

    category_id: '',

    barcode: '',
    sku: '',

    unit_type: 'piece' as UnitOfMeasure,
    units_per_crate: '',

    cost_price: '',
    retail_price: '',

    price_group_id: '',

    tax_inclusive: true,
    is_sold_by_weight: false,
    track_inventory: true,

    low_stock_alert: '',

    image_url: '',
  })

  /* ============================================================
     LOAD CATEGORIES + PRICE GROUPS
  ============================================================ */

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true)
      setError(null)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error(
          isAm
            ? 'የንግድ መረጃ አልተገኘም'
            : 'Missing business session'
        )
      }

      const [categoriesResult, groupsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, name_am')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name', { ascending: true }),

        supabase
          .from('price_groups')
          .select('id, name, name_am, amount')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .order('name', { ascending: true }),
      ])

      if (categoriesResult.error) {
        throw categoriesResult.error
      }

      if (groupsResult.error) {
        throw groupsResult.error
      }

      setCategories(
        (categoriesResult.data as CategoryOption[]) ?? []
      )

      setPriceGroups(
        (groupsResult.data as PriceGroupOption[]) ?? []
      )
    } catch (err: unknown) {
      console.error('[NewProduct] Load data error:', err)

      setError(
        err instanceof Error
          ? err.message
          : isAm
            ? 'መረጃውን መጫን አልተቻለም'
            : 'Failed to load product options'
      )
    } finally {
      setDataLoading(false)
    }
  }, [isAm, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ============================================================
     DERIVED
  ============================================================ */

  const selectedGroup = useMemo(
    () =>
      priceGroups.find(
        (group) => group.id === form.price_group_id
      ),
    [form.price_group_id, priceGroups]
  )

  const selectedUnit = useMemo(
    () =>
      UNIT_OPTIONS.find(
        (unit) => unit.value === form.unit_type
      ),
    [form.unit_type]
  )

  /* ============================================================
     FIELD HELPER
  ============================================================ */

  const updateField = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  /* ============================================================
     SUBMIT
  ============================================================ */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (loading) return

    try {
      setLoading(true)
      setError(null)

      const businessId = await getBusinessId()

      if (!businessId) {
        router.replace(`/${locale}/login`)
        return
      }

      /* --------------------------------------------------------
         BASIC VALIDATION
      -------------------------------------------------------- */

      const name = form.name.trim()
      const nameAm = form.name_am.trim()

      if (!name) {
        throw new Error(
          isAm ? 'የምርት ስም ያስገቡ' : 'Enter the product name'
        )
      }

      if (!nameAm) {
        throw new Error(
          isAm
            ? 'የአማርኛ ስም ያስገቡ'
            : 'Enter the Amharic product name'
        )
      }

      if (!form.category_id) {
        throw new Error(
          isAm ? 'ምድብ ይምረጡ' : 'Select a category'
        )
      }

      /* --------------------------------------------------------
         PRICE
      -------------------------------------------------------- */

      let retailPrice = 0

      if (priceType === 'fixed') {
        retailPrice = Number(form.retail_price)

        if (!Number.isFinite(retailPrice) || retailPrice <= 0) {
          throw new Error(
            isAm
              ? 'ትክክለኛ የሽያጭ ዋጋ ያስገቡ'
              : 'Enter a valid selling price'
          )
        }
      }

      if (priceType === 'group') {
        if (!selectedGroup) {
          throw new Error(
            isAm
              ? 'የዋጋ ቡድን ይምረጡ'
              : 'Select a price group'
          )
        }

        retailPrice = Number(selectedGroup.amount)
      }

      /* --------------------------------------------------------
         COST
      -------------------------------------------------------- */

      const costPrice = form.cost_price.trim()
        ? Number(form.cost_price)
        : 0

      if (
        !Number.isFinite(costPrice) ||
        costPrice < 0
      ) {
        throw new Error(
          isAm
            ? 'ትክክለኛ የግዢ ዋጋ ያስገቡ'
            : 'Enter a valid cost price'
        )
      }

      /* --------------------------------------------------------
         UNITS PER CRATE
      -------------------------------------------------------- */

      let unitsPerCrate: number | null = null

      if (form.units_per_crate.trim()) {
        unitsPerCrate = Number(form.units_per_crate)

        if (
          !Number.isInteger(unitsPerCrate) ||
          unitsPerCrate <= 0
        ) {
          throw new Error(
            isAm
              ? 'የክሬት ብዛት ትክክለኛ ቁጥር ይሁን'
              : 'Units per crate must be a positive whole number'
          )
        }
      }

      /* --------------------------------------------------------
         LOW STOCK ALERT
      -------------------------------------------------------- */

      let lowStockAlert: number | null = null

      if (form.low_stock_alert.trim()) {
        lowStockAlert = Number(form.low_stock_alert)

        if (
          !Number.isFinite(lowStockAlert) ||
          lowStockAlert < 0
        ) {
          throw new Error(
            isAm
              ? 'የዝቅተኛ ክምችት ማስጠንቀቂያ ትክክል አይደለም'
              : 'Enter a valid low-stock alert level'
          )
        }
      }

      /* --------------------------------------------------------
         CREATE
      -------------------------------------------------------- */

      await createProduct({
        business_id: businessId,

        category_id: form.category_id,

        name,
        name_am: nameAm,
        description: form.description.trim() || null,

        barcode: form.barcode.trim() || null,
        sku: form.sku.trim() || null,

        unit_type: form.unit_type,
        units_per_crate: unitsPerCrate,

        cost_price: costPrice,
        retail_price: retailPrice,

        price_type: priceType,
        price_group_id:
          priceType === 'group'
            ? form.price_group_id
            : null,

        tax_inclusive: form.tax_inclusive,

        is_sold_by_weight: form.is_sold_by_weight,
        track_inventory: form.track_inventory,

        low_stock_alert: lowStockAlert,

        image_url: form.image_url.trim() || null,

        is_active: true,
      })

      router.push(`/${locale}/management/products`)
    } catch (err: unknown) {
      console.error('[NewProduct] Create error:', err)

      const message =
        err instanceof Error
          ? err.message
          : isAm
            ? 'ምርቱን ማስቀመጥ አልተቻለም'
            : 'Failed to create product'

      setError(message)

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } finally {
      setLoading(false)
    }
  }

  /* ============================================================
     LOADING STATE
  ============================================================ */

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-cream-50 px-4 py-12">
        <div className="mx-auto flex min-h-[55vh] max-w-md items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-50">
              <Loader2 className="h-5 w-5 animate-spin text-berbere-600" />
            </div>

            <p className="text-xs font-bold text-coffee-400">
              {isAm
                ? 'የምርት መረጃ በመጫን ላይ...'
                : 'Loading product options...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <div className="min-h-screen bg-cream-50 pb-28">
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-6">

        {/* ======================================================
            TOP BAR
        ====================================================== */}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/products`
              )
            }
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-coffee-500 transition hover:bg-white hover:text-coffee-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAm ? 'ተመለስ' : 'Back'}
          </button>
        </div>

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="mt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-berbere-50">
              <Package className="h-5 w-5 text-berbere-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-coffee-900">
                {isAm ? 'አዲስ ምርት' : 'New product'}
              </h1>

              <p className="mt-0.5 text-xs leading-5 text-coffee-400">
                {isAm
                  ? 'የምርት መረጃ፣ ዋጋ እና የክምችት ቅንብር ያዘጋጁ።'
                  : 'Add the product details, pricing and inventory settings.'}
              </p>
            </div>
          </div>
        </header>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-5 text-red-700">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-red-400 hover:text-red-600"
              aria-label={isAm ? 'ስህተት ዝጋ' : 'Dismiss error'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >

          {/* ====================================================
              1. BASIC INFORMATION
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
            <div className="border-b border-cream-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-900">
                  {isAm ? 'መሰረታዊ መረጃ' : 'Basic information'}
                </h2>
              </div>

              <p className="mt-1 text-[10px] leading-4 text-coffee-400">
                {isAm
                  ? 'ምርቱን ለመለየት የሚያስፈልገው መረጃ።'
                  : 'The information used to identify this product.'}
              </p>
            </div>

            <div className="space-y-4 p-4">

              {/* NAMES */}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm ? 'የእንግሊዝኛ ስም' : 'English name'}
                    <span className="ml-1 text-berbere-500">*</span>
                  </label>

                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      updateField('name', event.target.value)
                    }
                    placeholder="e.g. Coca Cola"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm ? 'የአማርኛ ስም' : 'Amharic name'}
                    <span className="ml-1 text-berbere-500">*</span>
                  </label>

                  <input
                    required
                    value={form.name_am}
                    onChange={(event) =>
                      updateField('name_am', event.target.value)
                    }
                    placeholder="ለምሳሌ ኮካ ኮላ"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />
                </div>
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm ? 'ምድብ' : 'Category'}
                  <span className="ml-1 text-berbere-500">*</span>
                </label>

                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />

                  <select
                    required
                    value={form.category_id}
                    onChange={(event) =>
                      updateField(
                        'category_id',
                        event.target.value
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-cream-200 bg-cream-50/40 pl-10 pr-10 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  >
                    <option value="">
                      {categories.length === 0
                        ? isAm
                          ? 'ምድብ የለም'
                          : 'No categories available'
                        : isAm
                          ? 'ምድብ ይምረጡ'
                          : 'Select category'}
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {isAm
                          ? category.name_am || category.name
                          : category.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'መግለጫ'
                    : 'Description'}
                  <span className="ml-1 text-[10px] font-medium text-coffee-300">
                    {isAm ? 'አማራጭ' : 'Optional'}
                  </span>
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      'description',
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder={
                    isAm
                      ? 'አጭር የምርቱ መግለጫ...'
                      : 'Short product description...'
                  }
                  className="w-full resize-none rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 py-3 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                />
              </div>

              {/* BARCODE + SKU */}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black text-coffee-600">
                    <Barcode className="h-3.5 w-3.5 text-coffee-300" />
                    {isAm ? 'ባርኮድ' : 'Barcode'}

                    <span className="text-[10px] font-medium text-coffee-300">
                      {isAm ? 'አማራጭ' : 'Optional'}
                    </span>
                  </label>

                  <input
                    value={form.barcode}
                    onChange={(event) =>
                      updateField(
                        'barcode',
                        event.target.value
                      )
                    }
                    inputMode="numeric"
                    placeholder="e.g. 6001234567890"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm ? 'SKU' : 'SKU'}

                    <span className="ml-1 text-[10px] font-medium text-coffee-300">
                      {isAm ? 'አማራጭ' : 'Optional'}
                    </span>
                  </label>

                  <input
                    value={form.sku}
                    onChange={(event) =>
                      updateField(
                        'sku',
                        event.target.value
                      )
                    }
                    placeholder="e.g. COKE-500"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================
              2. UNIT
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
            <div className="border-b border-cream-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-900">
                  {isAm ? 'የመሸጫ መለኪያ' : 'Selling unit'}
                </h2>
              </div>

              <p className="mt-1 text-[10px] leading-4 text-coffee-400">
                {isAm
                  ? 'ምርቱ በምን መለኪያ እንደሚሸጥ ይምረጡ።'
                  : 'Choose how this product is measured and sold.'}
              </p>
            </div>

            <div className="space-y-4 p-4">

              <div className="relative">
                <select
                  value={form.unit_type}
                  onChange={(event) =>
                    updateField(
                      'unit_type',
                      event.target.value as UnitOfMeasure
                    )
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 pr-10 text-sm font-bold text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option
                      key={unit.value}
                      value={unit.value}
                    >
                      {isAm ? unit.am : unit.en}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              </div>

              <div className="rounded-xl bg-cream-50 px-3.5 py-3">
                <p className="text-[10px] font-bold leading-4 text-coffee-400">
                  {isAm
                    ? `የተመረጠው: ${selectedUnit?.am ?? 'ቁራጭ'}`
                    : `Selected: ${selectedUnit?.en ?? 'Piece'}`}
                </p>
              </div>

              {/* UNITS PER CRATE */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'በአንድ ክሬት ውስጥ ያሉ ክፍሎች'
                    : 'Units per crate'}

                  <span className="ml-1 text-[10px] font-medium text-coffee-300">
                    {isAm ? 'አማራጭ' : 'Optional'}
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.units_per_crate}
                  onChange={(event) =>
                    updateField(
                      'units_per_crate',
                      event.target.value
                    )
                  }
                  placeholder="e.g. 24"
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                />

                <p className="mt-1.5 text-[10px] leading-4 text-coffee-400">
                  {isAm
                    ? 'ለክሬት/ሳጥን ምርቶች ብቻ ካስፈለገ ይጠቀሙ።'
                    : 'Useful when one crate or box contains multiple units.'}
                </p>
              </div>
            </div>
          </section>

          {/* ====================================================
              3. PRICING
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
            <div className="border-b border-cream-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-900">
                  {isAm ? 'ዋጋ' : 'Pricing'}
                </h2>
              </div>

              <p className="mt-1 text-[10px] leading-4 text-coffee-400">
                {isAm
                  ? 'የግዢ እና የሽያጭ ዋጋን ያዘጋጁ።'
                  : 'Set the cost and selling price.'}
              </p>
            </div>

            <div className="space-y-4 p-4">

              {/* COST */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm ? 'የግዢ ዋጋ' : 'Cost price'}

                  <span className="ml-1 text-[10px] font-medium text-coffee-300">
                    {isAm ? 'አማራጭ' : 'Optional'}
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(event) =>
                      updateField(
                        'cost_price',
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 pr-16 text-sm font-bold text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />

                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-coffee-300">
                    ETB
                  </span>
                </div>
              </div>

              {/* PRICE TYPE */}

              <div>
                <label className="mb-2 block text-[11px] font-black text-coffee-600">
                  {isAm ? 'የሽያጭ ዋጋ አይነት' : 'Selling price type'}
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() => {
                      setPriceType('fixed')
                      updateField(
                        'price_group_id',
                        ''
                      )
                    }}
                    className={`flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border px-3 transition ${
                      priceType === 'fixed'
                        ? 'border-berbere-300 bg-berbere-50 text-berbere-700'
                        : 'border-cream-200 bg-white text-coffee-500 hover:bg-cream-50'
                    }`}
                  >
                    <CircleDollarSign className="h-5 w-5" />

                    <span className="text-xs font-black">
                      {isAm ? 'ቀጥታ ዋጋ' : 'Fixed price'}
                    </span>

                    <span className="text-[9px] font-medium opacity-70">
                      {isAm
                        ? 'ለዚህ ምርት የተወሰነ'
                        : 'Set a specific price'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPriceType('group')
                      updateField(
                        'retail_price',
                        ''
                      )
                    }}
                    className={`flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border px-3 transition ${
                      priceType === 'group'
                        ? 'border-berbere-300 bg-berbere-50 text-berbere-700'
                        : 'border-cream-200 bg-white text-coffee-500 hover:bg-cream-50'
                    }`}
                  >
                    <Coins className="h-5 w-5" />

                    <span className="text-xs font-black">
                      {isAm ? 'የዋጋ ቡድን' : 'Price group'}
                    </span>

                    <span className="text-[9px] font-medium opacity-70">
                      {isAm
                        ? 'ከቡድን ዋጋ ይውሰድ'
                        : 'Use a shared price'}
                    </span>
                  </button>
                </div>
              </div>

              {/* FIXED PRICE */}

              {priceType === 'fixed' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm
                      ? 'የሽያጭ ዋጋ'
                      : 'Selling price'}

                    <span className="ml-1 text-berbere-500">*</span>
                  </label>

                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.retail_price}
                      onChange={(event) =>
                        updateField(
                          'retail_price',
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="h-12 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 pr-16 text-base font-black text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                    />

                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-coffee-300">
                      ETB
                    </span>
                  </div>
                </div>
              )}

              {/* PRICE GROUP */}

              {priceType === 'group' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm
                      ? 'የዋጋ ቡድን'
                      : 'Price group'}

                    <span className="ml-1 text-berbere-500">*</span>
                  </label>

                  <div className="relative">
                    <select
                      required
                      value={form.price_group_id}
                      onChange={(event) =>
                        updateField(
                          'price_group_id',
                          event.target.value
                        )
                      }
                      className="h-12 w-full appearance-none rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 pr-10 text-sm font-bold text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                    >
                      <option value="">
                        {priceGroups.length === 0
                          ? isAm
                            ? 'የዋጋ ቡድን የለም'
                            : 'No price groups available'
                          : isAm
                            ? 'የዋጋ ቡድን ይምረጡ'
                            : 'Select price group'}
                      </option>

                      {priceGroups.map((group) => (
                        <option
                          key={group.id}
                          value={group.id}
                        >
                          {isAm
                            ? group.name_am ||
                              group.name
                            : group.name}{' '}
                          —{' '}
                          {Number(
                            group.amount
                          ).toLocaleString()}{' '}
                          ETB
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-300" />
                  </div>

                  {selectedGroup && (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-cream-50 px-3.5 py-3">
                      <div>
                        <p className="text-[10px] font-bold text-coffee-400">
                          {isAm
                            ? 'የተመረጠ ዋጋ'
                            : 'Selected price'}
                        </p>

                        <p className="mt-0.5 text-sm font-black text-coffee-900">
                          {Number(
                            selectedGroup.amount
                          ).toLocaleString()}{' '}
                          ETB
                        </p>
                      </div>

                      <Check className="h-4 w-4 text-berbere-500" />
                    </div>
                  )}
                </div>
              )}

              {/* TAX */}

              <button
                type="button"
                onClick={() =>
                  updateField(
                    'tax_inclusive',
                    !form.tax_inclusive
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 py-3 text-left transition hover:bg-cream-50"
              >
                <div>
                  <p className="text-xs font-black text-coffee-800">
                    {isAm
                      ? 'ዋጋው ታክስን ያካትታል'
                      : 'Price includes tax'}
                  </p>

                  <p className="mt-0.5 text-[10px] text-coffee-400">
                    {isAm
                      ? 'የተጠቀሰው ዋጋ ታክስን አካትቷል።'
                      : 'The entered selling price already includes tax.'}
                  </p>
                </div>

                <span
                  className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition ${
                    form.tax_inclusive
                      ? 'bg-berbere-500'
                      : 'bg-coffee-200'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      form.tax_inclusive
                        ? 'translate-x-4'
                        : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>
          </section>

          {/* ====================================================
              4. INVENTORY SETTINGS
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
            <div className="border-b border-cream-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-900">
                  {isAm
                    ? 'የክምችት ቅንብር'
                    : 'Inventory settings'}
                </h2>
              </div>

              <p className="mt-1 text-[10px] leading-4 text-coffee-400">
                {isAm
                  ? 'ስርዓቱ ይህን ምርት እንዴት እንደሚከታተል ይወስኑ።'
                  : 'Control how the system tracks this product.'}
              </p>
            </div>

            <div className="space-y-3 p-4">

              {/* TRACK INVENTORY */}

              <button
                type="button"
                onClick={() =>
                  updateField(
                    'track_inventory',
                    !form.track_inventory
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-cream-200 px-3.5 py-3 text-left transition hover:bg-cream-50"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-black text-coffee-800">
                    {isAm
                      ? 'ክምችትን ተከታተል'
                      : 'Track inventory'}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-coffee-400">
                    {isAm
                      ? 'ሽያጭ ሲፈጸም ክምችቱ እንዲከታተል።'
                      : 'Keep stock quantities and movements for this product.'}
                  </p>
                </div>

                <span
                  className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition ${
                    form.track_inventory
                      ? 'bg-berbere-500'
                      : 'bg-coffee-200'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      form.track_inventory
                        ? 'translate-x-4'
                        : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>

              {/* SOLD BY WEIGHT */}

              <button
                type="button"
                onClick={() =>
                  updateField(
                    'is_sold_by_weight',
                    !form.is_sold_by_weight
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-cream-200 px-3.5 py-3 text-left transition hover:bg-cream-50"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-black text-coffee-800">
                    {isAm
                      ? 'በክብደት ይሸጣል'
                      : 'Sold by weight'}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-coffee-400">
                    {isAm
                      ? 'እንደ ኪሎ ያሉ የክብደት መለኪያዎችን ይጠቀሙ።'
                      : 'Use quantities such as kilograms when selling.'}
                  </p>
                </div>

                <span
                  className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition ${
                    form.is_sold_by_weight
                      ? 'bg-berbere-500'
                      : 'bg-coffee-200'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      form.is_sold_by_weight
                        ? 'translate-x-4'
                        : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>

              {/* LOW STOCK */}

              {form.track_inventory && (
                <div className="pt-1">
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm
                      ? 'የዝቅተኛ ክምችት ማስጠንቀቂያ'
                      : 'Low-stock alert'}

                    <span className="ml-1 text-[10px] font-medium text-coffee-300">
                      {isAm ? 'አማራጭ' : 'Optional'}
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.low_stock_alert}
                    onChange={(event) =>
                      updateField(
                        'low_stock_alert',
                        event.target.value
                      )
                    }
                    placeholder="e.g. 10"
                    className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  />

                  <p className="mt-1.5 text-[10px] leading-4 text-coffee-400">
                    {isAm
                      ? 'ክምችቱ ከዚህ ቁጥር በታች ሲወርድ ማስጠንቀቂያ ለማሳየት።'
                      : 'Show a warning when available stock falls below this level.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ====================================================
              5. IMAGE
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
            <div className="border-b border-cream-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-berbere-500" />

                <h2 className="text-xs font-black uppercase tracking-wider text-coffee-900">
                  {isAm ? 'የምርት ምስል' : 'Product image'}
                </h2>
              </div>
            </div>

            <div className="p-4">
              <input
                type="url"
                value={form.image_url}
                onChange={(event) =>
                  updateField(
                    'image_url',
                    event.target.value
                  )
                }
                placeholder={
                  isAm
                    ? 'የምስል URL — አማራጭ'
                    : 'Image URL — optional'
                }
                className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
              />

              <p className="mt-1.5 text-[10px] leading-4 text-coffee-400">
                {isAm
                  ? 'ምስል ከሌለ ምርቱ ያለ ምስል ይቀመጣል።'
                  : 'You can leave this empty and add an image later.'}
              </p>
            </div>
          </section>

          {/* ====================================================
              SAVE
          ==================================================== */}

          <div className="sticky bottom-3 z-10 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-berbere-500 px-5 text-sm font-black text-white shadow-lg shadow-berbere-900/10 transition hover:bg-berbere-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                  ? 'ምርት አስቀምጥ'
                  : 'Save product'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
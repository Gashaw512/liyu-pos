// src/app/[locale]/(app)/management/products/[id]/page.tsx

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Loader2,
  Save,
  Tag,
  Trash2,
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'

import {
  getProductById,
  updateProduct,
} from '@/queries/useProductsQuery'

import type { ProductListItem } from '@/queries/useProductsQuery'
import { PreparationStationSelect, type ProductPreparationStation } from '@/components/management/PreparationStationSelect'

/* ============================================================
   TYPES
============================================================ */

interface CategoryOption {
  id: string
  name: string
  name_am: string | null
}

interface PriceGroupOption {
  id: string
  name: string
  name_am: string | null
  amount: number | null
}

/* ============================================================
   PAGE
============================================================ */

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()

  const id = String(params?.id ?? '')
  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [priceGroups, setPriceGroups] = useState<PriceGroupOption[]>([])

  const [product, setProduct] =
    useState<ProductListItem | null>(null)

  const [priceType, setPriceType] =
    useState<'group' | 'fixed'>('fixed')

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    category_id: '',
    preparation_station: '' as ProductPreparationStation,
    description: '',
    barcode: '',
    sku: '',
    unit_type: 'piece' as
      | 'piece'
      | 'kg'
      | 'liter'
      | 'box'
      | 'pack'
      | 'set'
      | 'crate',
    units_per_crate: '',
    cost_price: '',
    retail_price: '',
    price_group_id: '',
    tax_inclusive: true,
    is_sold_by_weight: false,
    track_inventory: true,
    low_stock_alert: '',
    image_url: '',
    is_active: true,
  })

  const supabase = createClient()

  /* ============================================================
     LOAD DATA
  ============================================================ */

  const loadData = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        router.replace(`/${locale}/login`)
        return
      }

      const [productData, categoriesResult, priceGroupsResult] =
        await Promise.all([
          getProductById(id, businessId),

          supabase
            .from('categories')
            .select('id, name, name_am')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('name'),

          supabase
            .from('price_groups')
            .select('id, name, name_am, amount')
            .eq('business_id', businessId)
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('name'),
        ])

      if (categoriesResult.error) {
        throw categoriesResult.error
      }

      if (priceGroupsResult.error) {
        throw priceGroupsResult.error
      }

      setCategories(
        (categoriesResult.data ?? []) as CategoryOption[]
      )

      setPriceGroups(
        (priceGroupsResult.data ?? []) as PriceGroupOption[]
      )

      setProduct(productData)

      setPriceType(productData.price_type ?? 'fixed')

      setForm({
        name: productData.name ?? '',
        name_am: productData.name_am ?? '',
        category_id: productData.category_id ?? '',
        preparation_station: productData.preparation_station ?? '',
        description: productData.description ?? '',
        barcode: productData.barcode ?? '',
        sku: productData.sku ?? '',
        unit_type: productData.unit_type ?? 'piece',
        units_per_crate:
          productData.units_per_crate != null
            ? String(productData.units_per_crate)
            : '',
        cost_price:
          productData.cost_price != null
            ? String(productData.cost_price)
            : '',
        retail_price:
          productData.retail_price != null
            ? String(productData.retail_price)
            : '',
        price_group_id:
          productData.price_group_id ?? '',
        tax_inclusive:
          productData.tax_inclusive ?? true,
        is_sold_by_weight:
          productData.is_sold_by_weight ?? false,
        track_inventory:
          productData.track_inventory ?? true,
        low_stock_alert:
          productData.low_stock_alert != null
            ? String(productData.low_stock_alert)
            : '',
        image_url:
          productData.image_url ?? '',
        is_active:
          productData.is_active ?? true,
      })
    } catch (err: unknown) {
      console.error('[EditProductPage] Load error:', err)

      window.alert(
        err instanceof Error
          ? err.message
          : isAm
            ? 'ምርቱን መጫን አልተቻለም'
            : 'Failed to load product'
      )

      router.replace(
        `/${locale}/management/products`
      )
    } finally {
      setLoading(false)
    }
  }, [id, locale, router, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  /* ============================================================
     UPDATE FIELD
  ============================================================ */

  const updateField = <
    K extends keyof typeof form
  >(
    field: K,
    value: (typeof form)[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  /* ============================================================
     UPDATE PRODUCT
  ============================================================ */

  const handleUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (saving) {
      return
    }

    if (!form.name.trim()) {
      window.alert(
        isAm
          ? 'የምርት ስም ያስፈልጋል'
          : 'Product name is required'
      )
      return
    }

    if (!form.category_id) {
      window.alert(
        isAm
          ? 'ምድብ ይምረጡ'
          : 'Please select a category'
      )
      return
    }

    const retailPrice = Number(form.retail_price)

    if (
      priceType === 'fixed' &&
      (!Number.isFinite(retailPrice) || retailPrice < 0)
    ) {
      window.alert(
        isAm
          ? 'ትክክለኛ የመሸጫ ዋጋ ያስገቡ'
          : 'Enter a valid selling price'
      )
      return
    }

    let finalRetailPrice = retailPrice
    let finalPriceGroupId: string | null = null

    if (priceType === 'group') {
      if (!form.price_group_id) {
        window.alert(
          isAm
            ? 'የዋጋ ቡድን ይምረጡ'
            : 'Please select a price group'
        )
        return
      }

      const group = priceGroups.find(
        (item) => item.id === form.price_group_id
      )

      if (!group) {
        window.alert(
          isAm
            ? 'የተመረጠው የዋጋ ቡድን አልተገኘም'
            : 'Selected price group was not found'
        )
        return
      }

      finalRetailPrice = Number(group.amount ?? 0)
      finalPriceGroupId = group.id
    }

    if (
      !Number.isFinite(finalRetailPrice) ||
      finalRetailPrice < 0
    ) {
      window.alert(
        isAm
          ? 'ትክክለኛ ዋጋ ያስገቡ'
          : 'Enter a valid price'
      )
      return
    }

    try {
      setSaving(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error(
          isAm
            ? 'የንግድ መረጃ አልተገኘም'
            : 'Missing business session'
        )
      }

      const unitsPerCrate =
        form.units_per_crate.trim() === ''
          ? null
          : Number(form.units_per_crate)

      const costPrice =
        form.cost_price.trim() === ''
          ? 0
          : Number(form.cost_price)

      const lowStockAlert =
        form.low_stock_alert.trim() === ''
          ? null
          : Number(form.low_stock_alert)

      if (
        unitsPerCrate !== null &&
        (!Number.isFinite(unitsPerCrate) ||
          unitsPerCrate < 0)
      ) {
        throw new Error(
          isAm
            ? 'የካርቶን ክፍሎች ትክክለኛ ቁጥር ይሁን'
            : 'Units per crate must be a valid number'
        )
      }

      if (
        !Number.isFinite(costPrice) ||
        costPrice < 0
      ) {
        throw new Error(
          isAm
            ? 'የወጪ ዋጋ ትክክል አይደለም'
            : 'Cost price must be a valid number'
        )
      }

      if (
        lowStockAlert !== null &&
        (!Number.isFinite(lowStockAlert) ||
          lowStockAlert < 0)
      ) {
        throw new Error(
          isAm
            ? 'የዝቅተኛ ክምችት መጠን ትክክል አይደለም'
            : 'Low-stock alert must be a valid number'
        )
      }

      await updateProduct(
        id,
        businessId,
        {
          name: form.name.trim(),
          name_am: form.name_am.trim(),

          category_id: form.category_id,
          preparation_station: form.preparation_station || null,

          description:
            form.description.trim() || null,

          barcode:
            form.barcode.trim() || null,

          sku:
            form.sku.trim() || null,

          unit_type: form.unit_type,

          units_per_crate: unitsPerCrate,

          cost_price: costPrice,

          retail_price: finalRetailPrice,

          price_type: priceType,

          price_group_id: finalPriceGroupId,

          tax_inclusive:
            form.tax_inclusive,

          is_sold_by_weight:
            form.is_sold_by_weight,

          track_inventory:
            form.track_inventory,

          low_stock_alert:
            lowStockAlert,

          image_url:
            form.image_url.trim() || null,

          is_active:
            form.is_active,
        }
      )

      router.push(
        `/${locale}/management/products`
      )
    } catch (err: unknown) {
      console.error(
        '[EditProductPage] Update error:',
        err
      )

      window.alert(
        err instanceof Error
          ? err.message
          : isAm
            ? 'ምርቱን ማዘመን አልተቻለም'
            : 'Failed to update product'
      )
    } finally {
      setSaving(false)
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 px-4 py-12">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-berbere-50">
              <Loader2 className="h-5 w-5 animate-spin text-berbere-500" />
            </div>

            <p className="text-xs font-bold text-coffee-400">
              {isAm
                ? 'ምርቱ በመጫን ላይ...'
                : 'Loading product...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PRODUCT NOT FOUND
  ============================================================ */

  if (!product) {
    return (
      <div className="min-h-screen bg-cream-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-sm font-black text-coffee-900">
            {isAm
              ? 'ምርቱ አልተገኘም'
              : 'Product not found'}
          </h1>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/products`
              )
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-coffee-900 px-4 py-2.5 text-xs font-black text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAm ? 'ወደ ምርቶች' : 'Back to products'}
          </button>
        </div>
      </div>
    )
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="min-h-screen w-full bg-cream-50 pb-28">
      <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 sm:py-6">

        {/* BACK */}

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-coffee-500 transition hover:bg-white hover:text-coffee-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        {/* HEADER */}

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-50">
            <Tag className="h-5 w-5 text-gold-500" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-coffee-900">
              {isAm
                ? 'ምርት ማስተካከያ'
                : 'Edit Product'}
            </h1>

            <p className="mt-0.5 truncate text-xs text-coffee-400">
              {product.name}
            </p>
          </div>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleUpdate}
          className="mt-6 space-y-5"
        >
          <PreparationStationSelect
            value={form.preparation_station}
            locale={locale}
            allowInherit
            onChange={(preparation_station) => updateField('preparation_station', preparation_station)}
          />

          {/* BASIC INFORMATION */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'መሰረታዊ መረጃ'
                  : 'Basic information'}
              </h2>

              <p className="mt-0.5 text-[11px] text-coffee-400">
                {isAm
                  ? 'የምርቱን መሰረታዊ መረጃ ያስተካክሉ።'
                  : 'Update the basic product information.'}
              </p>
            </div>

            <div className="space-y-3">

              {/* NAME */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'የእንግሊዝኛ ስም'
                    : 'Product name'}
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      'name',
                      event.target.value
                    )
                  }
                  required
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="Product name"
                />
              </div>

              {/* AMHARIC NAME */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'የአማርኛ ስም'
                    : 'Amharic name'}
                </label>

                <input
                  value={form.name_am}
                  onChange={(event) =>
                    updateField(
                      'name_am',
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder={
                    isAm
                      ? 'የአማርኛ ስም'
                      : 'Amharic name'
                  }
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm ? 'ምድብ' : 'Category'}
                </label>

                <select
                  value={form.category_id}
                  onChange={(event) =>
                    updateField(
                      'category_id',
                      event.target.value
                    )
                  }
                  required
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                >
                  <option value="">
                    {isAm
                      ? 'ምድብ ይምረጡ'
                      : 'Select category'}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {isAm
                        ? category.name_am ||
                          category.name
                        : category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'መግለጫ'
                    : 'Description'}
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
                  className="w-full resize-none rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-3 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder={
                    isAm
                      ? 'አጭር መግለጫ...'
                      : 'Short product description...'
                  }
                />
              </div>
            </div>
          </section>

          {/* IDENTIFIERS */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'መለያ መረጃ'
                  : 'Product identifiers'}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  Barcode
                </label>

                <input
                  value={form.barcode}
                  onChange={(event) =>
                    updateField(
                      'barcode',
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="Barcode"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  SKU
                </label>

                <input
                  value={form.sku}
                  onChange={(event) =>
                    updateField(
                      'sku',
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="SKU"
                />
              </div>
            </div>
          </section>

          {/* UNIT */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'የመለኪያ አሃድ'
                  : 'Unit & packaging'}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'አሃድ'
                    : 'Unit'}
                </label>

                <select
                  value={form.unit_type}
                  onChange={(event) =>
                    updateField(
                      'unit_type',
                      event.target.value as typeof form.unit_type
                    )
                  }
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="set">Set</option>
                  <option value="crate">Crate</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'በካርቶን ውስጥ ብዛት'
                    : 'Units per crate'}
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.units_per_crate}
                  onChange={(event) =>
                    updateField(
                      'units_per_crate',
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* PRICING */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'ዋጋ'
                  : 'Pricing'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setPriceType('fixed')
                }
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  priceType === 'fixed'
                    ? 'border-berbere-300 bg-berbere-50'
                    : 'border-cream-200 bg-white hover:bg-cream-50'
                }`}
              >
                <p
                  className={`text-xs font-black ${
                    priceType === 'fixed'
                      ? 'text-berbere-700'
                      : 'text-coffee-700'
                  }`}
                >
                  {isAm
                    ? 'ቋሚ ዋጋ'
                    : 'Fixed price'}
                </p>

                <p className="mt-0.5 text-[10px] text-coffee-400">
                  {isAm
                    ? 'በምርቱ ላይ ቀጥታ ዋጋ'
                    : 'Direct product price'}
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPriceType('group')
                }
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  priceType === 'group'
                    ? 'border-gold-300 bg-gold-50'
                    : 'border-cream-200 bg-white hover:bg-cream-50'
                }`}
              >
                <p
                  className={`text-xs font-black ${
                    priceType === 'group'
                      ? 'text-gold-700'
                      : 'text-coffee-700'
                  }`}
                >
                  {isAm
                    ? 'የቡድን ዋጋ'
                    : 'Price group'}
                </p>

                <p className="mt-0.5 text-[10px] text-coffee-400">
                  {isAm
                    ? 'ከዋጋ ቡድን ይውሰድ'
                    : 'Use a pricing group'}
                </p>
              </button>
            </div>

            <div className="mt-3">
              {priceType === 'fixed' ? (
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm
                      ? 'የመሸጫ ዋጋ'
                      : 'Selling price'}
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.retail_price}
                      onChange={(event) =>
                        updateField(
                          'retail_price',
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 pr-16 text-sm font-black text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                      placeholder="0.00"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-coffee-400">
                      ETB
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                    {isAm
                      ? 'የዋጋ ቡድን'
                      : 'Price group'}
                  </label>

                  <select
                    value={form.price_group_id}
                    onChange={(event) =>
                      updateField(
                        'price_group_id',
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-gold-300 focus:bg-white focus:ring-2 focus:ring-gold-50"
                  >
                    <option value="">
                      {isAm
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
                          group.amount ?? 0
                        ).toLocaleString()}{' '}
                        ETB
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                {isAm
                  ? 'የግዢ ዋጋ'
                  : 'Cost price'}
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
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 pr-16 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="0.00"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-coffee-400">
                  ETB
                </span>
              </div>
            </div>

            <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-3">
              <div>
                <p className="text-xs font-black text-coffee-700">
                  {isAm
                    ? 'የግብር ዋጋ ውስጥ ነው'
                    : 'Tax inclusive'}
                </p>

                <p className="mt-0.5 text-[10px] text-coffee-400">
                  {isAm
                    ? 'ዋጋው ግብርን ያካትታል'
                    : 'Selling price already includes tax'}
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.tax_inclusive}
                onChange={(event) =>
                  updateField(
                    'tax_inclusive',
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-berbere-500"
              />
            </label>
          </section>

          {/* INVENTORY SETTINGS */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'የክምችት ቅንብሮች'
                  : 'Inventory settings'}
              </h2>

              <p className="mt-0.5 text-[11px] text-coffee-400">
                {isAm
                  ? 'እዚህ የምርቱን የክምችት ክትትል ብቻ ያዘጋጁ።'
                  : 'Configure how this product is tracked.'}
              </p>
            </div>

            <div className="space-y-2">

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-cream-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-black text-coffee-700">
                    {isAm
                      ? 'ክምችት ይከታተል'
                      : 'Track inventory'}
                  </p>

                  <p className="mt-0.5 text-[10px] text-coffee-400">
                    {isAm
                      ? 'የክምችት መጠን ይከታተሉ'
                      : 'Track stock quantity for this product'}
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.track_inventory}
                  onChange={(event) =>
                    updateField(
                      'track_inventory',
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-berbere-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-cream-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-black text-coffee-700">
                    {isAm
                      ? 'በክብደት ይሸጣል'
                      : 'Sold by weight'}
                  </p>

                  <p className="mt-0.5 text-[10px] text-coffee-400">
                    {isAm
                      ? 'ለምሳሌ ኪሎ ወይም ሊትር'
                      : 'Useful for weight or volume-based sales'}
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.is_sold_by_weight}
                  onChange={(event) =>
                    updateField(
                      'is_sold_by_weight',
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-berbere-500"
                />
              </label>

              <div className="rounded-xl border border-cream-200 px-3.5 py-3">
                <label className="mb-1.5 block text-[11px] font-black text-coffee-600">
                  {isAm
                    ? 'ዝቅተኛ ክምችት ማስጠንቀቂያ'
                    : 'Low-stock alert'}
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
                  disabled={!form.track_inventory}
                  className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* IMAGE */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-coffee-400" />

              <h2 className="text-sm font-black text-coffee-900">
                {isAm
                  ? 'ምስል'
                  : 'Product image'}
              </h2>
            </div>

            <input
              value={form.image_url}
              onChange={(event) =>
                updateField(
                  'image_url',
                  event.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 text-sm font-medium text-coffee-900 outline-none transition focus:border-berbere-300 focus:bg-white focus:ring-2 focus:ring-berbere-50"
              placeholder="https://..."
            />

            {form.image_url.trim() && (
              <div className="mt-3 overflow-hidden rounded-xl border border-cream-200 bg-cream-50">
                <img
                  src={form.image_url}
                  alt={form.name || 'Product'}
                  className="h-40 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      'none'
                  }}
                />
              </div>
            )}
          </section>

          {/* ACTIVE */}

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="text-sm font-black text-coffee-900">
                  {isAm
                    ? 'ምርቱ ንቁ ነው'
                    : 'Product is active'}
                </p>

                <p className="mt-0.5 text-[11px] text-coffee-400">
                  {isAm
                    ? 'ንቁ ምርቶች በሽያጭ ላይ ይታያሉ።'
                    : 'Active products can be used in sales.'}
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField(
                    'is_active',
                    event.target.checked
                  )
                }
                className="h-5 w-5 accent-berbere-500"
              />
            </label>
          </section>

          {/* SAVE */}

          <button
            type="submit"
            disabled={saving}
            className="sticky bottom-3 z-20 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-berbere-500 px-4 text-sm font-black text-white shadow-lg shadow-berbere-900/10 transition hover:bg-berbere-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}

            {saving
              ? isAm
                ? 'በማዘመን ላይ...'
                : 'Updating...'
              : isAm
                ? 'ለውጦችን አስቀምጥ'
                : 'Save changes'}
          </button>

          {/* CANCEL */}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              router.push(
                `/${locale}/management/products`
              )
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white text-xs font-black text-coffee-500 transition hover:bg-cream-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isAm ? 'ሰርዝ' : 'Cancel'}
          </button>

          <div className="flex items-center justify-center gap-1 pb-3 text-[10px] font-bold text-coffee-300">
            <Check className="h-3 w-3" />
            {isAm
              ? 'ለውጦችዎ በንግድዎ ውስጥ ይቀመጣሉ'
              : 'Changes are saved to your business'}
          </div>
        </form>
      </div>
    </div>
  )
}

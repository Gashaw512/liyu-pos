// src/app/[locale]/(app)/management/price-groups/[id]/edit/page.tsx

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckSquare,
  Coins,
  Layers,
  Loader2,
  Save,
  Search,
  Square,
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'

const supabase = createClient()

// ============================================================
// TYPES
// ============================================================

interface ProductRow {
  id: string
  name: string
  name_am: string | null
  price_group_id: string | null
}

// ============================================================
// PAGE
// ============================================================

export default function EditPriceGroupPage() {
  const router = useRouter()
  const params = useParams()

  const id = String(params?.id ?? '')
  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState<ProductRow[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    nameAm: '',
    amount: '',
  })

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error(
          isAm
            ? 'የንግድ መለያ አልተገኘም'
            : 'Business ID is required'
        )
      }

      // --------------------------------------------------------
      // LOAD PRICE GROUP
      // --------------------------------------------------------

      const { data: group, error: groupError } = await supabase
        .from('price_groups')
        .select('id, name, name_am, amount')
        .eq('id', id)
        .eq('business_id', businessId)
        .single()

      if (groupError) {
        throw groupError
      }

      setFormData({
        name: group.name ?? '',
        nameAm: group.name_am ?? '',
        amount: String(group.amount ?? ''),
      })

      // --------------------------------------------------------
      // LOAD PRODUCTS
      // --------------------------------------------------------

      const { data: productRows, error: productError } =
        await supabase
          .from('products')
          .select('id, name, name_am, price_group_id')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name', { ascending: true })

      if (productError) {
        throw productError
      }

      const productsData =
        (productRows as ProductRow[] | null) ?? []

      setProducts(productsData)

      // --------------------------------------------------------
      // PRESELECT PRODUCTS ALREADY IN THIS GROUP
      // --------------------------------------------------------

      const linkedProductIds = productsData
        .filter((product) => product.price_group_id === id)
        .map((product) => product.id)

      setSelectedProductIds(linkedProductIds)
    } catch (error) {
      console.error(
        '[EditPriceGroupPage] Failed to load data:',
        error
      )

      setProducts([])

      window.alert(
        isAm
          ? 'የዋጋ ቡድኑን መረጃ መጫን አልተቻለም።'
          : 'Failed to load the price group.'
      )
    } finally {
      setLoading(false)
    }
  }, [id, isAm])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ==========================================================
  // FILTERED PRODUCTS
  // ==========================================================

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return products
    }

    return products.filter((product) => {
      const englishName =
        product.name?.toLowerCase() ?? ''

      const amharicName =
        product.name_am?.toLowerCase() ?? ''

      return (
        englishName.includes(query) ||
        amharicName.includes(query)
      )
    })
  }, [products, searchQuery])

  // ==========================================================
  // SELECTED PRODUCTS
  // ==========================================================

  const selectedProducts = useMemo(
    () =>
      products.filter((product) =>
        selectedProductIds.includes(product.id)
      ),
    [products, selectedProductIds]
  )

  const totalProducts = selectedProducts.length

  // ==========================================================
  // PRODUCTS MOVING FROM ANOTHER GROUP
  // ==========================================================

  const conflicts = useMemo(
    () =>
      products.filter(
        (product) =>
          selectedProductIds.includes(product.id) &&
          product.price_group_id &&
          product.price_group_id !== id
      ),
    [products, selectedProductIds, id]
  )

  // ==========================================================
  // SELECT ALL
  // ==========================================================

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) =>
      selectedProductIds.includes(product.id)
    )

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    )
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredProducts.map(
      (product) => product.id
    )

    if (filteredIds.length === 0) {
      return
    }

    if (allFilteredSelected) {
      setSelectedProductIds((current) =>
        current.filter((id) => !filteredIds.includes(id))
      )

      return
    }

    setSelectedProductIds((current) => [
      ...new Set([...current, ...filteredIds]),
    ])
  }

  // ==========================================================
  // FORM VALUES
  // ==========================================================

  const amount = Number(formData.amount)

  const isValidAmount =
    Number.isFinite(amount) && amount > 0

  const displayName =
    isAm
      ? formData.nameAm.trim() ||
        formData.name.trim() ||
        'የዋጋ ቡድን'
      : formData.name.trim() ||
        formData.nameAm.trim() ||
        'Price Group'

  const estimatedValue = totalProducts * (
    isValidAmount ? amount : 0
  )

  // ==========================================================
  // UPDATE
  // ==========================================================

  const handleUpdate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    if (!isValidAmount) {
      window.alert(
        isAm
          ? 'እባክዎ ትክክለኛ ዋጋ ያስገቡ።'
          : 'Please enter a valid price.'
      )

      return
    }

    if (!id) {
      return
    }

    try {
      setSaving(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error(
          isAm
            ? 'የንግድ መለያ አልተገኘም'
            : 'Business ID is required'
        )
      }

      // --------------------------------------------------------
      // 1. UPDATE PRICE GROUP
      // --------------------------------------------------------

      const { error: groupError } = await supabase
        .from('price_groups')
        .update({
          name: formData.name.trim(),
          name_am: formData.nameAm.trim(),
          amount,
        })
        .eq('id', id)
        .eq('business_id', businessId)

      if (groupError) {
        throw groupError
      }

      // --------------------------------------------------------
      // 2. REMOVE PRODUCTS NO LONGER SELECTED
      //
      // IMPORTANT:
      // Only products belonging to this business AND this group
      // are changed.
      // --------------------------------------------------------

      const { error: unlinkError } = await supabase
        .from('products')
        .update({
          price_group_id: null,
          price_type: 'fixed',
        })
        .eq('business_id', businessId)
        .eq('price_group_id', id)

      if (unlinkError) {
        throw unlinkError
      }

      // --------------------------------------------------------
      // 3. LINK SELECTED PRODUCTS
      //
      // A product belonging to another group will intentionally
      // move to this group.
      // --------------------------------------------------------

      if (selectedProductIds.length > 0) {
        const { error: linkError } = await supabase
          .from('products')
          .update({
            price_group_id: id,
            price_type: 'group',
            retail_price: amount,
          })
          .eq('business_id', businessId)
          .in('id', selectedProductIds)

        if (linkError) {
          throw linkError
        }
      }

      router.push(
        `/${locale}/management/price-groups`
      )

      router.refresh()
    } catch (error) {
      console.error(
        '[EditPriceGroupPage] Failed to update:',
        error
      )

      window.alert(
        error instanceof Error
          ? error.message
          : isAm
            ? 'የዋጋ ቡድኑን ማዘመን አልተቻለም።'
            : 'Failed to update the price group.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-berbere-500" />

          <p className="text-xs font-semibold text-coffee-400">
            {isAm
              ? 'የዋጋ ቡድኑን በመጫን ላይ...'
              : 'Loading price group...'}
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-cream-100 pb-28">
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-4 sm:px-6">

        {/* ====================================================
            TOP BAR
        ===================================================== */}

        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex items-center gap-2
              rounded-xl
              px-2.5 py-2
              text-xs font-black
              text-coffee-600
              transition
              hover:bg-cream-200
            "
          >
            <ArrowLeft className="h-4 w-4" />

            {isAm ? 'ተመለስ' : 'Back'}
          </button>

          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-coffee-400">
            <Coins className="h-3.5 w-3.5 text-gold-400" />

            {isAm ? 'የዋጋ አስተዳደር' : 'Pricing'}
          </div>
        </div>

        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex items-start gap-3">
          <div
            className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-2xl
              bg-berbere-500
            "
          >
            <Layers className="h-6 w-6 text-white" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-coffee-700 sm:text-2xl">
              {isAm
                ? 'የዋጋ ቡድን አርም'
                : 'Edit Price Group'}
            </h1>

            <p className="mt-1 text-xs font-medium leading-5 text-coffee-400 sm:text-sm">
              {isAm
                ? 'የቡድኑን ስም፣ ዋጋ እና የተመደቡ ምርቶችን ያስተካክሉ።'
                : 'Update the group name, price, and assigned products.'}
            </p>
          </div>
        </div>

        {/* ====================================================
            LIVE SUMMARY
        ===================================================== */}

        <section
          className="
            mb-5
            overflow-hidden
            rounded-3xl
            bg-coffee-700
            shadow-sm
          "
        >
          <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cream-300">
                {isAm ? 'የዋጋ ቡድን' : 'Price group'}
              </p>

              <h2 className="mt-1 truncate text-base font-black text-white">
                {displayName}
              </h2>

              <p className="mt-1 text-xs font-medium text-cream-300">
                {totalProducts}{' '}
                {isAm
                  ? 'ምርቶች ተመድበዋል'
                  : 'products assigned'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-2xl font-black text-gold-400">
                {isValidAmount
                  ? amount.toFixed(2)
                  : '0.00'}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-cream-300">
                ETB
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleUpdate}
          className="space-y-5"
        >

          {/* ==================================================
              GROUP DETAILS
          ================================================== */}

          <section
            className="
              overflow-hidden
              rounded-3xl
              border border-cream-300
              bg-white
              shadow-sm
            "
          >
            <div className="border-b border-cream-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-berbere-500" />

                <h2 className="text-sm font-black text-coffee-700">
                  {isAm ? 'የቡድኑ መረጃ' : 'Group details'}
                </h2>
              </div>

              <p className="mt-1 text-xs text-coffee-400">
                {isAm
                  ? 'የዋጋ ቡድኑን መረጃ ያስተካክሉ።'
                  : 'Update the price group information.'}
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">

              {/* ENGLISH */}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500">
                  {isAm ? 'የእንግሊዝኛ ስም' : 'English name'}
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="
                    h-12 w-full
                    rounded-xl
                    border border-cream-300
                    bg-cream-50
                    px-4
                    text-sm font-bold
                    text-coffee-700
                    outline-none
                    transition
                    placeholder:text-coffee-300
                    focus:border-gold-400
                    focus:ring-2
                    focus:ring-gold-400/20
                  "
                  placeholder="Example: Small Beer"
                />
              </div>

              {/* AMHARIC */}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500">
                  {isAm ? 'የአማርኛ ስም' : 'Amharic name'}
                </label>

                <input
                  type="text"
                  value={formData.nameAm}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      nameAm: event.target.value,
                    }))
                  }
                  className="
                    h-12 w-full
                    rounded-xl
                    border border-cream-300
                    bg-cream-50
                    px-4
                    text-sm font-bold
                    text-coffee-700
                    outline-none
                    transition
                    placeholder:text-coffee-300
                    focus:border-gold-400
                    focus:ring-2
                    focus:ring-gold-400/20
                  "
                  placeholder="ለምሳሌ፦ ትንሽ ቢራ"
                />
              </div>

              {/* PRICE */}

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500">
                  {isAm ? 'የመሸጫ ዋጋ' : 'Selling price'}
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className="
                      h-14 w-full
                      rounded-xl
                      border border-cream-300
                      bg-cream-50
                      px-4 pr-16
                      text-lg font-black
                      text-berbere-500
                      outline-none
                      transition
                      placeholder:text-coffee-300
                      focus:border-gold-400
                      focus:ring-2
                      focus:ring-gold-400/20
                    "
                    placeholder="0.00"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-coffee-400">
                    ETB
                  </span>
                </div>

                <p className="text-[11px] text-coffee-400">
                  {isAm
                    ? 'ይህ ዋጋ ለተመረጡት ምርቶች ይተገበራል።'
                    : 'This price will be applied to the selected products.'}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              PRODUCT ASSIGNMENT
          ================================================== */}

          <section
            className="
              overflow-hidden
              rounded-3xl
              border border-cream-300
              bg-white
              shadow-sm
            "
          >
            <div className="border-b border-cream-200 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-berbere-500" />

                    <h2 className="text-sm font-black text-coffee-700">
                      {isAm
                        ? 'የተመደቡ ምርቶች'
                        : 'Assigned products'}
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-coffee-400">
                    {isAm
                      ? 'ይህን የዋጋ ቡድን የሚጠቀሙ ምርቶችን ይምረጡ።'
                      : 'Choose which products should use this price.'}
                  </p>
                </div>

                <div
                  className="
                    flex h-9 min-w-9 shrink-0
                    items-center justify-center
                    rounded-xl
                    bg-berbere-50
                    px-2.5
                    text-xs font-black
                    text-berbere-500
                  "
                >
                  {selectedProductIds.length}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">

              {/* SEARCH */}

              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder={
                    isAm
                      ? 'ምርት ይፈልጉ...'
                      : 'Search products...'
                  }
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-cream-300
                    bg-cream-50
                    pl-10 pr-4
                    text-sm font-semibold
                    text-coffee-700
                    outline-none
                    transition
                    placeholder:text-coffee-300
                    focus:border-gold-400
                    focus:ring-2
                    focus:ring-gold-400/20
                  "
                />
              </div>

              {/* SELECT ALL */}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-coffee-400">
                  {filteredProducts.length}{' '}
                  {isAm ? 'ምርቶች ታይተዋል' : 'products shown'}
                </p>

                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  disabled={filteredProducts.length === 0}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg
                    px-2.5 py-1.5
                    text-[11px] font-black
                    text-gold-600
                    transition
                    hover:bg-gold-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  {allFilteredSelected && (
                    <Check className="h-3.5 w-3.5" />
                  )}

                  {allFilteredSelected
                    ? isAm
                      ? 'ሁሉንም አትምረጥ'
                      : 'Clear shown'
                    : isAm
                      ? 'ሁሉንም ምረጥ'
                      : 'Select shown'}
                </button>
              </div>

              {/* PRODUCT LIST */}

              <div
                className="
                  mt-3
                  max-h-[380px]
                  overflow-y-auto
                  rounded-2xl
                  border border-cream-300
                "
              >
                {filteredProducts.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
                    <div
                      className="
                        flex h-10 w-10
                        items-center justify-center
                        rounded-xl
                        bg-cream-200
                      "
                    >
                      <Search className="h-5 w-5 text-coffee-400" />
                    </div>

                    <p className="mt-3 text-xs font-bold text-coffee-500">
                      {isAm
                        ? 'ምንም ምርት አልተገኘም'
                        : 'No products found'}
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const checked =
                      selectedProductIds.includes(product.id)

                    const belongsToAnotherGroup =
                      Boolean(
                        product.price_group_id &&
                        product.price_group_id !== id
                      )

                    const displayProductName =
                      isAm
                        ? product.name_am || product.name
                        : product.name

                    const secondaryName =
                      isAm
                        ? product.name
                        : product.name_am

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          toggleProduct(product.id)
                        }
                        className={`
                          flex w-full
                          items-center justify-between
                          gap-3
                          border-b border-cream-200
                          px-4 py-3
                          text-left
                          transition
                          last:border-b-0
                          ${
                            checked
                              ? 'bg-berbere-50'
                              : 'bg-white hover:bg-cream-50'
                          }
                        `}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {checked ? (
                            <CheckSquare className="h-5 w-5 shrink-0 text-berbere-500" />
                          ) : (
                            <Square className="h-5 w-5 shrink-0 text-cream-400" />
                          )}

                          <div className="min-w-0">
                            <p
                              className={`
                                truncate
                                text-sm font-bold
                                ${
                                  checked
                                    ? 'text-berbere-600'
                                    : 'text-coffee-700'
                                }
                              `}
                            >
                              {displayProductName}
                            </p>

                            {secondaryName && (
                              <p className="mt-0.5 truncate text-[10px] font-medium text-coffee-300">
                                {secondaryName}
                              </p>
                            )}
                          </div>
                        </div>

                        {belongsToAnotherGroup && (
                          <span
                            className="
                              inline-flex shrink-0
                              items-center gap-1
                              rounded-lg
                              bg-gold-50
                              px-2 py-1
                              text-[9px] font-black
                              uppercase tracking-wide
                              text-gold-700
                            "
                          >
                            <AlertTriangle className="h-3 w-3" />

                            {isAm
                              ? 'ሌላ ቡድን'
                              : 'Other group'}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* GROUP MOVE NOTICE */}

              {conflicts.length > 0 && (
                <div
                  className="
                    mt-3
                    flex items-start gap-2
                    rounded-xl
                    border border-gold-200
                    bg-gold-50
                    px-3 py-2.5
                  "
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />

                  <p className="text-[11px] font-semibold leading-4 text-gold-700">
                    {isAm
                      ? `${conflicts.length} ምርት ከሌላ የዋጋ ቡድን ወደዚህ ቡድን ይዛወራል።`
                      : `${conflicts.length} product${conflicts.length === 1 ? '' : 's'} will move from another price group to this one.`}
                  </p>
                </div>
              )}

              {/* CURRENT SELECTION */}

              <div
                className="
                  mt-3
                  flex items-center gap-2
                  rounded-xl
                  border border-cream-300
                  bg-cream-50
                  px-3 py-2.5
                "
              >
                <Check
                  className="h-4 w-4 shrink-0 text-berbere-500"
                />

                <p className="text-[11px] font-semibold leading-4 text-coffee-500">
                  {totalProducts > 0
                    ? isAm
                      ? `${totalProducts} ምርቶች ይህን የዋጋ ቡድን ይጠቀማሉ።`
                      : `${totalProducts} product${totalProducts === 1 ? '' : 's'} will use this price group.`
                    : isAm
                      ? 'ምንም ምርት አልተመረጠም።'
                      : 'No products are currently selected.'}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              IMPACT
          ================================================== */}

          <section
            className="
              rounded-3xl
              border border-cream-300
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-coffee-400">
                  {isAm
                    ? 'የማዘመን ማጠቃለያ'
                    : 'Update summary'}
                </p>

                <p className="mt-1 text-xs font-bold text-coffee-600">
                  {isAm
                    ? 'የተመረጡ ምርቶች የሚያገኙት ዋጋ'
                    : 'Price applied to selected products'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-black text-berbere-500">
                  {estimatedValue.toFixed(2)}
                </p>

                <p className="text-[10px] font-bold text-coffee-400">
                  ETB × {totalProducts}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              SAVE
          ================================================== */}

          <div className="sticky bottom-4 z-10">
            <button
              type="submit"
              disabled={saving || !isValidAmount}
              className="
                flex h-14 w-full
                items-center justify-center gap-2
                rounded-2xl
                bg-berbere-500
                px-5
                text-sm font-black
                text-white
                shadow-lg
                shadow-berbere-500/20
                transition
                hover:bg-berbere-600
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
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
                  ? 'የዋጋ ቡድን አዘምን'
                  : 'Update Price Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
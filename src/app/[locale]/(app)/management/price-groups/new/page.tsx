// src/app/[locale]/(app)/management/price-group/new/page.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Check,
  CheckSquare,
  Layers,
  Loader2,
  Save,
  Search,
  Square,
  Tag,
} from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/auth/getBusinessId'
import { createPriceGroup } from '@/queries/usePriceGroupQueries'

const supabase = createClient()

// ============================================================
// TYPES
// ============================================================

interface Product {
  id: string
  name: string
  name_am: string | null
}

// ============================================================
// PAGE
// ============================================================

export default function NewPriceGroupPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '',
    name_am: '',
    amount: '',
  })

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setInitialLoading(true)

        const businessId = await getBusinessId()

        if (!businessId) {
          throw new Error(
            isAm
              ? 'የንግድ መለያ አልተገኘም'
              : 'Business ID is required'
          )
        }

        const { data, error } = await supabase
          .from('products')
          .select('id, name, name_am')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) {
          throw error
        }

        setProducts((data ?? []) as Product[])
      } catch (error) {
        console.error(
          '[NewPriceGroupPage] Failed to load products:',
          error
        )

        setProducts([])
      } finally {
        setInitialLoading(false)
      }
    }

    void loadProducts()
  }, [isAm])

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return products
    }

    return products.filter((product) => {
      const englishName = product.name?.toLowerCase() ?? ''
      const amharicName = product.name_am?.toLowerCase() ?? ''

      return (
        englishName.includes(query) ||
        amharicName.includes(query)
      )
    })
  }, [products, searchQuery])

  // ==========================================================
  // SELECTION
  // ==========================================================

  const toggleProductSelection = (productId: string) => {
    setSelected((current) =>
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

    const allSelected = filteredIds.every((id) =>
      selected.includes(id)
    )

    if (allSelected) {
      setSelected((current) =>
        current.filter((id) => !filteredIds.includes(id))
      )

      return
    }

    setSelected((current) => [
      ...new Set([...current, ...filteredIds]),
    ])
  }

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) =>
      selected.includes(product.id)
    )

  // ==========================================================
  // FORM
  // ==========================================================

  const amount = Number(form.amount)

  const isValidAmount =
    Number.isFinite(amount) && amount > 0

  const displayGroupName =
    isAm
      ? form.name_am.trim() || form.name.trim() || 'የዋጋ ቡድን'
      : form.name.trim() || form.name_am.trim() || 'Price Group'

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isValidAmount) {
      window.alert(
        isAm
          ? 'እባክዎ ትክክለኛ ዋጋ ያስገቡ።'
          : 'Please enter a valid price.'
      )

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
      // CREATE PRICE GROUP
      // --------------------------------------------------------

      const group = await createPriceGroup({
        business_id: businessId,
        name:
          form.name.trim() ||
          form.name_am.trim() ||
          `Price Group ${amount}`,

        name_am:
          form.name_am.trim() ||
          form.name.trim() ||
          `የዋጋ ቡድን ${amount}`,

        amount,
      })

      // --------------------------------------------------------
      // APPLY GROUP TO SELECTED PRODUCTS
      // --------------------------------------------------------

      if (selected.length > 0) {
        const { error } = await supabase
          .from('products')
          .update({
            price_group_id: group.id,
            price_type: 'group',
            retail_price: amount,
          })
          .eq('business_id', businessId)
          .in('id', selected)

        if (error) {
          throw error
        }
      }

      router.push(
        `/${locale}/management/price-groups`
      )

      router.refresh()
    } catch (error) {
      console.error(
        '[NewPriceGroupPage] Failed to create price group:',
        error
      )

      const message =
        error instanceof Error
          ? error.message
          : isAm
            ? 'የዋጋ ቡድኑን መፍጠር አልተቻለም።'
            : 'Failed to create the price group.'

      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-cream-100 pb-28">
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-4 sm:px-6">

        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex items-center gap-2
              rounded-xl px-2.5 py-2
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
            <Tag className="h-3.5 w-3.5 text-gold-400" />

            {isAm ? 'የዋጋ አስተዳደር' : 'Pricing'}
          </div>
        </div>

        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-12 w-12 shrink-0
                items-center justify-center
                rounded-2xl
                bg-berbere-500
                shadow-sm
              "
            >
              <Layers className="h-6 w-6 text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-coffee-700 sm:text-2xl">
                {isAm
                  ? 'አዲስ የዋጋ ቡድን'
                  : 'Create Price Group'}
              </h1>

              <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-coffee-400 sm:text-sm">
                {isAm
                  ? 'ለብዙ ምርቶች አንድ የመሸጫ ዋጋ ያዘጋጁ።'
                  : 'Set one shared selling price for multiple products.'}
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
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
                <Tag className="h-4 w-4 text-berbere-500" />

                <h2 className="text-sm font-black text-coffee-700">
                  {isAm ? 'የቡድኑ መረጃ' : 'Group details'}
                </h2>
              </div>

              <p className="mt-1 text-xs text-coffee-400">
                {isAm
                  ? 'የዋጋ ቡድኑን ስም እና ዋጋ ያስገቡ።'
                  : 'Give the group a name and shared selling price.'}
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">

              {/* ENGLISH NAME */}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500">
                  {isAm ? 'የእንግሊዝኛ ስም' : 'English name'}
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Example: Small Beer"
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
                />
              </div>

              {/* AMHARIC NAME */}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500">
                  {isAm ? 'የአማርኛ ስም' : 'Amharic name'}
                </label>

                <input
                  type="text"
                  value={form.name_am}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name_am: event.target.value,
                    }))
                  }
                  placeholder="ለምሳሌ፦ ትንሽ ቢራ"
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
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
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
                  />

                  <span
                    className="
                      absolute right-4 top-1/2
                      -translate-y-1/2
                      text-xs font-black
                      text-coffee-400
                    "
                  >
                    ETB
                  </span>
                </div>

                <p className="text-[11px] text-coffee-400">
                  {isAm
                    ? 'ይህ ዋጋ ለተመረጡት ምርቶች የመሸጫ ዋጋ ይሆናል።'
                    : 'This price will become the selling price for the selected products.'}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              LIVE SUMMARY
          ================================================== */}

          <section
            className="
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
                  {displayGroupName}
                </h2>

                <p className="mt-1 text-xs font-medium text-cream-300">
                  {selected.length}{' '}
                  {isAm ? 'ምርቶች ተመርጠዋል' : 'products selected'}
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
            {/* SECTION HEADER */}

            <div className="border-b border-cream-200 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-berbere-500" />

                    <h2 className="text-sm font-black text-coffee-700">
                      {isAm
                        ? 'ምርቶችን ይመድቡ'
                        : 'Assign products'}
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-coffee-400">
                    {isAm
                      ? 'ይህን የዋጋ ቡድን የሚጠቀሙ ምርቶችን ይምረጡ።'
                      : 'Select the products that should use this price.'}
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
                  {selected.length}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">

              {/* SEARCH */}

              <div className="relative">
                <Search
                  className="
                    absolute left-4 top-1/2
                    h-4 w-4
                    -translate-y-1/2
                    text-coffee-300
                  "
                />

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

              {/* SELECT ALL BAR */}

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
                  {allFilteredSelected ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}

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
                  max-h-[360px]
                  overflow-y-auto
                  rounded-2xl
                  border border-cream-300
                "
              >
                {initialLoading ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-berbere-500" />

                      <p className="text-xs font-semibold text-coffee-400">
                        {isAm
                          ? 'ምርቶችን በመጫን ላይ...'
                          : 'Loading products...'}
                      </p>
                    </div>
                  </div>
                ) : filteredProducts.length === 0 ? (
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

                    {searchQuery && (
                      <p className="mt-1 text-[11px] text-coffee-300">
                        {isAm
                          ? 'ሌላ የፍለጋ ቃል ይሞክሩ።'
                          : 'Try a different search term.'}
                      </p>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const checked = selected.includes(product.id)

                    const displayName =
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
                          toggleProductSelection(product.id)
                        }
                        className={`
                          flex w-full items-center
                          justify-between gap-3
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
                            <CheckSquare
                              className="
                                h-5 w-5 shrink-0
                                text-berbere-500
                              "
                            />
                          ) : (
                            <Square
                              className="
                                h-5 w-5 shrink-0
                                text-cream-400
                              "
                            />
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
                              {displayName}
                            </p>

                            {secondaryName && (
                              <p className="mt-0.5 truncate text-[10px] font-medium text-coffee-300">
                                {secondaryName}
                              </p>
                            )}
                          </div>
                        </div>

                        {checked && (
                          <span
                            className="
                              shrink-0
                              rounded-lg
                              bg-berbere-500
                              px-2 py-1
                              text-[9px] font-black uppercase
                              tracking-wider
                              text-white
                            "
                          >
                            {isAm ? 'ተመርጧል' : 'Selected'}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* SELECTION INFO */}

              <div
                className="
                  mt-3
                  flex items-center gap-2
                  rounded-xl
                  border border-gold-200
                  bg-gold-50
                  px-3 py-2.5
                "
              >
                <Check
                  className="h-4 w-4 shrink-0 text-gold-600"
                />

                <p className="text-[11px] font-semibold leading-4 text-gold-700">
                  {selected.length > 0
                    ? isAm
                      ? `${selected.length} ምርት የዚህን የዋጋ ቡድን ይጠቀማል።`
                      : `${selected.length} product${selected.length === 1 ? '' : 's'} will use this price group.`
                    : isAm
                      ? 'አሁን ምርት ሳይመርጡም የዋጋ ቡድኑን መፍጠር ይችላሉ።'
                      : 'You can create the price group without assigning products yet.'}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <div className="sticky bottom-4 z-10">
            <button
              type="submit"
              disabled={loading || !isValidAmount}
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
                  ? 'የዋጋ ቡድን ፍጠር'
                  : 'Create Price Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
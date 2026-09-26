'use client'

import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react'
import { getEffectiveCatalog } from '@/lib/catalog/guard'

/* ============================================================
   TYPES
   ============================================================ */

export interface Product {
  id: string
  name: string
  available: number
  unit: string
  categoryId: string
  categoryName: string
}

export interface RecordTodaysSalesProps {
  locale: string
  businessName?: string
  isAm?: boolean
  products?: Product[]

  onBack?: () => void

  onSave?: (
    items: {
      productId: string
      quantity: number
    }[],
  ) => void
}

/* ============================================================
   CATEGORY ICONS

   These are only visual helpers.
   Your real categories come from the database.
   ============================================================ */

const CATEGORY_ICONS: Record<string, string> = {
  beer: '🍺',
  tej: '🍯',
  water: '💧',
  'soft-drinks': '🥤',
  food: '🍽️',
  coffee: '☕',
  default: '📦',
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function RecordTodaysSales({
  locale,
  businessName,
  isAm = false,
  products,
  onBack,
  onSave,
}: RecordTodaysSalesProps) {
  /*
   * locale and businessName are intentionally kept here.
   * They will be useful when this component is connected to
   * your real business/session data.
   */
  void locale
  void businessName

  const catalog = getEffectiveCatalog(products)

  /* ==========================================================
     STATE
     ========================================================== */

  const [search, setSearch] = useState('')

  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({})

  /*
   * A category is open unless explicitly set to false.
   *
   * Example:
   * {
   *   beer: false,
   *   water: true
   * }
   */
  const [openCategories, setOpenCategories] =
    useState<Record<string, boolean>>({})

  /* ==========================================================
     TRANSLATION HELPER
     ========================================================== */

  const t = (en: string, am: string) =>
    isAm ? am : en

  /* ==========================================================
     FILTER PRODUCTS
     ========================================================== */

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return catalog
    }

    return catalog.filter((product) => {
      const productName =
        product.name.toLowerCase()

      const categoryName =
        product.categoryName.toLowerCase()

      return (
        productName.includes(query) ||
        categoryName.includes(query)
      )
    })
  }, [catalog, search])

  /* ==========================================================
     GROUP PRODUCTS BY CATEGORY
     ========================================================== */

  const categories = useMemo(() => {
    const grouped: Record<
      string,
      Product[]
    > = {}

    for (const product of filteredProducts) {
      if (!grouped[product.categoryId]) {
        grouped[product.categoryId] = []
      }

      grouped[product.categoryId].push(product)
    }

    return Object.entries(grouped).map(
      ([categoryId, categoryProducts]) => ({
        id: categoryId,
        name:
          categoryProducts[0]?.categoryName ??
          categoryId,
        products: categoryProducts,
      }),
    )
  }, [filteredProducts])

  /* ==========================================================
     SELECTED ITEMS

     IMPORTANT:
     This uses the complete `products` array, NOT
     `filteredProducts`.

     Therefore, if the user searches for "Beer", selections
     made for Water are not lost.
     ========================================================== */

  const selectedItems = useMemo(() => {
    return catalog
      .map((product) => ({
        ...product,
        quantity:
          quantities[product.id] ?? 0,
      }))
      .filter(
        (product) => product.quantity > 0,
      )
  }, [catalog, quantities])

  /* ==========================================================
     TOTAL QUANTITY SOLD
     ========================================================== */

  const totalItems = useMemo(() => {
    return selectedItems.reduce(
      (total, product) =>
        total + product.quantity,
      0,
    )
  }, [selectedItems])

  /* ==========================================================
     UPDATE QUANTITY
     ========================================================== */

  const updateQuantity = (
    product: Product,
    change: number,
  ) => {
    setQuantities((current) => {
      const currentQuantity =
        current[product.id] ?? 0

      const nextQuantity = Math.max(
        0,
        Math.min(
          product.available,
          currentQuantity + change,
        ),
      )

      return {
        ...current,
        [product.id]: nextQuantity,
      }
    })
  }

  /* ==========================================================
     DIRECT QUANTITY ENTRY
     ========================================================== */

  const setQuantity = (
    product: Product,
    value: string,
  ) => {
    /*
     * Allow the user to temporarily clear the field.
     */
    if (value === '') {
      setQuantities((current) => ({
        ...current,
        [product.id]: 0,
      }))

      return
    }

    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
      return
    }

    const nextQuantity = Math.max(
      0,
      Math.min(
        product.available,
        Math.floor(parsed),
      ),
    )

    setQuantities((current) => ({
      ...current,
      [product.id]: nextQuantity,
    }))
  }

  /* ==========================================================
     CATEGORY OPEN / CLOSE

     FIXED VERSION

     Your previous code had:

       {
         current,
         [categoryId]: ...
       }

     That creates a property called `current`.

     It should be:

       {
         ...current,
         [categoryId]: ...
       }
     ========================================================== */

  const toggleCategory = (
    categoryId: string,
  ) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryId]:
        current[categoryId] === false,
    }))
  }

  /* ==========================================================
     SAVE
     ========================================================== */

  const handleSave = () => {
    if (selectedItems.length === 0) {
      return
    }

    const items = selectedItems.map(
      (item) => ({
        productId: item.id,
        quantity: item.quantity,
      }),
    )

    onSave?.(items)
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-cream-50 pb-28">
      {/* ======================================================
          HEADER
         ====================================================== */}

      <header
        className="
          sticky
          top-0
          z-20
          border-b
          border-cream-200
          bg-white/95
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-16
            max-w-3xl
            items-center
            gap-3
            px-4
          "
        >
          {/* BACK */}

          <button
            type="button"
            onClick={onBack}
            aria-label={t(
              'Back',
              'ተመለስ',
            )}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-cream-200
              bg-white
              text-coffee-600
              transition
              hover:bg-cream-50
              active:scale-95
            "
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* TITLE */}

          <div className="min-w-0 flex-1">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-coffee-400
              "
            >
              {t(
                'Close Day',
                'ቀኑን ዝጋ',
              )}
            </p>

            <h1
              className="
                truncate
                text-base
                font-black
                tracking-tight
                text-coffee-900
              "
            >
              {t(
                "Record Today's Sales",
                'የዛሬን ሽያጭ መዝግብ',
              )}
            </h1>
          </div>

          {/* ICON */}

          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-cream-100
              text-coffee-500
            "
          >
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* ======================================================
          CONTENT
         ====================================================== */}

      <div className="mx-auto max-w-3xl px-4 pt-5">
        {/* ====================================================
            INTRO
           ==================================================== */}

        <section className="mb-5">
          <h2
            className="
              text-xl
              font-black
              tracking-tight
              text-coffee-900
            "
          >
            {t(
              "Today's Sales",
              'የዛሬ ሽያጭ',
            )}
          </h2>

          <p
            className="
              mt-1
              text-sm
              leading-6
              text-coffee-500
            "
          >
            {t(
              'Enter how many of each product you sold today.',
              'ዛሬ ከእያንዳንዱ እቃ ስንት እንደተሸጠ ያስገቡ።',
            )}
          </p>
        </section>

        {/* ====================================================
            SEARCH
           ==================================================== */}

        <section className="mb-5">
          <div
            className="
              flex
              h-12
              items-center
              gap-3
              rounded-2xl
              border
              border-cream-200
              bg-white
              px-4
              shadow-sm
              focus-within:border-berbere-400
              focus-within:ring-2
              focus-within:ring-berbere-100
            "
          >
            <Search
              className="
                h-4
                w-4
                shrink-0
                text-coffee-400
              "
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t(
                'Search an item...',
                'እቃ ይፈልጉ...',
              )}
              className="
                min-w-0
                flex-1
                bg-transparent
                text-sm
                font-medium
                text-coffee-900
                outline-none
                placeholder:text-coffee-300
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t(
                  'Clear search',
                  'ፍለጋ አጽዳ',
                )}
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  text-coffee-400
                  hover:bg-cream-100
                "
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </section>

        {/* ====================================================
            CATEGORIES
           ==================================================== */}

        <section>
          {categories.length === 0 ? (
            /* NO CATALOG */

            <div
              className="
                rounded-2xl
                border
                border-dashed
                border-cream-300
                bg-white
                px-5
                py-10
                text-center
              "
            >
              <ShoppingBag
                className="
                  mx-auto
                  h-6
                  w-6
                  text-coffee-300
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-bold
                  text-coffee-700
                "
              >
                {t(
                  'No products available',
                  'ምንም ምርቶች የሉም',
                )}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-coffee-400
                "
              >
                {t(
                  'Add your product catalog first, then record sales.',
                  'ምርት ዝርዝር ካስገቡ በኋላ ሽያጭ ይመዘገባል።',
                )}
              </p>
            </div>
          ) : (
            /* CATEGORY LIST */

            <div className="space-y-3">
              {categories.map((category) => {
                /*
                 * During search, automatically open matching
                 * categories.
                 *
                 * Without search:
                 * category is open unless explicitly closed.
                 */
                const isOpen =
                  search.trim().length > 0 ||
                  openCategories[
                    category.id
                  ] !== false

                /*
                 * Calculate how many items from this category
                 * have been entered as sold.
                 */
                const categorySold =
                  category.products.reduce(
                    (total, product) =>
                      total +
                      (quantities[
                        product.id
                      ] ?? 0),
                    0,
                  )

                return (
                  <div
                    key={category.id}
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-cream-200
                      bg-white
                      shadow-sm
                    "
                  >
                    {/* ========================================
                        CATEGORY HEADER
                       ======================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleCategory(
                          category.id,
                        )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        px-4
                        py-4
                        text-left
                        transition
                        hover:bg-cream-50
                        active:bg-cream-100
                      "
                    >
                      {/* ICON */}

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-cream-100
                          text-lg
                        "
                      >
                        {CATEGORY_ICONS[
                          category.id
                        ] ??
                          CATEGORY_ICONS.default}
                      </div>

                      {/* NAME */}

                      <div className="min-w-0 flex-1">
                        <p
                          className="
                            text-sm
                            font-black
                            text-coffee-900
                          "
                        >
                          {category.name}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            text-coffee-400
                          "
                        >
                          {category.products.length}{' '}
                          {t(
                            category.products.length ===
                              1
                              ? 'item'
                              : 'items',
                            'እቃዎች',
                          )}

                          {categorySold > 0 && (
                            <>
                              {' · '}

                              <span
                                className="
                                  font-bold
                                  text-berbere-600
                                "
                              >
                                {categorySold}{' '}
                                {t(
                                  'sold',
                                  'ተሸጧል',
                                )}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* ARROW */}

                      <ChevronDown
                        className={`
                          h-5
                          w-5
                          shrink-0
                          text-coffee-400
                          transition-transform
                          duration-200
                          ${
                            isOpen
                              ? 'rotate-180'
                              : ''
                          }
                        `}
                      />
                    </button>

                    {/* ========================================
                        PRODUCTS
                       ======================================== */}

                    {isOpen && (
                      <div className="border-t border-cream-100">
                        {category.products.map(
                          (
                            product,
                            index,
                          ) => {
                            const quantity =
                              quantities[
                                product.id
                              ] ?? 0

                            const isSelected =
                              quantity > 0

                            const isLast =
                              index ===
                              category.products
                                .length -
                                1

                            return (
                              <div
                                key={
                                  product.id
                                }
                                className={`
                                  px-4
                                  py-4
                                  ${
                                    !isLast
                                      ? 'border-b border-cream-100'
                                      : ''
                                  }
                                `}
                              >
                                <div className="flex items-center gap-3">
                                  {/* PRODUCT INFO */}

                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="
                                        truncate
                                        text-sm
                                        font-black
                                        text-coffee-900
                                      "
                                    >
                                      {
                                        product.name
                                      }
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        text-xs
                                        text-coffee-400
                                      "
                                    >
                                      {t(
                                        'Available',
                                        'ያለው',
                                      )}{' '}

                                      <span
                                        className="
                                          font-bold
                                          text-coffee-600
                                        "
                                      >
                                        {
                                          product.available
                                        }
                                      </span>{' '}

                                      {product.unit}
                                    </p>
                                  </div>

                                  {/* QUANTITY CONTROL */}

                                  <div
                                    className="
                                      flex
                                      h-11
                                      shrink-0
                                      items-center
                                      rounded-xl
                                      border
                                      border-cream-200
                                      bg-cream-50
                                    "
                                  >
                                    {/* MINUS */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(
                                          product,
                                          -1,
                                        )
                                      }
                                      disabled={
                                        quantity <=
                                        0
                                      }
                                      aria-label={t(
                                        `Decrease ${product.name}`,
                                        `${product.name} ቀንስ`,
                                      )}
                                      className="
                                        flex
                                        h-11
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-l-xl
                                        text-coffee-500
                                        transition
                                        hover:bg-white
                                        disabled:cursor-not-allowed
                                        disabled:opacity-30
                                      "
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>

                                    {/* NUMBER */}

                                    <input
                                      inputMode="numeric"
                                      value={
                                        quantity ||
                                        ''
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setQuantity(
                                          product,
                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      placeholder="0"
                                      aria-label={t(
                                        `${product.name} quantity sold`,
                                        `${product.name} የተሸጠ ብዛት`,
                                      )}
                                      className={`
                                        h-11
                                        w-12
                                        border-x
                                        border-cream-200
                                        bg-transparent
                                        text-center
                                        text-base
                                        font-black
                                        outline-none
                                        ${
                                          isSelected
                                            ? 'text-berbere-600'
                                            : 'text-coffee-700'
                                        }
                                      `}
                                    />

                                    {/* PLUS */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(
                                          product,
                                          1,
                                        )
                                      }
                                      disabled={
                                        quantity >=
                                        product.available
                                      }
                                      aria-label={t(
                                        `Increase ${product.name}`,
                                        `${product.name} ጨምር`,
                                      )}
                                      className="
                                        flex
                                        h-11
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-r-xl
                                        text-coffee-500
                                        transition
                                        hover:bg-white
                                        disabled:cursor-not-allowed
                                        disabled:opacity-30
                                      "
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* SELECTED MESSAGE */}

                                {isSelected && (
                                  <div
                                    className="
                                      mt-3
                                      flex
                                      items-center
                                      gap-1.5
                                      text-xs
                                      font-bold
                                      text-berbere-600
                                    "
                                  >
                                    <Check className="h-3.5 w-3.5" />

                                    {quantity}{' '}
                                    {
                                      product.unit
                                    }{' '}
                                    {t(
                                      'sold',
                                      'ተሸጧል',
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          },
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ====================================================
            SUMMARY
           ==================================================== */}

        <section className="mt-5">
          <div
            className="
              rounded-2xl
              border
              border-cream-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-coffee-400
                  "
                >
                  {t(
                    "Today's total",
                    'የዛሬ ጠቅላላ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-black
                    text-coffee-900
                  "
                >
                  {totalItems}
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-cream-100
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-coffee-600
                "
              >
                {selectedItems.length}{' '}
                {t(
                  selectedItems.length === 1
                    ? 'product'
                    : 'products',
                  'እቃዎች',
                )}
              </div>
            </div>

            {/* EMPTY */}

            {selectedItems.length === 0 ? (
              <p
                className="
                  mt-2
                  text-xs
                  text-coffee-400
                "
              >
                {t(
                  'Enter the quantities you sold today.',
                  'ዛሬ የሸጡትን ብዛት ያስገቡ።',
                )}
              </p>
            ) : (
              /* SELECTED LIST */

              <div className="mt-3 space-y-1">
                {selectedItems.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        text-xs
                      "
                    >
                      <span className="truncate text-coffee-500">
                        {item.name}
                      </span>

                      <span
                        className="
                          shrink-0
                          font-black
                          text-coffee-800
                        "
                      >
                        {item.quantity}{' '}
                        {item.unit}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ======================================================
          BOTTOM SAVE ACTION
         ====================================================== */}

      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-30
          border-t
          border-cream-200
          bg-white/95
          px-4
          py-3
          backdrop-blur
        "
      >
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              selectedItems.length === 0
            }
            className="
              flex
              h-12
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-berbere-500
              px-5
              text-sm
              font-black
              text-white
              shadow-sm
              transition
              hover:bg-berbere-600
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:bg-coffee-200
              disabled:text-coffee-400
              disabled:shadow-none
            "
          >
            <Check className="h-4 w-4" />

            {selectedItems.length > 0
              ? t(
                  `Save ${totalItems} Sold`,
                  `${totalItems} የተሸጠ አስቀምጥ`,
                )
              : t(
                  "Save Today's Sales",
                  'የዛሬን ሽያጭ አስቀምጥ',
                )}
          </button>
        </div>
      </div>
    </main>
  )
}
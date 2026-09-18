// src/app/[locale]/(app)/management/price-group/page.tsx

'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  useParams,
  useRouter,
} from 'next/navigation'

import {
  ArrowLeft,
  Coins,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { getBusinessId } from '@/lib/auth/getBusinessId'
import {
  deletePriceGroup,
  getPriceGroups,
} from '@/queries/usePriceGroupQueries'

// ============================================================
// TYPES
// ============================================================

interface PriceGroupProduct {
  id: string
  name: string
}

interface PriceGroup {
  id: string
  name: string
  name_am: string | null
  amount: number
  is_active: boolean
  updated_at?: string | null
  products?: PriceGroupProduct[]
}

// ============================================================
// PAGE
// ============================================================

export default function PriceGroupsPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params?.locale ?? 'am')
  const isAm = locale === 'am'

  const [groups, setGroups] = useState<PriceGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewGroup, setPreviewGroup] =
    useState<PriceGroup | null>(null)

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true)

      const businessId = await getBusinessId()

      if (!businessId) {
        throw new Error('Business ID is required')
      }

      const data = await getPriceGroups(businessId)

      setGroups((data ?? []) as PriceGroup[])
    } catch (error) {
      console.error(
        '[PriceGroupsPage] Failed to load price groups:',
        error
      )

      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  // ==========================================================
  // CLOSE PREVIEW WITH ESCAPE
  // ==========================================================

  useEffect(() => {
    if (!previewGroup) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewGroup(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewGroup])

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      isAm
        ? 'ይህን የዋጋ ቡድን ለመሰረዝ እርግጠኛ ነዎት?'
        : 'Delete this price group?'
    )

    if (!confirmed) return

    try {
      setDeletingId(id)

      await deletePriceGroup(id)

      setGroups((current) =>
        current.filter((group) => group.id !== id)
      )

      setPreviewGroup((current) =>
        current?.id === id ? null : current
      )
    } catch (error) {
      console.error(
        '[PriceGroupsPage] Delete failed:',
        error
      )

      window.alert(
        isAm
          ? 'የዋጋ ቡድኑን መሰረዝ አልተቻለም።'
          : 'Failed to delete the price group.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-cream-100">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-50">
            <Loader2 className="h-5 w-5 animate-spin text-berbere-500" />
          </div>

          <p className="text-xs font-semibold text-coffee-400">
            {isAm
              ? 'በመጫን ላይ...'
              : 'Loading price groups...'}
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">

        {/* ====================================================
            TOP BAR
        ===================================================== */}

        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/${locale}/management`)
            }
            className="
              inline-flex items-center gap-2
              rounded-xl px-2.5 py-2
              text-sm font-bold
              text-coffee-700
              transition
              hover:bg-white
              hover:text-berbere-600
            "
          >
            <ArrowLeft className="h-4 w-4" />

            <span>
              {isAm ? 'ተመለስ' : 'Back'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/price-groups/new`
              )
            }
            className="
              inline-flex items-center gap-2
              rounded-xl
              bg-berbere-500
              px-4 py-2.5
              text-xs font-black
              text-white
              shadow-sm
              transition
              hover:bg-berbere-600
              active:scale-[0.98]
            "
          >
            <Plus className="h-4 w-4" />

            <span>
              {isAm ? 'አዲስ ቡድን' : 'New Group'}
            </span>
          </button>
        </div>

        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex items-center gap-3">
          <div
            className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-2xl
              bg-coffee-700
              shadow-sm
            "
          >
            <Coins className="h-6 w-6 text-gold-400" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-coffee-700 sm:text-2xl">
              {isAm ? 'የዋጋ ቡድኖች' : 'Price Groups'}
            </h1>

            <p className="mt-0.5 text-xs font-medium text-coffee-400 sm:text-sm">
              {isAm
                ? 'የተለያዩ ምርቶችን በቡድን ዋጋ ያስተዳድሩ'
                : 'Manage shared pricing across products'}
            </p>
          </div>
        </div>

        {/* ====================================================
            SUMMARY
        ===================================================== */}

        <div
          className="
            mb-7
            overflow-hidden
            rounded-3xl
            bg-coffee-700
            shadow-sm
          "
        >
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                {isAm ? 'የዋጋ ቡድኖች' : 'Price Groups'}
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {groups.length}
              </p>

              <p className="mt-1 text-xs font-medium text-white/65">
                {isAm
                  ? 'የተፈጠሩ የዋጋ ቡድኖች'
                  : 'Configured pricing groups'}
              </p>
            </div>

            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-2xl
                bg-gold-400/10
              "
            >
              <Layers className="h-6 w-6 text-gold-400" />
            </div>
          </div>
        </div>

        {/* ====================================================
            EMPTY STATE
        ===================================================== */}

        {groups.length === 0 ? (
          <div
            className="
              rounded-3xl
              border border-cream-200
              bg-white
              px-6 py-12
              text-center
              shadow-sm
            "
          >
            <div
              className="
                mx-auto mb-4
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                bg-berbere-50
              "
            >
              <Coins className="h-7 w-7 text-berbere-500" />
            </div>

            <h2 className="text-base font-black text-coffee-700">
              {isAm
                ? 'እስካሁን የዋጋ ቡድን የለም'
                : 'No price groups yet'}
            </h2>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-coffee-400">
              {isAm
                ? 'የምርቶችን ዋጋ በቡድን ለማስተዳደር የመጀመሪያዎን ቡድን ይፍጠሩ።'
                : 'Create a price group to manage shared pricing across products.'}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${locale}/management/price-groups/new`
                )
              }
              className="
                mt-5
                inline-flex items-center gap-2
                rounded-xl
                bg-berbere-500
                px-4 py-2.5
                text-xs font-black
                text-white
                transition
                hover:bg-berbere-600
              "
            >
              <Plus className="h-4 w-4" />

              {isAm
                ? 'የመጀመሪያ ቡድን ይፍጠሩ'
                : 'Create First Group'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">

            {/* ==================================================
                SECTION LABEL
            =================================================== */}

            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-coffee-400">
                {isAm
                  ? 'የዋጋ ቡድኖች'
                  : 'Your Price Groups'}
              </h2>

              <span className="text-[11px] font-bold text-coffee-300">
                {groups.length}
              </span>
            </div>

            {/* ==================================================
                GROUP CARDS
            =================================================== */}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const productCount =
                  group.products?.length ?? 0

                const displayName =
                  isAm
                    ? group.name_am || group.name
                    : group.name

                const secondaryName =
                  isAm
                    ? group.name
                    : group.name_am

                const isDeleting =
                  deletingId === group.id

                return (
                  <div
                    key={group.id}
                    className="
                      overflow-hidden
                      rounded-2xl
                      border border-cream-200
                      bg-white
                      shadow-sm
                      transition
                      hover:-translate-y-0.5
                      hover:border-cream-300
                      hover:shadow-md
                    "
                  >
                    {/* CARD CONTENT */}

                    <button
                      type="button"
                      onClick={() => setPreviewGroup(group)}
                      className="
                        w-full
                        p-4
                        text-left
                        transition
                        hover:bg-cream-50
                        focus:outline-none
                        focus:ring-2
                        focus:ring-inset
                        focus:ring-gold-400
                      "
                    >
                      <div className="flex items-start gap-3">

                        {/* ICON */}

                        <div
                          className="
                            flex h-11 w-11 shrink-0
                            items-center justify-center
                            rounded-xl
                            bg-berbere-50
                          "
                        >
                          <Coins className="h-5 w-5 text-berbere-500" />
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-coffee-700">
                                {displayName}
                              </h3>

                              {secondaryName && (
                                <p className="mt-0.5 truncate text-[11px] font-medium text-coffee-300">
                                  {secondaryName}
                                </p>
                              )}
                            </div>

                            {/* PRICE */}

                            <div className="shrink-0 text-right">
                              <p className="text-lg font-black text-berbere-500">
                                {Number(group.amount).toFixed(2)}
                              </p>

                              <p className="text-[10px] font-bold text-coffee-300">
                                ETB
                              </p>
                            </div>
                          </div>

                          {/* META */}

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-coffee-400">
                              <Layers className="h-3.5 w-3.5 text-gold-400" />

                              {productCount}{' '}
                              {isAm
                                ? 'ምርቶች'
                                : 'products'}
                            </span>

                            <span
                              className={`
                                inline-flex items-center gap-1.5
                                text-[11px] font-bold
                                ${
                                  group.is_active
                                    ? 'text-emerald-700'
                                    : 'text-coffee-300'
                                }
                              `}
                            >
                              <span
                                className={`
                                  h-1.5 w-1.5 rounded-full
                                  ${
                                    group.is_active
                                      ? 'bg-emerald-500'
                                      : 'bg-coffee-300'
                                  }
                                `}
                              />

                              {group.is_active
                                ? isAm
                                  ? 'ንቁ'
                                  : 'Active'
                                : isAm
                                  ? 'ያልነቃ'
                                  : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* ACTIONS */}

                    <div className="grid grid-cols-2 border-t border-cream-200">

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          router.push(
                            `/${locale}/management/price-groups/${group.id}/edit`
                          )
                        }
                        className="
                          flex items-center justify-center gap-2
                          py-3
                          text-gold-600
                          transition
                          hover:bg-gold-50
                          disabled:opacity-50
                        "
                      >
                        <Edit2 className="h-4 w-4" />

                        <span className="text-xs font-black">
                          {isAm ? 'አርም' : 'Edit'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          void handleDelete(group.id)
                        }
                        className="
                          flex items-center justify-center gap-2
                          border-l border-cream-200
                          py-3
                          text-berbere-600
                          transition
                          hover:bg-berbere-50
                          disabled:opacity-50
                        "
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}

                        <span className="text-xs font-black">
                          {isDeleting
                            ? isAm
                              ? 'በመሰረዝ...'
                              : 'Deleting...'
                            : isAm
                              ? 'ሰርዝ'
                              : 'Delete'}
                        </span>
                      </button>

                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          PREVIEW
          Mobile: bottom sheet
          Desktop: centered dialog
      ======================================================= */}

      {previewGroup && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-end justify-center
            bg-coffee-900/45
            p-0
            backdrop-blur-[2px]
            sm:items-center
            sm:p-6
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            isAm
              ? 'የዋጋ ቡድን ዝርዝር'
              : 'Price group details'
          }
        >
          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreviewGroup(null)}
            className="absolute inset-0 cursor-default"
          />

          {/* ==================================================
              MODAL / SHEET
          =================================================== */}

          <div
            className="
              relative
              flex w-full flex-col
              overflow-hidden
              rounded-t-3xl
              bg-cream-100
              shadow-2xl
              sm:max-w-xl
              sm:rounded-3xl
              lg:max-w-2xl
            "
          >
            {/* HEADER */}

            <div className="shrink-0 border-b border-cream-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      rounded-xl
                      bg-coffee-700
                    "
                  >
                    <Coins className="h-5 w-5 text-gold-400" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-coffee-700">
                      {isAm
                        ? previewGroup.name_am ||
                          previewGroup.name
                        : previewGroup.name}
                    </h3>

                    <p className="mt-0.5 truncate text-[11px] font-medium text-coffee-300">
                      {isAm
                        ? previewGroup.name
                        : previewGroup.name_am ||
                          'Price group'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewGroup(null)}
                  className="
                    flex h-9 w-9 shrink-0
                    items-center justify-center
                    rounded-xl
                    bg-cream-100
                    text-coffee-400
                    transition
                    hover:bg-cream-200
                    hover:text-coffee-700
                  "
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CONTENT */}

            <div className="max-h-[78vh] overflow-y-auto p-5 sm:max-h-[75vh] sm:p-6">

              {/* ==================================================
                  SUMMARY
              =================================================== */}

              <div className="grid grid-cols-2 gap-3">

                <div
                  className="
                    rounded-2xl
                    border border-cream-200
                    bg-white
                    p-4
                  "
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-coffee-300">
                    {isAm ? 'ዋጋ' : 'Price'}
                  </p>

                  <p className="mt-1 text-xl font-black text-berbere-500">
                    {Number(previewGroup.amount).toFixed(2)}
                  </p>

                  <p className="text-[10px] font-bold text-coffee-300">
                    ETB
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    border border-cream-200
                    bg-white
                    p-4
                  "
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-coffee-300">
                    {isAm ? 'ምርቶች' : 'Products'}
                  </p>

                  <p className="mt-1 text-xl font-black text-coffee-700">
                    {previewGroup.products?.length ?? 0}
                  </p>

                  <p className="text-[10px] font-bold text-coffee-300">
                    {isAm
                      ? 'በዚህ ቡድን'
                      : 'linked to group'}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  PRODUCTS
              =================================================== */}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-[0.12em] text-coffee-400">
                    {isAm
                      ? 'የተገናኙ ምርቶች'
                      : 'Linked Products'}
                  </h4>

                  <span className="text-[11px] font-bold text-coffee-300">
                    {previewGroup.products?.length ?? 0}
                  </span>
                </div>

                {(previewGroup.products?.length ?? 0) === 0 ? (
                  <div
                    className="
                      rounded-2xl
                      border border-dashed border-cream-300
                      bg-white
                      p-6
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        flex h-11 w-11
                        items-center justify-center
                        rounded-xl
                        bg-cream-100
                      "
                    >
                      <Layers className="h-5 w-5 text-coffee-300" />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-coffee-400">
                      {isAm
                        ? 'ምንም ምርት አልተመደበም'
                        : 'No products assigned'}
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      rounded-2xl
                      border border-cream-200
                      bg-white
                      p-4
                    "
                  >
                    <div className="flex flex-wrap gap-2">
                      {previewGroup.products
                        ?.slice(0, 12)
                        .map((product) => (
                          <span
                            key={product.id}
                            className="
                              rounded-lg
                              bg-berbere-50
                              px-2.5 py-1.5
                              text-[11px] font-bold
                              text-berbere-600
                            "
                          >
                            {product.name}
                          </span>
                        ))}
                    </div>

                    {(previewGroup.products?.length ?? 0) >
                      12 && (
                      <p className="mt-3 text-[11px] font-bold text-coffee-300">
                        +
                        {previewGroup.products!.length -
                          12}{' '}
                        {isAm
                          ? 'ተጨማሪ ምርቶች'
                          : 'more products'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ==================================================
                  STATUS
              =================================================== */}

              <div className="mt-4">
                <div
                  className={`
                    rounded-2xl
                    border
                    p-4
                    ${
                      previewGroup.is_active
                        ? 'border-gold-200 bg-gold-50'
                        : 'border-cream-200 bg-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        h-2 w-2 rounded-full
                        ${
                          previewGroup.is_active
                            ? 'bg-emerald-500'
                            : 'bg-coffee-300'
                        }
                      `}
                    />

                    <p
                      className={`
                        text-xs font-bold
                        ${
                          previewGroup.is_active
                            ? 'text-coffee-700'
                            : 'text-coffee-400'
                        }
                      `}
                    >
                      {previewGroup.is_active
                        ? isAm
                          ? 'ይህ የዋጋ ቡድን ንቁ ነው።'
                          : 'This price group is active.'
                        : isAm
                          ? 'ይህ የዋጋ ቡድን ንቁ አይደለም።'
                          : 'This price group is inactive.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  LAST UPDATED
              =================================================== */}

              {previewGroup.updated_at && (
                <p className="mt-4 text-center text-[10px] font-medium text-coffee-300">
                  {isAm
                    ? 'የመጨረሻ ማሻሻያ'
                    : 'Last updated'}{' '}
                  ·{' '}
                  {new Date(
                    previewGroup.updated_at
                  ).toLocaleString()}
                </p>
              )}
            </div>

            {/* ==================================================
                FOOTER ACTIONS
            =================================================== */}

            <div className="shrink-0 border-t border-cream-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() => {
                    const id = previewGroup.id

                    setPreviewGroup(null)

                    router.push(
                      `/${locale}/management/price-groups/${id}/edit`
                    )
                  }}
                  className="
                    flex items-center justify-center gap-2
                    rounded-xl
                    bg-gold-400
                    px-4 py-3
                    text-xs font-black
                    text-coffee-700
                    transition
                    hover:bg-gold-500
                  "
                >
                  <Edit2 className="h-4 w-4" />

                  {isAm ? 'አርም' : 'Edit'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleDelete(previewGroup.id)
                  }
                  disabled={
                    deletingId === previewGroup.id
                  }
                  className="
                    flex items-center justify-center gap-2
                    rounded-xl
                    border border-berbere-200
                    bg-white
                    px-4 py-3
                    text-xs font-black
                    text-berbere-600
                    transition
                    hover:bg-berbere-50
                    disabled:opacity-50
                  "
                >
                  {deletingId === previewGroup.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}

                  {deletingId === previewGroup.id
                    ? isAm
                      ? 'በመሰረዝ...'
                      : 'Deleting...'
                    : isAm
                      ? 'ሰርዝ'
                      : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
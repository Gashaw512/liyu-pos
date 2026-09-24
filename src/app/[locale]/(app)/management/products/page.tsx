// src/app/[locale]/(app)/management/products/page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";

import { getBusinessId } from "@/lib/auth/getBusinessId";

import {
  deleteProduct,
  getProducts,
} from "@/queries/useProductsQuery";

import type { ProductListItem } from "@/queries/useProductsQuery";

export default function ProductsPage() {
  const router = useRouter();
  const params = useParams();

  const locale = String(params?.locale ?? "am");
  const isAm = locale === "am";

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ============================================================
     LOAD PRODUCTS
  ============================================================ */

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const businessId = await getBusinessId();

      if (!businessId) {
        throw new Error(
          isAm
            ? "የንግድ መረጃ አልተገኘም"
            : "Missing business session",
        );
      }

      const data = await getProducts(businessId);

      setProducts(data);
    } catch (err: unknown) {
      console.error("[ProductsPage] Load products error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isAm
            ? "ምርቶችን መጫን አልተቻለም"
            : "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  }, [isAm]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /* ============================================================
     FILTER PRODUCTS
  ============================================================ */

  const query = search.trim().toLowerCase();

  const filteredProducts = query
    ? products.filter((product) => {
        const name = product.name?.toLowerCase() ?? "";
        const nameAm = product.name_am?.toLowerCase() ?? "";
        const category = product.category_name?.toLowerCase() ?? "";
        const categoryAm =
          product.category_name_am?.toLowerCase() ?? "";
        const barcode = product.barcode?.toLowerCase() ?? "";
        const sku = product.sku?.toLowerCase() ?? "";
        const price = String(product.retail_price ?? "");

        return (
          name.includes(query) ||
          nameAm.includes(query) ||
          category.includes(query) ||
          categoryAm.includes(query) ||
          barcode.includes(query) ||
          sku.includes(query) ||
          price.includes(query)
        );
      })
    : products;

  /* ============================================================
     SUMMARY
  ============================================================ */

  const activeCount = products.filter(
    (product) => product.is_active,
  ).length;

  const inactiveCount = products.length - activeCount;

  /* ============================================================
     DELETE PRODUCT
  ============================================================ */

  const handleDelete = async (id: string) => {
    const product = products.find(
      (item) => item.id === id,
    );

    if (!product) {
      return;
    }

    const confirmed = window.confirm(
      isAm
        ? `“${product.name}” ምርትን ማስወገድ ይፈልጋሉ?`
        : `Remove “${product.name}” from your products?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      const businessId = await getBusinessId();

      if (!businessId) {
        throw new Error(
          isAm
            ? "የንግድ መረጃ አልተገኘም"
            : "Missing business session",
        );
      }

      await deleteProduct(id, businessId);

      setProducts((current) =>
        current.filter((item) => item.id !== id),
      );
    } catch (err: unknown) {
      console.error(
        "[ProductsPage] Delete product error:",
        err,
      );

      window.alert(
        err instanceof Error
          ? err.message
          : isAm
            ? "ምርቱን ማስወገድ አልተሳካም"
            : "Failed to remove product",
      );

      await loadProducts();
    } finally {
      setDeletingId(null);
    }
  };

  /* ============================================================
     LOADING STATE
  ============================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 px-4 py-12">
        <div className="mx-auto flex min-h-[50vh] w-full max-w-5xl items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-50">
              <Loader2 className="h-5 w-5 animate-spin text-berbere-600" />
            </div>

            <p className="text-xs font-bold text-coffee-400">
              {isAm
                ? "ምርቶች በመጫን ላይ..."
                : "Loading products..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     ERROR STATE
  ============================================================ */

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 px-4 py-10">
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-berbere-100 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-50">
              <AlertTriangle className="h-5 w-5 text-berbere-500" />
            </div>

            <h1 className="mt-4 text-sm font-black text-coffee-900">
              {isAm
                ? "ምርቶችን መጫን አልተቻለም"
                : "Could not load products"}
            </h1>

            <p className="mt-1 text-xs leading-5 text-coffee-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadProducts()}
              className="mt-5 rounded-xl bg-coffee-900 px-5 py-2.5 text-xs font-black text-white transition hover:bg-coffee-800"
            >
              {isAm ? "እንደገና ሞክር" : "Try again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <div className="min-h-screen w-full bg-cream-50 pb-28">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6">

        {/* ======================================================
           TOP BAR
        ====================================================== */}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/${locale}/management`)
            }
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-coffee-500 transition hover:bg-white hover:text-coffee-900"
          >
            <ArrowLeft className="h-4 w-4" />

            {isAm ? "ተመለስ" : "Back"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/products/new`,
              )
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-coffee-900 px-3.5 text-xs font-black text-white shadow-sm transition hover:bg-coffee-800 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />

            {isAm ? "አዲስ ምርት" : "Add product"}
          </button>
        </div>

        {/* ======================================================
           HEADER
        ====================================================== */}

        <header className="mt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-berbere-50">
              <Package className="h-5 w-5 text-berbere-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-coffee-900">
                {isAm ? "ምርቶች" : "Products"}
              </h1>

              <p className="mt-0.5 text-xs leading-5 text-coffee-400">
                {isAm
                  ? "የሚሸጡ ምርቶችን እና የምርት መረጃን ያስተዳድሩ።"
                  : "Manage the products your business sells."}
              </p>
            </div>
          </div>
        </header>

        {/* ======================================================
           SUMMARY
        ====================================================== */}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-md">
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
              {isAm ? "ሁሉም" : "Total"}
            </p>

            <p className="mt-1 text-lg font-black text-coffee-900">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-coffee-400">
              {isAm ? "ንቁ" : "Active"}
            </p>

            <p className="mt-1 text-lg font-black text-berbere-600">
              {activeCount}
            </p>

            {inactiveCount > 0 && (
              <p className="mt-0.5 text-[10px] font-bold text-coffee-400">
                {inactiveCount}{" "}
                {isAm ? "ያልነቁ" : "inactive"}
              </p>
            )}
          </div>
        </div>

        {/* ======================================================
           SEARCH
        ====================================================== */}

        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={
                isAm
                  ? "ምርት፣ ምድብ፣ SKU ወይም ባርኮድ ይፈልጉ..."
                  : "Search products, categories, SKU or barcode..."
              }
              className="h-11 w-full rounded-xl border border-cream-200 bg-white pl-10 pr-10 text-sm font-medium text-coffee-900 outline-none transition placeholder:text-coffee-300 focus:border-berbere-300 focus:ring-2 focus:ring-berbere-50"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={
                  isAm ? "ፍለጋ አጽዳ" : "Clear search"
                }
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-coffee-400 hover:bg-cream-50 hover:text-coffee-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================
           RESULT COUNT
        ====================================================== */}

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-coffee-400">
            {isAm ? "ምርት ዝርዝር" : "Product list"}
          </p>

          <p className="text-[11px] font-bold text-coffee-400">
            {filteredProducts.length}

            {search
              ? isAm
                ? " ውጤት"
                : " results"
              : isAm
                ? " ምርቶች"
                : " products"}
          </p>
        </div>

        {/* ======================================================
           PRODUCT LIST
        ====================================================== */}

        <div className="mt-2 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => {
              const isInactive = !product.is_active;
              const isGroup = product.price_type === "group";
              const isDeleting = deletingId === product.id;

              return (
                <div key={product.id}>
                  <div
                    className={`group px-3.5 py-3.5 sm:px-4 ${
                      isInactive ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">

                      {/* IMAGE */}

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cream-200 bg-cream-50">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-coffee-300" />
                        )}
                      </div>

                      {/* PRODUCT INFO */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-black text-coffee-900">
                            {product.name}
                          </h3>

                          {isInactive && (
                            <span className="shrink-0 rounded-full bg-berbere-50 px-1.5 py-0.5 text-[9px] font-black text-berbere-600">
                              {isAm ? "ዝግ" : "Inactive"}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium text-coffee-400">
                            <Tag className="h-3 w-3 shrink-0" />

                            <span className="truncate">
                              {isAm
                                ? product.category_name_am ||
                                  product.category_name ||
                                  "ምድብ የለም"
                                : product.category_name ||
                                  "No category"}
                            </span>
                          </span>

                          {isGroup && (
                            <>
                              <span className="text-coffee-200">
                                •
                              </span>

                              <span className="shrink-0 text-[10px] font-black text-berbere-600">
                                {isAm
                                  ? "ቡድን ዋጋ"
                                  : "Group price"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* PRICE */}

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-coffee-900">
                          {Number(
                            product.retail_price ?? 0,
                          ).toLocaleString()}
                        </p>

                        <p className="text-[9px] font-bold uppercase tracking-wide text-coffee-300">
                          ETB
                        </p>
                      </div>

                      {/* EDIT */}

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          router.push(
                            `/${locale}/management/products/${product.id}/edit`,
                          )
                        }
                        aria-label={
                          isAm
                            ? "ምርት አስተካክል"
                            : "Edit product"
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-50 text-coffee-500 transition hover:bg-berbere-50 hover:text-berbere-600 disabled:opacity-40"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* SECONDARY ROW */}

                    <div className="mt-2.5 flex items-center justify-between gap-3 pl-[60px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black ${
                            isGroup
                              ? "bg-berbere-50 text-berbere-700"
                              : "bg-cream-100 text-coffee-500"
                          }`}
                        >
                          {isGroup
                            ? isAm
                              ? "የቡድን ዋጋ"
                              : "GROUP"
                            : isAm
                              ? "ቀጥታ ዋጋ"
                              : "FIXED"}
                        </span>

                        {product.track_inventory && (
                          <span className="rounded-full bg-cream-100 px-2 py-1 text-[9px] font-black text-coffee-500">
                            {isAm ? "ክምችት" : "STOCK"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          void handleDelete(product.id)
                        }
                        className="text-[10px] font-bold text-coffee-400 transition hover:text-berbere-600 disabled:opacity-40"
                      >
                        {isDeleting
                          ? isAm
                            ? "በማስወገድ ላይ..."
                            : "Removing..."
                          : isAm
                            ? "አስወግድ"
                            : "Remove"}
                      </button>
                    </div>
                  </div>

                  {/* DIVIDER */}

                  {index < filteredProducts.length - 1 && (
                    <div className="mx-3.5 border-b border-cream-100 sm:mx-4" />
                  )}
                </div>
              );
            })
          ) : (
            /* ==================================================
               EMPTY STATE
            ================================================== */

            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50">
                {search ? (
                  <Search className="h-5 w-5 text-coffee-300" />
                ) : (
                  <Package className="h-5 w-5 text-coffee-300" />
                )}
              </div>

              <h2 className="mt-4 text-sm font-black text-coffee-900">
                {search
                  ? isAm
                    ? "ምንም ውጤት የለም"
                    : "No matching products"
                  : isAm
                    ? "ምርት የለም"
                    : "No products yet"}
              </h2>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-coffee-400">
                {search
                  ? isAm
                    ? "ሌላ የፍለጋ ቃል ይሞክሩ።"
                    : "Try a different product, category, SKU or barcode."
                  : isAm
                    ? "የመጀመሪያዎን ምርት ይጨምሩ።"
                    : "Add your first product to get started."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/${locale}/management/products/new`,
                    )
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-berbere-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-berbere-600"
                >
                  <Plus className="h-4 w-4" />

                  {isAm ? "ምርት ጨምር" : "Add product"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ======================================================
           FOOTER NAVIGATION
        ====================================================== */}

        <div className="mt-4 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/categories`,
              )
            }
            className="inline-flex items-center gap-1 text-[11px] font-bold text-coffee-400 transition hover:text-coffee-800"
          >
            {isAm ? "ምድቦችን ይዩ" : "View categories"}

            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/${locale}/management/price-groups`,
              )
            }
            className="inline-flex items-center gap-1 text-[11px] font-bold text-coffee-400 transition hover:text-coffee-800"
          >
            {isAm ? "የዋጋ ስርዓት" : "Pricing"}

            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
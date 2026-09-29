"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { InventoryProduct } from "@/types/inventory";

interface Props {
  open: boolean;
  onClose: () => void;

  products: InventoryProduct[];
  isRefreshingProducts: boolean;

  isAm: boolean;

  receiveProductId: string;
  setReceiveProductId: (value: string) => void;

  receiveQty: number;
  setReceiveQty: (value: number) => void;

  receiveUnitCost: number;
  setReceiveUnitCost: (value: number) => void;

  onSubmit: (
    e: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;

  t: (en: string, am: string) => string;
}

export default function ReceiveStockModal({
  open,
  onClose,
  products,
  isRefreshingProducts,
  isAm,

  receiveProductId,
  setReceiveProductId,

  receiveQty,
  setReceiveQty,

  receiveUnitCost,
  setReceiveUnitCost,

  onSubmit,
  t,
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    for (const product of products) {
      const categoryId = product.category_id ?? "uncategorized";
      const categoryName = isAm
        ? product.category_name_am || product.category_name
        : product.category_name;

      categoryMap.set(categoryId, categoryName);
    }

    return Array.from(categoryMap, ([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [products, isAm]);

  const activeCategoryId = categories.some(
    category => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : "";

  const visibleProducts = activeCategoryId
    ? products.filter(
        product => (product.category_id ?? "uncategorized") === activeCategoryId,
      )
    : products;

  return (
    <Modal
      open={open}
      title={t("Receive Stock", "ዕቃ ተቀበል")}
      onClose={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {isRefreshingProducts && (
          <p role="status" className="text-xs font-medium text-coffee-500">
            {t("Refreshing products from your catalog…", "ምርቶችን ከዝርዝርዎ በማደስ ላይ…")}
          </p>
        )}

        {categories.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-bold text-coffee-500">
              {t("Product Category / Type", "የምርት ምድብ / ዓይነት")}
            </label>
            <select
              value={activeCategoryId}
              onChange={(event) => {
                setSelectedCategoryId(event.target.value);
                setReceiveProductId("");
                setReceiveUnitCost(0);
              }}
              className="w-full min-h-[48px] rounded-xl border border-cream-300 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-coffee-300"
            >
              <option value="">{t("All categories", "ሁሉም ምድቦች")}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Product */}
        <div>
          <label className="mb-2 block text-xs font-bold text-coffee-500">
            {t("Product", "ምርት")}
          </label>

          <select
            required
            value={receiveProductId}
            onChange={(e) => {
              setReceiveProductId(e.target.value);

              const target = products.find(
                (p) => p.id === e.target.value,
              );

              if (target) {
                setReceiveUnitCost(
                  target.cost_price ??
                    target.retail_price * 0.7,
                );
              }
            }}
            className="
              w-full
              min-h-[52px]
              rounded-xl
              border
              border-cream-300
              bg-white
              px-4
              text-sm
              outline-none
              focus:ring-2
              focus:ring-coffee-300
            "
          >
            <option value="">
              {t(
                "Select Product",
                "ምርት ይምረጡ",
              )}
            </option>

            {visibleProducts.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {isAm && product.name_am
                  ? product.name_am
                  : product.name} · {product.unit_type}
              </option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="mt-2 text-xs text-coffee-500">
              {isRefreshingProducts
                ? t("Refreshing your product list…", "የምርት ዝርዝሩ በመታደስ ላይ ነው…")
                : t("No products are available yet. Add a category and product first.", "ገና ምርት የለም። መጀመሪያ ምድብና ምርት ያክሉ።")}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-2 block text-xs font-bold text-coffee-500">
            {t("Quantity", "ብዛት")}
          </label>

          <input
            type="number"
            min="1"
            required
            value={receiveQty || ""}
            onChange={(e) =>
              setReceiveQty(
                Number(e.target.value),
              )
            }
            placeholder="0"
            className="
              w-full
              min-h-[52px]
              rounded-xl
              border
              border-cream-300
              bg-white
              px-4
              text-sm
              font-mono
              outline-none
              focus:ring-2
              focus:ring-coffee-300
            "
          />
        </div>

        {/* Cost */}
        <div>
          <label className="mb-2 block text-xs font-bold text-coffee-500">
            {t(
              "Unit Cost (ETB)",
              "የአንዱ መግዣ ዋጋ",
            )}
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={receiveUnitCost || ""}
            onChange={(e) =>
              setReceiveUnitCost(
                Number(e.target.value),
              )
            }
            placeholder="0.00"
            className="
              w-full
              min-h-[52px]
              rounded-xl
              border
              border-cream-300
              bg-white
              px-4
              text-sm
              font-mono
              outline-none
              focus:ring-2
              focus:ring-berbere-300
            "
          />
        </div>

        {/* Total */}
        {receiveQty > 0 &&
          receiveUnitCost > 0 && (
            <div
              className="
                rounded-xl
                border
                border-coffee-200
                bg-coffee-50
                p-4
              "
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-coffee-500">
                  {t(
                    "Total Cost",
                    "ጠቅላላ ወጪ",
                  )}
                </span>

                <span className="font-bold text-coffee-900">
                  {(
                    receiveQty *
                    receiveUnitCost
                  ).toLocaleString()}{" "}
                  ETB
                </span>
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onClose}
          >
            {t("Cancel", "ሰርዝ")}
          </Button>

          <Button
            type="submit"
            className="flex-1"
            disabled={products.length === 0}
          >
            {t(
              "Receive Stock",
              "ዕቃ ተቀበል",
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
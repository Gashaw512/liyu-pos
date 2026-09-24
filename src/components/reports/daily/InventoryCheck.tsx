// src/components/reports/daily/InventoryCheck.tsx

import {
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";

import {
  formatNumber,
  numberValue,
} from "@/lib/reports/daily-report-format";

import {
  SectionHeader,
} from "@/components/reports/daily/DailyReportPrimitives";

import type {
  LowStockSummary,
} from "@/lib/reports/report.types";

type InventoryCheckProps = {
  lowStockProducts: LowStockSummary[];
  lowStockCount: number;
  outOfStockCount: number;
  t: (en: string, am: string) => string;
};

export function InventoryCheck({
  lowStockProducts,
  lowStockCount,
  outOfStockCount,
  t,
}: InventoryCheckProps) {
  const hasInventoryAlerts =
    lowStockCount > 0 ||
    outOfStockCount > 0;

  return (
    <section
      className="
        daily-report-inventory
        overflow-hidden
        rounded-2xl
        border
        border-coffee-700/10
        bg-white
        shadow-sm
      "
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <SectionHeader
        icon={
          <Package className="h-4 w-4 text-berbere-500" />
        }
        title={t(
          "Inventory Check",
          "የክምችት ማረጋገጫ",
        )}
        subtitle={t(
          "Products that need attention",
          "ትኩረት የሚፈልጉ ምርቶች",
        )}
        right={
          hasInventoryAlerts ? (
            <AlertTriangle className="h-4 w-4 text-gold-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-berbere-500" />
          )
        }
      />

      {/* ==================================================
          STOCK TABLE

          IMPORTANT:
          Render the complete lowStockProducts array.

          Do not use slice() here. If there are 20, 30 or
          50 alerts, the print/PDF version must be able to
          continue onto additional A4 pages.
      ================================================== */}

      <div className="daily-report-stock-alerts overflow-x-auto">
        <table
          className="
            daily-report-inventory-table
            w-full
            min-w-[440px]
            text-sm
          "
        >
          <thead className="bg-cream-50">
            <tr>
              <th
                scope="col"
                className="
                  px-4
                  py-2.5
                  text-left
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t(
                  "Product",
                  "ምርት",
                )}
              </th>

              <th
                scope="col"
                className="
                  w-[100px]
                  px-4
                  py-2.5
                  text-right
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t(
                  "Current",
                  "አሁን",
                )}
              </th>

              <th
                scope="col"
                className="
                  w-[100px]
                  px-4
                  py-2.5
                  text-right
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t(
                  "Minimum",
                  "ዝቅተኛ",
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {lowStockProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-9 text-center"
                >
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-5 w-5 text-berbere-500" />

                    <p className="mt-2 text-xs font-bold text-berbere-600">
                      {t(
                        "Inventory levels look healthy.",
                        "የክምችት መጠን ጥሩ ነው።",
                      )}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              lowStockProducts.map((product, index) => {
                const stock = numberValue(
                  product.quantity,
                );

                const threshold = numberValue(
                  product.alertLevel,
                );

                const productName =
                  product.name ||
                  t(
                    "Unknown Product",
                    "ያልታወቀ ምርት",
                  );

                return (
                  <tr
                    key={
                      product.id ??
                      `${product.name}-${index}`
                    }
                    className="
                      daily-report-stock-row
                      border-t
                      border-cream-200
                    "
                  >
                    {/* PRODUCT */}

                    <td
                      className="
                        px-4
                        py-3
                        font-bold
                        text-coffee-700
                        break-words
                      "
                    >
                      {productName}
                    </td>

                    {/* CURRENT STOCK */}

                    <td
                      className={`
                        px-4
                        py-3
                        text-right
                        font-mono
                        font-black
                        ${
                          stock <= 0
                            ? "text-gold-700"
                            : "text-berbere-600"
                        }
                      `}
                    >
                      {formatNumber(stock)}
                    </td>

                    {/* MINIMUM STOCK */}

                    <td
                      className="
                        px-4
                        py-3
                        text-right
                        font-mono
                        text-coffee-500
                      "
                    >
                      {formatNumber(threshold)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================
          SUMMARY
      ================================================== */}

      {hasInventoryAlerts && (
        <div
          className="
            flex
            flex-wrap
            gap-3
            border-t
            border-cream-200
            bg-gold-50/60
            px-4
            py-3
            text-[10px]
            font-bold
          "
        >
          {lowStockCount > 0 && (
            <span className="text-gold-700">
              {formatNumber(lowStockCount)}{" "}
              {t(
                "low stock",
                "ዝቅተኛ ክምችት",
              )}
            </span>
          )}

          {outOfStockCount > 0 && (
            <span className="text-berbere-600">
              {formatNumber(outOfStockCount)}{" "}
              {t(
                "out of stock",
                "ከክምችት ውጭ",
              )}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
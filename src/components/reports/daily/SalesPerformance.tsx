// src/components/reports/daily/SalesPerformance.tsx

import { ShoppingBag } from "lucide-react";

import {
  formatMoney,
  formatNumber,
  numberValue,
} from "@/lib/reports/daily-report-format";

import {
  SectionHeader,
} from "@/components/reports/daily/DailyReportPrimitives";

import type {
  ProductSummary,
} from "@/lib/reports/report.types";

type SalesPerformanceProps = {
  productReport: ProductSummary[];
  t: (en: string, am: string) => string;
};

export function SalesPerformance({
  productReport,
  t,
}: SalesPerformanceProps) {
  return (
    <section
      className="
        daily-report-sales-performance
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
          <ShoppingBag className="h-4 w-4 text-berbere-500" />
        }
        title={t(
          "Sales Performance",
          "የሽያጭ አፈጻጸም",
        )}
        subtitle={t(
          "Products sold during this period",
          "በዚህ ጊዜ የተሸጡ ምርቶች",
        )}
        right={
          <span className="rounded-lg bg-cream-100 px-2 py-1 text-[9px] font-black text-coffee-500">
            {formatNumber(productReport.length)}
          </span>
        }
      />

      {/* ==================================================
          TABLE

          IMPORTANT:
          Do not slice productReport here.

          The page already provides the complete sorted
          product list. The print version must render all
          products so the browser can naturally continue
          the table onto additional A4 pages.
      ================================================== */}

      <div className="daily-report-product-list overflow-x-auto">
        <table
          className="
            daily-report-product-table
            w-full
            min-w-[520px]
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
                  w-[90px]
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
                  "Qty",
                  "ብዛት",
                )}
              </th>

              <th
                scope="col"
                className="
                  w-[120px]
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
                  "Revenue",
                  "ገቢ",
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {productReport.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="
                    px-4
                    py-10
                    text-center
                    text-xs
                    text-coffee-400
                  "
                >
                  {t(
                    "No product sales recorded for this period.",
                    "ለዚህ ጊዜ የምርት ሽያጭ አልተመዘገበም።",
                  )}
                </td>
              </tr>
            ) : (
              productReport.map((product, index) => {
                const quantity = numberValue(
                  product.quantity,
                );

                const revenue = numberValue(
                  product.revenue,
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
                      daily-report-product-row
                      border-t
                      border-cream-200
                      transition
                      hover:bg-cream-50
                    "
                  >
                    {/* PRODUCT */}

                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="
                            flex
                            h-6
                            w-6
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-cream-100
                            text-[9px]
                            font-black
                            text-coffee-400
                          "
                        >
                          {index + 1}
                        </span>

                        <span
                          className="
                            min-w-0
                            font-bold
                            text-coffee-700
                            break-words
                          "
                        >
                          {productName}
                        </span>
                      </div>
                    </td>

                    {/* QUANTITY */}

                    <td
                      className="
                        px-4
                        py-3
                        text-right
                        font-mono
                        font-bold
                        text-coffee-500
                      "
                    >
                      {formatNumber(quantity)}
                    </td>

                    {/* REVENUE */}

                    <td
                      className="
                        px-4
                        py-3
                        text-right
                        font-mono
                        font-black
                        text-berbere-600
                      "
                    >
                      {formatMoney(revenue)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
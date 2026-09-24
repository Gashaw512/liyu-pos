import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  ShoppingBag,
} from "lucide-react";
import { formatMoney, formatNumber } from "@/lib/reports/daily-report-format";
import { MetricCard } from "@/components/reports/daily/DailyReportPrimitives";

type FinancialSnapshotProps = {
  salesTotal: number;
  netProfit: number;
  expenseTotal: number;
  orderCount: number;
  t: (en: string, am: string) => string;
};

export function FinancialSnapshot({
  salesTotal,
  netProfit,
  expenseTotal,
  orderCount,
  t,
}: FinancialSnapshotProps) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-coffee-400">
            {t("Financial Snapshot", "የገንዘብ ማጠቃለያ")}
          </p>
          <h2 className="mt-0.5 text-sm font-black text-coffee-700">
            {t("Business performance", "የንግድ አፈጻጸም")}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t("Sales", "ሽያጭ")}
          value={formatMoney(salesTotal)}
          caption={t("Sales before expenses", "ወጪ ከመቀነሱ በፊት")}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="primary"
        />
        <MetricCard
          label={t("Net Profit", "የተጣራ ትርፍ")}
          value={formatMoney(netProfit)}
          caption={t("After expenses", "ከወጪ በኋላ")}
          icon={netProfit >= 0
            ? <ArrowUpRight className="h-4 w-4" />
            : <ArrowDownRight className="h-4 w-4" />}
          tone={netProfit >= 0 ? "profit" : "warning"}
        />
        <MetricCard
          label={t("Expenses", "ወጪ")}
          value={formatMoney(expenseTotal)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          tone="warning"
        />
        <MetricCard
          label={t("Transactions", "የተደረጉ ሽያጮች")}
          value={formatNumber(orderCount)}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </div>
    </section>
  );
}

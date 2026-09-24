import { ArrowDownRight } from "lucide-react";
import { formatMoney, numberValue, safePercentage } from "@/lib/reports/daily-report-format";
import type { ExpenseSummary } from "@/lib/reports/report.types";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";

type ExpenseBreakdownProps = {
  expenseCategories: ExpenseSummary["byCategory"];
  expenseTotal: number;
  t: (en: string, am: string) => string;
};

export function ExpenseBreakdown({ expenseCategories, expenseTotal, t }: ExpenseBreakdownProps) {
  if (expenseCategories.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
      <SectionHeader
        icon={<ArrowDownRight className="h-4 w-4 text-gold-600" />}
        title={t("Expense Breakdown", "የወጪ ዝርዝር")}
        subtitle={t("Where business expenses went", "የንግድ ወጪዎች የት እንደዋሉ")}
      />
      <div className="p-4">
        <div className="space-y-2">
          {expenseCategories.map((category, index) => {
            const amount = numberValue(category.amount);
            const percentage = safePercentage(amount, expenseTotal);

            return (
              <div
                key={`${category.category}-${index}`}
                className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-coffee-700">
                    {category.category || t("Other", "ሌላ")}
                  </span>
                  <span className="font-mono text-xs font-black text-gold-700">
                    {formatMoney(amount)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
                  <div
                    className="h-full rounded-full bg-gold-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

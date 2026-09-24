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

  const rows = expenseCategories.map((category, index) => {
    const amount = numberValue(category.amount);
    return {
      id: `${category.category}-${index}`,
      name: category.category || t("Other", "ሌላ"),
      amount,
      percentage: safePercentage(amount, expenseTotal),
    };
  });

  return (
    <section className="daily-report-expense-section overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
      <SectionHeader
        icon={<ArrowDownRight className="h-4 w-4 text-gold-600" />}
        title={t("Expense Breakdown", "የወጪ ዝርዝር")}
        subtitle={t("Where business expenses went", "የንግድ ወጪዎች የት እንደዋሉ")}
      />
      <div className="daily-report-expense-screen-content p-4">
        <div className="daily-report-expense-screen-list space-y-2">
          {rows.map(({ id, name, amount, percentage }) => (
              <div
                key={id}
                className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-coffee-700">
                    {name}
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
          ))}
        </div>
      </div>
      <table className="daily-report-print-table daily-report-expense-print-table w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-2 text-left">{t("Expense Category", "የወጪ ምድብ")}</th>
            <th className="px-2 py-2 text-right">{t("Amount", "መጠን")}</th>
            <th className="px-2 py-2 text-right">{t("Share", "ድርሻ")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, name, amount, percentage }) => (
            <tr key={id}>
              <td className="px-2 py-2">{name}</td>
              <td className="px-2 py-2 text-right">{formatMoney(amount)}</td>
              <td className="px-2 py-2 text-right">{Math.round(percentage)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString()} ETB`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateInput(date: Date): string {
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

export function parseDateInput(value: string): Date {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return new Date(NaN);

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date(NaN);
  }
  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function shiftDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function getStartOfWeek(date: Date): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  // Monday is the first day of the business week.
  return shiftDate(value, day === 0 ? -6 : 1 - day);
}

export function getStartOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0));
}

export function formatDisplayDate(date: Date, isAm: boolean): string {
  return date.toLocaleDateString(isAm ? "am-ET" : "en-ET", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: Date, isAm: boolean): string {
  return date.toLocaleDateString(isAm ? "am-ET" : "en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateRange(from: Date, to: Date, isAm: boolean): string {
  if (formatDateInput(from) === formatDateInput(to)) return formatDisplayDate(from, isAm);
  return `${formatShortDate(from, isAm)} → ${formatShortDate(to, isAm)}`;
}

export function getDatesBetween(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(from);
  const end = startOfDay(to);
  while (current <= end) {
    dates.push(current);
    current = shiftDate(current, 1);
  }
  return dates;
}

export function sameDate(first: Date, second: Date): boolean {
  return formatDateInput(first) === formatDateInput(second);
}

export function safePercentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max((value / total) * 100, 0), 100);
}

import type {
  ReportDateRange,
  ReportExpense,
  ReportPayment,
  ReportSale,
  ReportSaleItem,
} from './report.types'

/* ============================================================
 * NUMBER
 * ============================================================ */

export function toNumber(value: unknown): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

/* ============================================================
 * ID
 * ============================================================ */

export function getSaleId(
  sale: ReportSale,
): string {
  return String(
    sale.id ||
      sale.sale_id ||
      '',
  )
}

export function getItemSaleId(
  item: ReportSaleItem,
): string {
  return String(
    item.sale_id ||
      item.saleId ||
      '',
  )
}

/* ============================================================
 * DATE
 * ============================================================ */

export function getSaleDate(
  sale: ReportSale,
): string {
  return String(
    sale.created_at ||
      sale.createdAt ||
      '',
  )
}

export function getExpenseDate(
  expense: ReportExpense,
): string {
  return String(
    expense.expense_date ||
      expense.date ||
      expense.created_at ||
      '',
  )
}

/* ============================================================
 * DATE RANGE
 * ============================================================ */

export function getReportDateRange(
  input?: Date | string,
): ReportDateRange {
  // A YYYY-MM-DD input represents a calendar date, not a UTC timestamp.
  // Parse it locally so it does not become the previous day in UTC+ zones.
  const date = input instanceof Date
    ? new Date(input)
    : typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? new Date(`${input}T12:00:00`)
      : input
        ? new Date(input)
        : new Date()

  const from = new Date(date)

  from.setHours(
    0,
    0,
    0,
    0,
  )

  const to = new Date(from)

  to.setDate(
    to.getDate() + 1,
  )

  const toCalendarDate = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

  return {
    from,
    to,
    fromDate: toCalendarDate(from),
    toDate: toCalendarDate(to),
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
  }
}

export function isDateInRange(
  value: string,
  range: ReportDateRange,
): boolean {
  if (!value) {
    return false
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return false
  }

  return (
    date >= range.from &&
    date < range.to
  )
}

/* ============================================================
 * SALE TOTAL
 * ============================================================ */

export function getSaleTotal(
  sale: ReportSale,
): number {
  return toNumber(
    sale.total_amount ??
      sale.totalAmount ??
      sale.subtotal ??
      0,
  )
}

export function getSaleTip(
  sale: ReportSale,
): number {
  return toNumber(
    sale.tip_amount ??
      sale.tipAmount ??
      0,
  )
}

/* ============================================================
 * SALE ITEMS
 * ============================================================ */

export function getSaleItems(
  sale: ReportSale,
): ReportSaleItem[] {
  if (
    Array.isArray(
      sale.items,
    )
  ) {
    return sale.items
  }

  if (
    Array.isArray(
      sale.sale_items,
    )
  ) {
    return sale.sale_items
  }

  return []
}

/* ============================================================
 * ITEM REVENUE
 * ============================================================ */

export function getItemRevenue(
  item: ReportSaleItem,
): number {
  if (
    item.total != null
  ) {
    return toNumber(
      item.total,
    )
  }

  if (
    item.total_amount != null
  ) {
    return toNumber(
      item.total_amount,
    )
  }

  return (
    toNumber(
      item.quantity,
    ) *
    toNumber(
      item.unit_price ??
        item.unitPrice ??
        item.price ??
        0,
    )
  )
}

/* ============================================================
 * ITEM GROSS PROFIT
 * ============================================================ */

export function getItemGrossProfit(
  item: ReportSaleItem,
): number {
  return toNumber(
    item.gross_profit,
  )
}

/* ============================================================
 * PAYMENT
 * ============================================================ */

export function getPaymentMethod(
  payment: ReportPayment,
): string {
  return String(
    payment.method ||
      payment.payment_method ||
      'other',
  )
    .trim()
    .toLowerCase()
}

export function getSalePaymentMethod(
  sale: ReportSale,
): string {
  return String(
    sale.payment_method ||
      sale.paymentMethod ||
      'other',
  )
    .trim()
    .toLowerCase()
}

/* ============================================================
 * PAYMENT GROUP
 * ============================================================ */

export function normalizePaymentMethod(
  method: string,
): 'cash' | 'telebirr' | 'bank' | 'card' | 'other' {
  const value =
    method
      .trim()
      .toLowerCase()

  if (
    value === 'cash'
  ) {
    return 'cash'
  }

  if (
    value === 'telebirr'
  ) {
    return 'telebirr'
  }

  if (
    value === 'bank' ||
    value === 'bank_transfer' ||
    value === 'transfer'
  ) {
    return 'bank'
  }

  if (
    value === 'card'
  ) {
    return 'card'
  }

  return 'other'
}

/* ============================================================
 * EXPENSE
 * ============================================================ */

export function getExpenseAmount(
  expense: ReportExpense,
): number {
  return toNumber(
    expense.amount ??
      expense.total_amount ??
      0,
  )
}

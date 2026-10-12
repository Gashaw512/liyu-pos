export interface SaleCalculationLine {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  taxInclusive: boolean
}

export interface AuthoritativeSaleAmounts {
  subtotal: number
  discount: number
  tax: number
  tip: number
  total: number
  items: Array<SaleCalculationLine & { discount: number }>
}

export function calculateLocalPaymentState<T extends object>(total: number, tenders: T) {
  const entries = Object.entries(tenders as Record<string, unknown>).map(([method, amount]) => [method, Number(amount)] as const)
  if (!Number.isFinite(total) || total < 0 || entries.some(([, amount]) => !Number.isFinite(amount) || amount < 0)) {
    throw new Error('Payment amounts are invalid.')
  }
  const tendered = cents(entries.reduce((sum, [, amount]) => sum + amount, 0))
  if (Math.abs(tendered - cents(total)) > 0.009) throw new Error('Payment amounts must equal the sale total.')
  const amountPaid = cents(entries.reduce((sum, [method, amount]) => sum + (method === 'credit' ? 0 : amount), 0))
  const outstanding = cents(Math.max(0, cents(total) - amountPaid))
  return {
    amountPaid,
    outstanding,
    status: outstanding === 0 ? 'paid' as const : amountPaid > 0 ? 'partial' as const : 'unpaid' as const,
  }
}

/** Reject folio tenders at the local sale boundary while disconnected. */
export function assertPaymentMethodsAvailable<T extends object>(
  tenders: T,
  isOnline: boolean,
) {
  const roomCharge = Number((tenders as Record<string, unknown>).room_charge ?? 0)
  if (!Number.isFinite(roomCharge) || roomCharge < 0) {
    throw new Error('Payment amounts are invalid.')
  }
  if (roomCharge > 0 && !isOnline) {
    throw new Error('Room charges require an internet connection to verify an active guest folio.')
  }
}

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function calculateAuthoritativeSale(input: {
  items: SaleCalculationLine[]
  taxRatePercent: number
  requestedDiscount: number
  tip: number
  discountAuthorized: boolean
}): AuthoritativeSaleAmounts {
  const { items, taxRatePercent, requestedDiscount, tip, discountAuthorized } = input
  if (!items.length) throw new Error('Sale must contain at least one valid item.')
  if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100) {
    throw new Error('Business tax rate is invalid.')
  }
  if (!Number.isFinite(tip) || tip < 0) throw new Error('Tip must be a valid non-negative amount.')
  if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0) throw new Error('Discount must be a valid non-negative amount.')
  if (requestedDiscount > 0 && !discountAuthorized) throw new Error('Only a manager or owner can authorize a discount.')

  const subtotal = cents(items.reduce((sum, item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0
      || Math.round(item.quantity * 100) !== item.quantity * 100
      || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error('Sale contains an invalid quantity or price.')
    }
    return sum + item.quantity * item.unitPrice
  }, 0))
  if (requestedDiscount > subtotal) throw new Error('Discount cannot exceed the sale subtotal.')

  const requestedDiscountRounded = cents(requestedDiscount)
  let tax = 0
  let exclusiveTax = 0
  let discountAllocated = 0
  let appliedDiscount = 0
  const calculatedItems = items.map((item, index) => {
    const gross = item.quantity * item.unitPrice
    const lineDiscount = index === items.length - 1
      ? cents(requestedDiscountRounded - discountAllocated)
      : cents(requestedDiscountRounded * gross / subtotal)
    discountAllocated += lineDiscount
    const unitDiscount = cents(lineDiscount / item.quantity)
    const appliedLineDiscount = cents(unitDiscount * item.quantity)
    appliedDiscount += appliedLineDiscount
    const taxable = Math.max(0, gross - appliedLineDiscount)
    const lineTax = item.taxInclusive
      ? taxable * taxRatePercent / (100 + taxRatePercent)
      : taxable * taxRatePercent / 100
    tax += lineTax
    if (!item.taxInclusive) exclusiveTax += lineTax
    return { ...item, discount: unitDiscount }
  })
  const discount = cents(appliedDiscount)
  if (Math.abs(discount - requestedDiscountRounded) > 0.009) {
    throw new Error('Discount cannot be allocated exactly across these sale quantities.')
  }
  tax = cents(tax)
  const total = cents(subtotal - discount + cents(exclusiveTax) + cents(tip))
  return { subtotal, discount, tax, tip: cents(tip), total, items: calculatedItems }
}

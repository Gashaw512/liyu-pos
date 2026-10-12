/** Convert known local checkout failures into clear, actionable cashier messages. */
export function localSaleFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (/missing a valid active-shift context/i.test(message)) {
    return 'Open a shift for this branch before completing the sale.'
  }
  if (/room charges require an internet connection/i.test(message)) {
    return 'Room charges need an internet connection. No sale was saved; reconnect and try again.'
  }
  if (/credit sales require the customer name and phone/i.test(message)) {
    return 'Enter the debtor’s name and phone number before recording credit.'
  }
  if (/payment amounts must equal/i.test(message)) {
    return 'Payment amounts do not match the bill. Adjust them and try again.'
  }
  if (/payment amounts are invalid/i.test(message)) {
    return 'Check the payment amounts and try again.'
  }
  if (/cannot finalize an empty cart/i.test(message)) {
    return 'Add at least one item before completing the sale.'
  }

  return 'Sale could not be saved on this device. Your cart is still available; check device storage and try again.'
}

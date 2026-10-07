export type DrawerPayment = {
  method: string
  amount: number
  status: string
}

export type DrawerExpense = {
  amount: number
  payment_method: string | null
}

export function calculateExpectedDrawerCash(
  openingFloat: number,
  payments: DrawerPayment[],
  expenses: DrawerExpense[],
): number {
  const cashCollected = payments
    .filter((payment) => payment.method === 'cash' && payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const cashRefunded = payments
    .filter((payment) => payment.method === 'cash' && payment.status === 'refunded')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const cashExpenses = expenses
    .filter((expense) => (expense.payment_method || 'cash') === 'cash')
    .reduce((sum, expense) => sum + expense.amount, 0)

  return openingFloat + cashCollected - cashRefunded - cashExpenses
}

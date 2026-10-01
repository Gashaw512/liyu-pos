const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100

export interface CashSettlement {
  cashDue: number
  cashReceived: number
  remaining: number
  change: number
  isCovered: boolean
}

export function calculateCashSettlement(
  cashDueValue: number,
  cashReceivedValue: number,
): CashSettlement {
  const cashDue = Math.max(0, roundMoney(Number(cashDueValue) || 0))
  const cashReceived = Math.max(0, roundMoney(Number(cashReceivedValue) || 0))
  const remaining = Math.max(0, roundMoney(cashDue - cashReceived))
  const change = Math.max(0, roundMoney(cashReceived - cashDue))

  return {
    cashDue,
    cashReceived,
    remaining,
    change,
    isCovered: remaining <= 0.009,
  }
}
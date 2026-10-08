export interface CustodyCountInput {
  productId: string
  usedQuantity: number
  returnedQuantity: number
  wastedQuantity: number
  physicalCount: number
}

export interface CustodyCountLine extends CustodyCountInput {
  soldQuantity: number
  usedIncludingSales: number
  expectedRemaining: number
  overdrawnQuantity: number
  variance: number
}

export type CustodySaleLine = {
  saleItemId: string
  productId: string
  quantity: number
  soldAt: string
}

export function calculateExpectedCustodyRemaining(
  accepted: number,
  sold: number,
  used: number,
  returned: number,
  wasted: number,
): number {
  return accepted - sold - used - returned - wasted
}

export function calculateCustodySoldQuantities(
  shiftAllocations: Array<{ productId: string; quantity: number }>,
  recipientSales: CustodySaleLine[],
  saleAllocations: Array<{ saleItemId: string; quantity: number }>,
  acceptedAtByProduct: ReadonlyMap<string, string>,
): Map<string, number> {
  const soldByProduct = new Map<string, number>()
  for (const allocation of shiftAllocations) {
    soldByProduct.set(
      allocation.productId,
      (soldByProduct.get(allocation.productId) ?? 0) + allocation.quantity,
    )
  }

  const allocatedBySaleItem = new Map<string, number>()
  for (const allocation of saleAllocations) {
    allocatedBySaleItem.set(
      allocation.saleItemId,
      (allocatedBySaleItem.get(allocation.saleItemId) ?? 0) + allocation.quantity,
    )
  }

  for (const sale of recipientSales) {
    const acceptedAt = acceptedAtByProduct.get(sale.productId)
    if (!acceptedAt || Date.parse(sale.soldAt) < Date.parse(acceptedAt)) continue

    // Ticket allocation already assigns that portion to the preparing worker.
    // Only the remaining, unallocated portion belongs to the selling custodian.
    const unallocated = Math.max(0, sale.quantity - (allocatedBySaleItem.get(sale.saleItemId) ?? 0))
    if (unallocated > 0) {
      soldByProduct.set(
        sale.productId,
        (soldByProduct.get(sale.productId) ?? 0) + unallocated,
      )
    }
  }

  return soldByProduct
}

export function buildCustodyCountLines(
  lines: CustodyCountInput[],
  soldByProduct: ReadonlyMap<string, number>,
  issuedByProduct: ReadonlyMap<string, number>,
): CustodyCountLine[] {
  return lines.map((line) => {
    const soldQuantity = soldByProduct.get(line.productId) ?? 0
    const acceptedQuantity = issuedByProduct.get(line.productId) ?? 0
    const usedIncludingSales = line.usedQuantity + soldQuantity
    const expectedRemaining = calculateExpectedCustodyRemaining(
      acceptedQuantity,
      soldQuantity,
      line.usedQuantity,
      line.returnedQuantity,
      line.wastedQuantity,
    )

    return {
      ...line,
      soldQuantity,
      usedIncludingSales,
      expectedRemaining,
      overdrawnQuantity: Math.max(0, -expectedRemaining),
      variance: line.physicalCount - Math.max(0, expectedRemaining),
    }
  })
}

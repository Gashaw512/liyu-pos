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
  variance: number
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
    const expectedRemaining = acceptedQuantity
      - usedIncludingSales
      - line.returnedQuantity
      - line.wastedQuantity

    if (expectedRemaining < 0) {
      throw new Error(`Recorded use exceeds accepted stock for product ${line.productId}.`)
    }

    return {
      ...line,
      soldQuantity,
      usedIncludingSales,
      expectedRemaining,
      variance: line.physicalCount - expectedRemaining,
    }
  })
}

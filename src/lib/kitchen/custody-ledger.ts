import type { createAdminDatabaseClient } from '@/lib/shift-reports/server'
import { calculateCustodySoldQuantities } from './custody-stock'

type AdminClient = ReturnType<typeof createAdminDatabaseClient>

export async function loadCustodyLedger(
  admin: AdminClient,
  scope: {
    businessId: string
    branchId: string
    custodyShiftId: string
    userId: string
    openedAt: string
    closedAt: string | null
  },
) {
  const [entriesResult, shiftAllocationsResult, salesResult] = await Promise.all([
    admin.from('custody_shift_inventory')
      .select('product_id,quantity_received,accepted_at')
      .eq('business_id', scope.businessId)
      .eq('branch_id', scope.branchId)
      .eq('custody_shift_id', scope.custodyShiftId),
    admin.from('kot_sale_allocations')
      .select('product_id,quantity')
      .eq('business_id', scope.businessId)
      .eq('branch_id', scope.branchId)
      .eq('custody_shift_id', scope.custodyShiftId),
    admin.from('sales')
      .select('id,created_at')
      .eq('business_id', scope.businessId)
      .eq('branch_id', scope.branchId)
      .eq('cashier_id', scope.userId)
      .eq('status', 'completed')
      .gte('created_at', scope.openedAt)
      .lte('created_at', scope.closedAt ?? new Date().toISOString()),
  ])

  if (entriesResult.error || shiftAllocationsResult.error || salesResult.error) {
    throw entriesResult.error ?? shiftAllocationsResult.error ?? salesResult.error
  }

  const entries = entriesResult.data ?? []
  const issuedByProduct = new Map<string, number>()
  const acceptedAtByProduct = new Map<string, string>()
  for (const entry of entries) {
    issuedByProduct.set(
      entry.product_id,
      (issuedByProduct.get(entry.product_id) ?? 0) + Number(entry.quantity_received || 0),
    )
    const acceptedAt = acceptedAtByProduct.get(entry.product_id)
    if (!acceptedAt || Date.parse(entry.accepted_at) < Date.parse(acceptedAt)) {
      acceptedAtByProduct.set(entry.product_id, entry.accepted_at)
    }
  }

  const sales = salesResult.data ?? []
  const saleIds = sales.map((sale) => sale.id)
  let recipientSales: Array<{ saleItemId: string; productId: string; quantity: number; soldAt: string }> = []
  let saleAllocations: Array<{ saleItemId: string; quantity: number }> = []
  if (saleIds.length) {
    const { data: items, error: itemsError } = await admin.from('sale_items')
      .select('id,sale_id,product_id,quantity')
      .in('sale_id', saleIds)
    if (itemsError) throw itemsError

    const saleById = new Map(sales.map((sale) => [sale.id, sale]))
    recipientSales = (items ?? []).flatMap((item) => {
      const sale = saleById.get(item.sale_id)
      return sale ? [{
        saleItemId: item.id,
        productId: item.product_id,
        quantity: Number(item.quantity),
        soldAt: sale.created_at,
      }] : []
    })

    const saleItemIds = recipientSales.map((item) => item.saleItemId)
    if (saleItemIds.length) {
      const { data: allocations, error: allocationsError } = await admin.from('kot_sale_allocations')
        .select('sale_item_id,quantity')
        .in('sale_item_id', saleItemIds)
      if (allocationsError) throw allocationsError
      saleAllocations = (allocations ?? []).map((allocation) => ({
        saleItemId: allocation.sale_item_id,
        quantity: Number(allocation.quantity),
      }))
    }
  }

  const soldByProduct = calculateCustodySoldQuantities(
    (shiftAllocationsResult.data ?? []).map((allocation) => ({
      productId: allocation.product_id,
      quantity: Number(allocation.quantity),
    })),
    recipientSales,
    saleAllocations,
    acceptedAtByProduct,
  )

  return { entries, issuedByProduct, soldByProduct }
}

import type { LocalHistoricalSale, LocalPendingSale } from '@/types/models/pos-cart'
import type { Payment, SaleItem } from '@/types/database/sales'

export function toLocalHistoricalSale(sale: LocalPendingSale): LocalHistoricalSale {
  const saleId = sale.localId
  const createdAt = sale.createdAt
  const items: SaleItem[] = sale.items.map((item, index) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unit_price) || 0
    const costPrice = Number(item.cost_price) || 0
    const discount = Number(item.discount) || 0
    const totalAmount = (unitPrice - discount) * quantity

    return {
      id: `${saleId}:${index}`,
      sale_id: saleId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: unitPrice,
      cost_price: costPrice,
      cost_total: costPrice * quantity,
      quantity,
      discount,
      total_amount: totalAmount,
      gross_profit: (unitPrice - costPrice - discount) * quantity,
      created_at: createdAt,
    }
  })
  const payments: Payment[] = sale.payments.map((payment) => ({
    id: payment.id,
    sale_id: saleId,
    business_id: sale.business_id,
    method: payment.method,
    amount: Number(payment.amount) || 0,
    reference_no: payment.reference_no,
    status: payment.status,
    created_at: createdAt,
  }))

  return {
    id: saleId,
    business_id: sale.business_id,
    branch_id: sale.branch_id,
    shift_id: sale.shift_id,
    cashier_id: sale.cashier_id,
    receipt_number: sale.receipt_number,
    subtotal: sale.subtotal,
    tax_amount: sale.tax_amount,
    discount_amount: sale.discount_amount,
    total_amount: sale.total_amount,
    status: sale.status,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    notes: sale.notes,
    is_offline_sync: true,
    offline_id: sale.offline_id,
    created_at: createdAt,
    voided_at: null,
    voided_by: null,
    deleted_at: null,
    table_id: sale.table_id,
    table_name: sale.table_name,
    tip_amount: sale.tip_amount,
    items,
    payments,
    localSyncStatus: 'pending',
    ...('table_number' in sale ? { table_number: sale.table_number } : {}),
  }
}
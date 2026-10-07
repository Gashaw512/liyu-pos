import { createAdminDatabaseClient } from '@/lib/shift-reports/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function ensureTicketLines(
  admin: ReturnType<typeof createAdminDatabaseClient>,
  order: { id: string; business_id: string; branch_id: string; revision: number },
): Promise<void> {
  const { data: tickets, error } = await admin
    .from('kitchen_order_tickets')
    .select('id,item_payload')
    .eq('order_id', order.id)
    .eq('business_id', order.business_id)
    .eq('branch_id', order.branch_id)
    .eq('order_revision', order.revision)
  if (error) throw error

  const lines = (tickets ?? []).flatMap((ticket) =>
    (Array.isArray(ticket.item_payload) ? ticket.item_payload : []).flatMap((value) => {
      if (!value || typeof value !== 'object') return []
      const item = value as Record<string, unknown>
      const productId = typeof item.product_id === 'string' ? item.product_id : ''
      const quantity = Number(item.quantity)
      if (!UUID.test(productId) || !Number.isFinite(quantity) || quantity <= 0) return []
      return [{
        business_id: order.business_id,
        branch_id: order.branch_id,
        ticket_id: ticket.id,
        product_id: productId,
        product_name: typeof item.name === 'string' ? item.name.slice(0, 200) : 'Item',
        quantity,
      }]
    }),
  )
  if (!lines.length) return
  const { error: insertError } = await admin.from('kitchen_order_ticket_lines')
    .upsert(lines, { onConflict: 'ticket_id,product_id', ignoreDuplicates: true })
  if (insertError) throw insertError
}

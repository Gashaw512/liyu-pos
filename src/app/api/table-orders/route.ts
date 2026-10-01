import { NextResponse } from 'next/server'

import { getAuthorizedProfile } from '@/lib/shift-reports/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateTableOrderTotal,
  mergeTableOrderChanges,
  removeCompletedTableOrderItems,
  type TableOrderLine,
} from '@/lib/offline/tableOrderSync'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isTableOrdersMigrationMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === 'PGRST205' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('open_table_orders')
}

function parseItems(value: unknown): TableOrderLine[] | null {
  if (!Array.isArray(value)) return null

  const items: TableOrderLine[] = []
  for (const valueItem of value) {
    if (!valueItem || typeof valueItem !== 'object') return null
    const item = valueItem as Record<string, unknown>
    const productId = typeof item.product_id === 'string' ? item.product_id : ''
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unit_price)
    if (
      !UUID.test(productId) ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice < 0 ||
      typeof item.product_name !== 'string'
    ) return null

    items.push({
      product_id: productId,
      product_name: item.product_name.slice(0, 200),
      product_name_am: typeof item.product_name_am === 'string' ? item.product_name_am.slice(0, 200) : null,
      quantity,
      unit_price: unitPrice,
    })
  }

  return items
}

export async function GET() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier', 'waiter'])
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }
    if (!auth.profile!.business_id || !auth.profile!.branch_id) {
      return NextResponse.json({ error: 'No business branch is assigned to this account.' }, { status: 403 })
    }

    const { data, error } = await client
      .from('open_table_orders')
      .select('id,business_id,branch_id,table_id,cashier_id,items,total_amount,revision,updated_at')
      .eq('business_id', auth.profile!.business_id)
      .eq('branch_id', auth.profile!.branch_id)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
    if (error) throw error

    const tableIds = [...new Set((data ?? []).map((order) => order.table_id))]
    const { data: tables, error: tablesError } = tableIds.length
      ? await client.from('restaurant_tables').select('id,name').in('id', tableIds)
      : { data: [], error: null }
    if (tablesError) throw tablesError
    const tableNames = new Map((tables ?? []).map((table) => [table.id, table.name]))

    return NextResponse.json({
      success: true,
      businessId: auth.profile!.business_id,
      branchId: auth.profile!.branch_id,
      orders: (data ?? []).map((order) => ({
        ...order,
        table_number: tableNames.get(order.table_id) ?? '',
      })),
    })
  } catch (error) {
    if (isTableOrdersMigrationMissing(error)) {
      return NextResponse.json({
        success: false,
        code: 'TABLE_ORDERS_NOT_CONFIGURED',
        error: 'Shared table orders are not configured for this database.',
      }, { status: 503 })
    }
    console.error('[TABLE ORDERS] Failed to load shared orders:', error)
    return NextResponse.json({ error: 'Could not load table orders.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier', 'waiter'])
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json().catch(() => null) as {
      tableId?: unknown
      tableNumber?: unknown
      operation?: unknown
      baseItems?: unknown
      items?: unknown
    } | null

    if (
      !body ||
      typeof body.tableId !== 'string' || !UUID.test(body.tableId) ||
      (body.operation !== 'save' && body.operation !== 'complete' && body.operation !== 'cancel')
    ) {
      return NextResponse.json({ error: 'Invalid table order.' }, { status: 400 })
    }

    const baseItems = parseItems(body.baseItems)
    const items = parseItems(body.items)
    if (!baseItems || !items || (body.operation === 'save' && items.length === 0)) {
      return NextResponse.json({ error: 'The table order contains invalid items.' }, { status: 400 })
    }

    const profile = auth.profile!
    const user = auth.user!
    if (!profile.business_id || !profile.branch_id) {
      return NextResponse.json({ error: 'No business branch is assigned to this account.' }, { status: 403 })
    }

    const { data: table, error: tableError } = await client
      .from('restaurant_tables')
      .select('id')
      .eq('id', body.tableId)
      .eq('business_id', profile.business_id)
      .eq('branch_id', profile.branch_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (tableError) throw tableError
    if (!table) return NextResponse.json({ error: 'Table not found.' }, { status: 404 })

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: current, error: currentError } = await client
        .from('open_table_orders')
        .select('*')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .eq('table_id', body.tableId)
        .eq('status', 'open')
        .maybeSingle()
      if (currentError) throw currentError

      if (!current) {
        if (body.operation === 'complete' || body.operation === 'cancel') {
          return NextResponse.json({ success: true, order: null })
        }

        const { data: inserted, error: insertError } = await client
          .from('open_table_orders')
          .insert({
            business_id: profile.business_id,
            branch_id: profile.branch_id,
            table_id: body.tableId,
            cashier_id: user.id,
            items,
            total_amount: calculateTableOrderTotal(items),
            revision: 1,
            status: 'open',
          })
          .select('*')
          .single()
        if (!insertError && inserted) {
          return NextResponse.json({ success: true, order: inserted })
        }
        if (insertError?.code === '23505') continue
        if (insertError) throw insertError
      }

      const nextItems = body.operation === 'save'
        ? mergeTableOrderChanges(current.items as TableOrderLine[], baseItems, items)
        : removeCompletedTableOrderItems(current.items as TableOrderLine[], baseItems)
      const nextStatus = nextItems.length > 0
        ? 'open'
        : body.operation === 'cancel' ? 'cancelled' : 'completed'
      const { data: updated, error: updateError } = await client
        .from('open_table_orders')
        .update({
          items: nextItems,
          total_amount: calculateTableOrderTotal(nextItems),
          revision: current.revision + 1,
          status: nextStatus,
          ...(body.operation === 'save' ? { cashier_id: user.id } : {}),
        })
        .eq('id', current.id)
        .eq('revision', current.revision)
        .select('*')
        .maybeSingle()
      if (updateError) throw updateError
      if (updated) return NextResponse.json({ success: true, order: updated })
    }

    return NextResponse.json({ error: 'Order changed on another device. It will retry with the latest order.' }, { status: 409 })
  } catch (error) {
    if (isTableOrdersMigrationMissing(error)) {
      return NextResponse.json({
        success: false,
        code: 'TABLE_ORDERS_NOT_CONFIGURED',
        error: 'Shared table orders are not configured for this database.',
      }, { status: 503 })
    }
    console.error('[TABLE ORDERS] Failed to save shared order:', error)
    return NextResponse.json({ error: 'Could not save the table order.' }, { status: 500 })
  }
}

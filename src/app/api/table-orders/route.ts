import { NextResponse } from 'next/server'

import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'
import { createClient } from '@/lib/supabase/server'
import { signPriceProof, verifyPriceProof } from '@/lib/security/price-proof'
import { ensureTicketLines } from '@/lib/kitchen/ensureTicketLines'
import {
  calculateTableOrderTotal,
  mergeTableOrderChanges,
  removeCompletedTableOrderItems,
  type TableOrderLine,
} from '@/lib/offline/tableOrderSync'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

class TableOrderValidationError extends Error {}

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
      typeof item.product_name !== 'string' ||
      (item.price_proof != null && (typeof item.price_proof !== 'string' || item.price_proof.length > 2048))
    ) return null

    items.push({
      product_id: productId,
      product_name: item.product_name.slice(0, 200),
      product_name_am: typeof item.product_name_am === 'string' ? item.product_name_am.slice(0, 200) : null,
      quantity,
      unit_price: unitPrice,
      price_proof: typeof item.price_proof === 'string' ? item.price_proof : undefined,
    })
  }

  return items
}

async function validateOrderPrices(
  client: Awaited<ReturnType<typeof createClient>>,
  items: TableOrderLine[],
  context: { businessId: string; branchId: string; userId: string; canOverride: boolean },
): Promise<TableOrderLine[]> {
  if (!items.length) return items

  const productIds = [...new Set(items.map((item) => item.product_id))]
  const { data, error } = await client
    .from('products')
    .select('id,business_id,branch_id,name,name_am,retail_price,is_active,deleted_at')
    .eq('business_id', context.businessId)
    .in('id', productIds)
    .eq('is_active', true)
    .is('deleted_at', null)
    .or(`branch_id.is.null,branch_id.eq.${context.branchId}`)
  if (error) throw error

  const products = new Map((data ?? []).map((product) => [product.id, product]))
  return items.map((item) => {
    const product = products.get(item.product_id)
    if (!product) throw new TableOrderValidationError('An order contains a product that is not available in this branch.')

    const priceCents = Math.round(item.unit_price * 100)
    const catalogPriceCents = Math.round(Number(product.retail_price) * 100)
    const proof = verifyPriceProof(item.price_proof, {
      businessId: context.businessId,
      branchId: context.branchId,
      productId: product.id,
      priceCents,
    })

    const approvedPriceCents = proof || context.canOverride ? priceCents : catalogPriceCents

    const approvedProof = proof
      ? item.price_proof
      : signPriceProof({
          version: 1,
          businessId: context.businessId,
          branchId: context.branchId,
          productId: product.id,
          priceCents: approvedPriceCents,
          kind: approvedPriceCents === catalogPriceCents ? 'catalog' : 'manager_override',
          ...(approvedPriceCents === catalogPriceCents ? {} : { issuedBy: context.userId }),
        })

    return {
      ...item,
      product_name: product.name,
      product_name_am: product.name_am,
      unit_price: approvedPriceCents / 100,
      price_proof: approvedProof,
    }
  })
}

export async function GET() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier', 'waiter'])
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }
    const authorizedRoles = auth.roles
    if (!auth.profile!.business_id || !auth.profile!.branch_id) {
      return NextResponse.json({ error: 'No business branch is assigned to this account.' }, { status: 403 })
    }

    const [tablesResult, ordersResult] = await Promise.all([
      client.from('restaurant_tables')
        .select('id,name')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      client.from('open_table_orders')
        .select('id,business_id,branch_id,table_id,cashier_id,items,total_amount,revision,updated_at')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('status', 'open')
        .order('updated_at', { ascending: false }),
    ])
    if (tablesResult.error) throw tablesResult.error
    if (ordersResult.error) throw ordersResult.error
    const configuredTables = tablesResult.data
    const data = ordersResult.data

    const tableNames = new Map((configuredTables ?? []).map((table) => [table.id, table.name]))

    return NextResponse.json({
      success: true,
      businessId: auth.profile!.business_id,
      branchId: auth.profile!.branch_id,
      tables: configuredTables ?? [],
      canCreateFallbackTables:
        configuredTables?.length === 0 &&
        authorizedRoles.some((role) => role === 'owner' || role === 'manager'),
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
    const authorizedRoles = auth.roles

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

    if (
      body.operation === 'save' &&
      !authorizedRoles.some((role) => ['waiter', 'manager', 'owner'].includes(role))
    ) {
      return NextResponse.json({ error: 'Only a waiter, manager, or owner can save a table order.' }, { status: 403 })
    }

    const baseItems = parseItems(body.baseItems)
    const items = parseItems(body.items)
    if (!baseItems || !items || (body.operation === 'save' && items.length === 0)) {
      return NextResponse.json({ error: 'The table order contains invalid items.' }, { status: 400 })
    }

    if (
      (body.operation === 'complete' || body.operation === 'cancel') &&
      !authorizedRoles.some((role) =>
        ['owner', 'manager', 'cashier'].includes(role),
      )
    ) {
      return NextResponse.json({ error: 'Only a cashier or manager can complete or cancel a table order.' }, { status: 403 })
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

    // All writes go through this authenticated route so signed price checks
    // run before the database KOT trigger can inspect the saved snapshot.
    const admin = createAdminDatabaseClient()

    let validatedItems = items
    if (body.operation === 'save') {
      try {
        validatedItems = await validateOrderPrices(client, items, {
          businessId: profile.business_id,
          branchId: profile.branch_id,
          userId: user.id,
          canOverride: authorizedRoles.some((role) => role === 'owner' || role === 'manager'),
        })
      } catch (error) {
        if (error instanceof TableOrderValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
        throw error
      }
    }

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

        const { data: inserted, error: insertError } = await admin
          .from('open_table_orders')
          .insert({
            business_id: profile.business_id,
            branch_id: profile.branch_id,
            table_id: body.tableId,
            cashier_id: user.id,
            items: validatedItems,
            total_amount: calculateTableOrderTotal(validatedItems),
            revision: 1,
            status: 'open',
          })
          .select('*')
          .single()
        if (!insertError && inserted) {
          await ensureTicketLines(admin, inserted)
          return NextResponse.json({ success: true, order: inserted })
        }
        if (insertError?.code === '23505') continue
        if (insertError) throw insertError
      }

      const nextItems = body.operation === 'save'
        ? mergeTableOrderChanges(current.items as TableOrderLine[], baseItems, validatedItems)
        : removeCompletedTableOrderItems(current.items as TableOrderLine[], baseItems)
      const nextStatus = nextItems.length > 0
        ? 'open'
        : body.operation === 'cancel' ? 'cancelled' : 'completed'
      const isAdminOverride = authorizedRoles.some((role) => role === 'owner' || role === 'manager')
      if ((body.operation === 'save' || body.operation === 'cancel') && !isAdminOverride) {
        const { data: tickets, error: ticketsError } = await admin.from('kitchen_order_tickets')
          .select('id').eq('order_id', current.id)
          .eq('business_id', profile.business_id).eq('branch_id', profile.branch_id)
          .eq('preparation_status', 'ready')
        if (ticketsError) throw ticketsError
        const ticketIds = (tickets ?? []).map((ticket) => ticket.id)
        if (ticketIds.length) {
          const { data: readyLines, error: readyLinesError } = await admin.from('kitchen_order_ticket_lines')
            .select('product_id,quantity,allocated_quantity,wasted_quantity')
            .in('ticket_id', ticketIds).eq('preparation_status', 'ready')
          if (readyLinesError) throw readyLinesError
          const protectedQuantity = new Map<string, number>()
          for (const line of readyLines ?? []) {
            const outstanding = Math.max(0, Number(line.quantity) - Number(line.allocated_quantity) - Number(line.wasted_quantity))
            protectedQuantity.set(line.product_id, (protectedQuantity.get(line.product_id) ?? 0) + outstanding)
          }
          const nextQuantity = new Map<string, number>()
          for (const line of nextItems) nextQuantity.set(line.product_id, (nextQuantity.get(line.product_id) ?? 0) + line.quantity)
          const removesPreparedItems = [...protectedQuantity].some(([productId, quantity]) =>
            (nextQuantity.get(productId) ?? 0) < quantity,
          )
          if (removesPreparedItems) {
            return NextResponse.json({ error: 'Prepared items cannot be removed or reduced. Ask an owner or manager to record the correction.' }, { status: 403 })
          }
        }
      }

      const { data: updated, error: updateError } = await admin.rpc('commit_table_order_update', {
        p_order_id: current.id,
        p_business_id: profile.business_id,
        p_branch_id: profile.branch_id,
        p_expected_revision: current.revision,
        p_items: nextItems,
        p_total_amount: calculateTableOrderTotal(nextItems),
        p_status: nextStatus,
        p_actor_id: user.id,
      })
      if (updateError) throw updateError
      if (updated) {
        await ensureTicketLines(admin, updated)
        return NextResponse.json({ success: true, order: updated })
      }
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

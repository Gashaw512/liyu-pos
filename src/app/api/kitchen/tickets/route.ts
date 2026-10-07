import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'
import { getOrOpenCustodyShift } from '@/lib/kitchen/handoverService'
import { ensureTicketLines } from '@/lib/kitchen/ensureTicketLines'

export const dynamic = 'force-dynamic'

const stationRoles = { kitchen: 'kitchen', bar: 'barman' } as const

export async function GET() {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'kitchen', 'barman'])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  if (!auth.profile!.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })
  const { data, error } = await client.from('kitchen_order_tickets')
    .select('id,order_id,order_revision,table_number,waiter_name,item_payload,destination_station,print_status,preparation_status,created_at')
    .eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id)
    .neq('preparation_status', 'ready').order('created_at', { ascending: true }).limit(200)
  if (error) return NextResponse.json({ error: 'Could not load kitchen tickets.' }, { status: 500 })
  const visible = (data ?? []).filter((ticket) => auth.roles.some((role) =>
    role === 'owner' || role === 'manager' || role === stationRoles[ticket.destination_station as keyof typeof stationRoles],
  ))
  return NextResponse.json({ tickets: visible })
}

export async function PATCH(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'kitchen', 'barman'])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  if (!auth.profile!.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { ticketId?: unknown; status?: unknown } | null
  if (typeof body?.ticketId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.ticketId) || (body.status !== 'preparing' && body.status !== 'ready')) {
    return NextResponse.json({ error: 'Invalid ticket update.' }, { status: 400 })
  }
  const { data: ticket, error: ticketError } = await client.from('kitchen_order_tickets')
    .select('id,order_id,order_revision,destination_station,preparation_status').eq('id', body.ticketId)
    .eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).maybeSingle()
  if (ticketError) {
    console.error('[KITCHEN] Ticket lookup failed:', { code: ticketError.code, message: ticketError.message })
    const migrationMissing = ['PGRST205', '42P01'].includes(ticketError.code ?? '')
    return NextResponse.json({
      error: migrationMissing
        ? 'Kitchen workflow setup is incomplete. Apply the latest database migrations and try again.'
        : 'Could not validate this ticket. Please retry.',
    }, { status: migrationMissing ? 503 : 500 })
  }
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  if (!auth.roles.some((role) => role === 'owner' || role === 'manager' || role === stationRoles[ticket.destination_station as keyof typeof stationRoles])) {
    return NextResponse.json({ error: 'You cannot update this station ticket.' }, { status: 403 })
  }
  const stationRole = stationRoles[ticket.destination_station as keyof typeof stationRoles]
  const isStationWorker = auth.roles.includes(stationRole)
  const expectedStatus = body.status === 'preparing' ? 'pending' : 'preparing'
  if (ticket.preparation_status !== expectedStatus) {
    if (ticket.preparation_status === body.status) return NextResponse.json({ success: true, duplicate: true })
    return NextResponse.json({ error: 'This ticket has already moved to another preparation step.' }, { status: 409 })
  }

  const profile = auth.profile!
  const admin = createAdminDatabaseClient()
  // Older tickets, and tickets written while a client was retrying a save,
  // may not yet have their line-level rows. Repair those rows before calling
  // the transition RPC, which changes the ticket and its lines atomically.
  try {
    await ensureTicketLines(admin, {
      id: ticket.order_id,
      business_id: profile.business_id!,
      branch_id: profile.branch_id!,
      revision: ticket.order_revision,
    })
  } catch (cause) {
    console.error('[KITCHEN] Could not prepare ticket lines:', {
      code: typeof cause === 'object' && cause && 'code' in cause ? cause.code : undefined,
      message: cause instanceof Error ? cause.message : 'Unknown database error',
    })
    return NextResponse.json({ error: 'This kitchen ticket needs a database update. Ask the manager to refresh the system.' }, { status: 503 })
  }

  let custodyShiftId: string | null = null
  if (body.status === 'ready' && !isStationWorker) {
    return NextResponse.json({ error: 'Only a worker assigned to this station can confirm it is ready.' }, { status: 403 })
  }
  if (body.status === 'ready' && profile.business_id && profile.branch_id) {
    try {
      const shift = await getOrOpenCustodyShift(admin, {
        businessId: profile.business_id,
        branchId: profile.branch_id,
        userId: auth.user!.id,
      })
      custodyShiftId = shift.id
    } catch {
      return NextResponse.json({ error: 'Could not verify your active stock custody.' }, { status: 409 })
    }
  }

  const { data: transitioned, error } = await admin.rpc('transition_kot_ticket', {
    p_ticket_id: ticket.id,
    p_business_id: profile.business_id,
    p_branch_id: profile.branch_id,
    p_expected_status: expectedStatus,
    p_next_status: body.status,
    p_prepared_by_user_id: body.status === 'ready' ? auth.user!.id : null,
    p_custody_shift_id: custodyShiftId,
  })
  if (error) {
    console.error('[KITCHEN] Ticket transition failed:', { code: error.code, message: error.message })
    const migrationMissing = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code ?? '')
    return NextResponse.json({
      error: migrationMissing
        ? 'Kitchen workflow setup is incomplete. Apply the latest database migrations and try again.'
        : 'Could not update the kitchen ticket. Please retry.',
    }, { status: migrationMissing ? 503 : 500 })
  }
  if (!transitioned) return NextResponse.json({ error: 'This ticket has already moved to another preparation step.' }, { status: 409 })
  return NextResponse.json({ success: true })
}

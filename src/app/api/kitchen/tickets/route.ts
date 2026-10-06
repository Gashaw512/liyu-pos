import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedProfile } from '@/lib/shift-reports/server'

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
    .select('id,destination_station').eq('id', body.ticketId)
    .eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).maybeSingle()
  if (ticketError) return NextResponse.json({ error: 'Could not validate ticket.' }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  if (!auth.roles.some((role) => role === 'owner' || role === 'manager' || role === stationRoles[ticket.destination_station as keyof typeof stationRoles])) {
    return NextResponse.json({ error: 'You cannot update this station ticket.' }, { status: 403 })
  }
  const { error } = await client.from('kitchen_order_tickets')
    .update({ preparation_status: body.status, updated_at: new Date().toISOString() }).eq('id', ticket.id)
  if (error) return NextResponse.json({ error: 'Could not update ticket.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

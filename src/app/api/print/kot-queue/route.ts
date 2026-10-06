import { NextResponse } from 'next/server'
import { authorizePrintAgent } from '@/lib/kitchen/print-agent-auth'

export const dynamic = 'force-dynamic'

const stationRoles = { kitchen: 'kitchen', bar: 'barman' } as const

export async function GET(request: Request) {
  const auth = await authorizePrintAgent(request)
  if (auth.error || !auth.client || !auth.profile) return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const { client, profile, roles } = auth
  if (!profile.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })

  const station = new URL(request.url).searchParams.get('station')
  if (station !== 'kitchen' && station !== 'bar') return NextResponse.json({ error: 'Choose kitchen or bar station.' }, { status: 400 })
  if (!roles.some((role) => role === 'owner' || role === 'manager' || role === stationRoles[station])) {
    return NextResponse.json({ error: 'You cannot access this printer station.' }, { status: 403 })
  }
  const { data, error } = await client.from('kitchen_order_tickets')
    .select('id,order_id,order_revision,table_id,table_number,waiter_id,waiter_name,item_payload,destination_station,created_at')
    .eq('business_id', profile.business_id)
    .eq('branch_id', profile.branch_id)
    .eq('destination_station', station)
    .eq('print_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return NextResponse.json({ error: 'Could not load printer queue.' }, { status: 500 })
  return NextResponse.json({ tickets: data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await authorizePrintAgent(request)
  if (auth.error || !auth.client || !auth.profile) return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const { client, profile, roles } = auth
  if (!profile.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { ticketId?: unknown; status?: unknown } | null
  if (typeof body?.ticketId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.ticketId) || (body.status !== 'sent' && body.status !== 'failed' && body.status !== 'pending')) {
    return NextResponse.json({ error: 'Invalid ticket acknowledgement.' }, { status: 400 })
  }
  const { data: ticket, error: ticketError } = await client.from('kitchen_order_tickets')
    .select('id,destination_station').eq('id', body.ticketId)
    .eq('business_id', profile.business_id).eq('branch_id', profile.branch_id).maybeSingle()
  if (ticketError) return NextResponse.json({ error: 'Could not validate ticket.' }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  if (!roles.some((role) => role === 'owner' || role === 'manager' || role === stationRoles[ticket.destination_station as keyof typeof stationRoles])) {
    return NextResponse.json({ error: 'You cannot acknowledge this printer station.' }, { status: 403 })
  }
  const { error } = await client.from('kitchen_order_tickets').update({ print_status: body.status, updated_at: new Date().toISOString() }).eq('id', ticket.id)
  if (error) return NextResponse.json({ error: 'Could not update printer status.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

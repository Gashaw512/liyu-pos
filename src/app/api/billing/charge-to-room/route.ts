import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const isCashierOnly = (roles: string[]) => roles.length === 1 && roles[0] === 'cashier'

export async function GET() {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier', 'barman'])
  if (auth.error) return NextResponse.json({ enabled: false }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const admin = createAdminDatabaseClient()
  const { data: business, error } = await admin.from('businesses')
    .select('is_hotel_integrated')
    .eq('id', auth.profile!.business_id)
    .maybeSingle()
  if (error) return NextResponse.json({ enabled: false }, { status: 503 })
  return NextResponse.json({ enabled: Boolean(business?.is_hotel_integrated && isCashierOnly(auth.roles)) }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['cashier'])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  if (!isCashierOnly(auth.roles)) return NextResponse.json({ error: 'Only a cashier can charge a guest room.' }, { status: 403 })
  const admin = createAdminDatabaseClient()
  const { data: business, error: businessError } = await admin.from('businesses')
    .select('is_hotel_integrated')
    .eq('id', auth.profile!.business_id)
    .maybeSingle()
  if (businessError) return NextResponse.json({ error: 'Could not verify hotel integration.' }, { status: 503 })
  if (!business?.is_hotel_integrated) return NextResponse.json({ error: 'Room charges are not enabled for this business.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { saleId?: unknown; roomNumber?: unknown; validateOnly?: unknown } | null
  const profile = auth.profile!
  if (!profile.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })
  if (body?.validateOnly === true) {
    if (typeof body.roomNumber !== 'string' || !body.roomNumber.trim() || body.roomNumber.trim().length > 30) {
      return NextResponse.json({ error: 'Enter a valid room number.' }, { status: 400 })
    }
    const requestedRoom = body.roomNumber.trim().toLowerCase()
    const { data: folios, error } = await client.from('hotel_room_folios')
      .select('room_number')
      .eq('business_id', profile.business_id).eq('branch_id', profile.branch_id)
      .eq('status', 'active')
    if (error) return NextResponse.json({ error: 'Could not verify the guest folio.' }, { status: 500 })
    const folio = (folios ?? []).find((candidate) => candidate.room_number.trim().toLowerCase() === requestedRoom)
    if (!folio) return NextResponse.json({ error: 'No active guest folio exists for this room.' }, { status: 404 })
    return NextResponse.json({ success: true, roomNumber: folio.room_number })
  }
  if (typeof body?.saleId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.saleId)) {
    return NextResponse.json({ error: 'A valid sale is required.' }, { status: 400 })
  }
  try {
    const { data: sale, error: saleError } = await admin.from('sales')
      .select('id,cashier_id,business_id,branch_id,status')
      .eq('id', body.saleId).eq('business_id', profile.business_id).eq('branch_id', profile.branch_id).maybeSingle()
    if (saleError) throw saleError
    if (!sale) return NextResponse.json({ error: 'Sale not found in your branch.' }, { status: 404 })
    if (sale.cashier_id !== auth.user!.id) return NextResponse.json({ error: 'You cannot post another cashier’s sale.' }, { status: 403 })
    const { data: charge, error } = await admin.rpc('post_room_charge_for_sale', {
      p_business_id: profile.business_id,
      p_branch_id: profile.branch_id,
      p_sale_id: sale.id,
      p_actor_id: auth.user!.id,
    })
    if (error) throw error
    return NextResponse.json({ success: true, chargeId: charge })
  } catch (error) {
    console.error('[ROOM CHARGE] Failed to post folio charge:', error)
    return NextResponse.json({ error: 'Could not post this sale to the guest folio.' }, { status: 409 })
  }
}

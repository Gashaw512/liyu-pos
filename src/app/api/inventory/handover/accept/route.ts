import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'
import { acceptHandoverIntoCustodyShift } from '@/lib/kitchen/handoverService'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'inventory_clerk', 'cashier', 'waiter', 'barman', 'kitchen'])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const profile = auth.profile!
  if (!profile.business_id || !profile.branch_id) return NextResponse.json({ error: 'No business branch is assigned.' }, { status: 403 })

  const body = await request.json().catch(() => null) as { handoverId?: unknown; decision?: unknown; reason?: unknown } | null
  if (typeof body?.handoverId !== 'string' || !UUID.test(body.handoverId)
    || (body.decision !== 'accepted' && body.decision !== 'disputed')
    || (body.reason !== undefined && typeof body.reason !== 'string')) {
    return NextResponse.json({ error: 'Invalid handover response.' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null
  if (body.decision === 'disputed' && !reason) {
    return NextResponse.json({ error: 'Add a short reason before disputing the stock count.' }, { status: 400 })
  }

  const admin = createAdminDatabaseClient()
  try {
    const [handoverResult, receiverResult] = await Promise.all([
      admin.from('stock_handovers')
        .select('id,received_by_user_id,status')
        .eq('id', body.handoverId)
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .maybeSingle(),
      admin.from('profiles').select('is_active').eq('id', auth.user!.id).eq('business_id', profile.business_id).eq('branch_id', profile.branch_id).is('deleted_at', null).maybeSingle(),
    ])
    if (handoverResult.error || receiverResult.error) throw handoverResult.error ?? receiverResult.error
    const handover = handoverResult.data
    if (!receiverResult.data?.is_active) return NextResponse.json({ error: 'Your staff account is inactive.' }, { status: 403 })
    if (!handover) return NextResponse.json({ error: 'Handover not found.' }, { status: 404 })
    if (handover.received_by_user_id !== auth.user!.id) return NextResponse.json({ error: 'Only the selected recipient can verify this handover.' }, { status: 403 })

    if (body.decision === 'accepted') {
      try {
        const accepted = await acceptHandoverIntoCustodyShift(admin, {
          handoverId: handover.id,
          businessId: profile.business_id,
          branchId: profile.branch_id,
          recipientUserId: auth.user!.id,
        })
        return NextResponse.json({ success: true, handover: accepted })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not accept this handover.'
        const conflict = /already been resolved|not found|only the selected recipient/i.test(message)
        return NextResponse.json({ error: message }, { status: conflict ? 409 : 400 })
      }
    }

    const { data, error } = await admin
      .from('stock_handovers')
      .update({
        status: 'disputed',
        dispute_reason: reason,
        verified_at: new Date().toISOString(),
        verified_by: auth.user!.id,
      })
      .eq('id', handover.id)
      .eq('business_id', profile.business_id)
      .eq('branch_id', profile.branch_id)
      .eq('received_by_user_id', auth.user!.id)
      .eq('status', 'pending_verification')
      .select('id,status,dispute_reason,verified_at,verified_by')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'This handover has already been resolved.' }, { status: 409 })
    return NextResponse.json({ success: true, handover: data })
  } catch (error) {
    console.error('[STOCK HANDOVER] Verification failed:', error)
    return NextResponse.json({ error: 'Could not verify this handover.' }, { status: 500 })
  }
}

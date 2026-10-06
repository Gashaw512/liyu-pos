import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const recipientRoles = ['barman', 'kitchen', 'waiter', 'cashier']

export async function POST(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'inventory_clerk'])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const profile = auth.profile!
  if (!profile.business_id || !profile.branch_id) return NextResponse.json({ error: 'No business branch is assigned.' }, { status: 403 })

  const body = await request.json().catch(() => null) as {
    requestId?: unknown
    recipientUserId?: unknown
    productId?: unknown
    quantity?: unknown
  } | null
  const quantity = Number(body?.quantity)
  if (!body || typeof body.requestId !== 'string' || !UUID.test(body.requestId)
    || typeof body.recipientUserId !== 'string' || !UUID.test(body.recipientUserId)
    || typeof body.productId !== 'string' || !UUID.test(body.productId)
    || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Choose a recipient, product, and valid quantity.' }, { status: 400 })
  }
  if (body.recipientUserId === auth.user!.id) return NextResponse.json({ error: 'Choose another staff member to receive this stock.' }, { status: 400 })

  const admin = createAdminDatabaseClient()
  try {
    const [issuerResult, recipientResult, productResult] = await Promise.all([
      admin.from('profiles').select('is_active').eq('id', auth.user!.id).eq('business_id', profile.business_id).eq('branch_id', profile.branch_id).is('deleted_at', null).maybeSingle(),
      admin.from('profiles').select('id,role,is_active').eq('id', body.recipientUserId).eq('business_id', profile.business_id).eq('branch_id', profile.branch_id).eq('is_active', true).is('deleted_at', null).maybeSingle(),
      admin.from('products').select('id,branch_id,is_active,deleted_at').eq('id', body.productId).eq('business_id', profile.business_id).eq('is_active', true).is('deleted_at', null).maybeSingle(),
    ])
    if (issuerResult.error || recipientResult.error || productResult.error) throw issuerResult.error ?? recipientResult.error ?? productResult.error
    if (!issuerResult.data?.is_active) return NextResponse.json({ error: 'Your staff account is inactive.' }, { status: 403 })
    if (!recipientResult.data) return NextResponse.json({ error: 'The selected user is not active in this branch.' }, { status: 400 })
    if (!productResult.data || (productResult.data.branch_id && productResult.data.branch_id !== profile.branch_id)) {
      return NextResponse.json({ error: 'This product is not available in your branch.' }, { status: 400 })
    }
    const roleRows = await admin.from('profile_roles').select('role_name').eq('profile_id', body.recipientUserId)
    if (roleRows.error) throw roleRows.error
    const roles = new Set([recipientResult.data.role, ...(roleRows.data ?? []).map((row) => row.role_name)].filter(Boolean))
    if (![...roles].some((role) => recipientRoles.includes(role))) {
      return NextResponse.json({ error: 'Choose an active waiter, cashier, barman, or kitchen staff member.' }, { status: 400 })
    }
    const { data, error } = await admin.rpc('issue_stock_handover', {
      p_request_id: body.requestId,
      p_business_id: profile.business_id,
      p_branch_id: profile.branch_id,
      p_issued_by: auth.user!.id,
      p_received_by: body.recipientUserId,
      p_product_id: body.productId,
      p_recipient_shift_id: null,
      p_quantity: quantity,
    })
    if (error) {
      const conflict = /not enough|active shift|request ID was reused/i.test(error.message)
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 })
    }
    return NextResponse.json({ success: true, handover: data }, { status: 201 })
  } catch (error) {
    console.error('[STOCK HANDOVER] Issue failed:', error)
    return NextResponse.json({ error: 'Could not issue this stock.' }, { status: 500 })
  }
}

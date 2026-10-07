import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const recipientRoles = ['barman', 'kitchen', 'waiter', 'cashier']

type ReconciliationLineInput = {
  productId: string
  usedQuantity: number
  returnedQuantity: number
  wastedQuantity: number
  physicalCount: number
}

export async function POST(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, recipientRoles)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  }

  const profile = auth.profile!
  if (!profile.business_id || !profile.branch_id) {
    return NextResponse.json({ error: 'No business branch is assigned.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    requestId?: unknown
    lines?: unknown
  } | null
  if (typeof body?.requestId !== 'string' || !UUID.test(body.requestId) || !Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 500) {
    return NextResponse.json({ error: 'Submit a stock count for each product.' }, { status: 400 })
  }

  const lines: ReconciliationLineInput[] = []
  const seenProducts = new Set<string>()
  for (const raw of body.lines) {
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'The stock count contains an invalid product row.' }, { status: 400 })
    }
    const line = raw as Record<string, unknown>
    const quantities = [line.usedQuantity, line.returnedQuantity, line.wastedQuantity, line.physicalCount]
    if (typeof line.productId !== 'string' || !UUID.test(line.productId)
      || seenProducts.has(line.productId)
      || quantities.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: 'Enter zero or a valid quantity for every product.' }, { status: 400 })
    }
    seenProducts.add(line.productId)
    lines.push({
      productId: line.productId,
      usedQuantity: line.usedQuantity as number,
      returnedQuantity: line.returnedQuantity as number,
      wastedQuantity: line.wastedQuantity as number,
      physicalCount: line.physicalCount as number,
    })
  }

  const admin = createAdminDatabaseClient()
  const { data: activeProfile, error: profileError } = await admin
    .from('profiles')
    .select('is_active')
    .eq('id', auth.user!.id)
    .eq('business_id', profile.business_id)
    .eq('branch_id', profile.branch_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not verify your staff account.' }, { status: 500 })
  if (!activeProfile?.is_active) return NextResponse.json({ error: 'Your staff account is inactive.' }, { status: 403 })

  const { data, error } = await admin.rpc('submit_custody_stock_reconciliation', {
    p_request_id: body.requestId,
    p_business_id: profile.business_id,
    p_branch_id: profile.branch_id,
    p_actor_id: auth.user!.id,
    p_lines: lines.map((line) => ({
      product_id: line.productId,
      used_quantity: line.usedQuantity,
      returned_quantity: line.returnedQuantity,
      wasted_quantity: line.wastedQuantity,
      physical_count: line.physicalCount,
    })),
  })
  if (error) {
    const conflict = /already used|no open or pending custody count|does not match accepted stock|cannot exceed/i.test(error.message)
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 })
  }

  return NextResponse.json({ success: true, reconciliation: data })
}

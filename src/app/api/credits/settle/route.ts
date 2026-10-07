import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const METHODS = new Set(['cash', 'telebirr', 'cbe_birr', 'coop_bank', 'awash_bank', 'dashen_bank', 'bank_transfer'])

export async function GET(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier'])
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    if (!auth.profile?.branch_id) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })
    const saleId = new URL(request.url).searchParams.get('saleId')
    if (!saleId || !UUID.test(saleId)) return NextResponse.json({ error: 'A valid sale is required.' }, { status: 400 })
    const admin = createAdminDatabaseClient()
    const { data: sale, error: saleError } = await admin.from('sales')
      .select('id,customer_name,customer_phone,total_amount,amount_paid,outstanding_amount,payment_status')
      .eq('id', saleId).eq('business_id', auth.profile.business_id).eq('branch_id', auth.profile.branch_id).maybeSingle()
    if (saleError) throw saleError
    if (!sale) return NextResponse.json({ error: 'Credit sale not found.' }, { status: 404 })
    const { data: settlements, error: settlementsError } = await admin.from('credit_settlements')
      .select('id,amount,method,reference_no,actor_id,created_at')
      .eq('sale_id', saleId).eq('business_id', auth.profile.business_id).eq('branch_id', auth.profile.branch_id)
      .order('created_at', { ascending: true })
    if (settlementsError) throw settlementsError
    return NextResponse.json({ sale, settlements: settlements ?? [] })
  } catch (error) {
    console.error('[CreditSettlement] Could not load ledger:', error)
    return NextResponse.json({ error: 'Could not load the credit ledger.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier'])
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    if (!auth.profile?.branch_id || !auth.user) return NextResponse.json({ error: 'No active branch is assigned.' }, { status: 403 })

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const amount = Number(body?.amount)
    if (!body || typeof body.saleId !== 'string' || !UUID.test(body.saleId)
      || typeof body.idempotencyKey !== 'string' || !UUID.test(body.idempotencyKey)
      || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100
      || typeof body.method !== 'string' || !METHODS.has(body.method)) {
      return NextResponse.json({ error: 'Enter a valid sale, settlement amount, method, and retry key.' }, { status: 400 })
    }

    const admin = createAdminDatabaseClient()
    const { data, error } = await admin.rpc('settle_credit_sale', {
      p_business_id: auth.profile.business_id,
      p_branch_id: auth.profile.branch_id,
      p_sale_id: body.saleId,
      p_actor_id: auth.user.id,
      p_idempotency_key: body.idempotencyKey,
      p_amount: amount,
      p_method: body.method,
      p_reference_no: typeof body.referenceNo === 'string' ? body.referenceNo.trim().slice(0, 100) : null,
    })
    if (error) {
      const message = error.message.includes('outstanding balance')
        ? 'Settlement exceeds the amount still owed.'
        : 'Credit sale could not be settled. Check the sale and try again.'
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ success: true, settlement: Array.isArray(data) ? data[0] : data })
  } catch (error) {
    console.error('[CreditSettlement] Failed:', error)
    return NextResponse.json({ error: 'Could not record the settlement.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHIFT_LABELS = new Set(['Morning', 'Afternoon', 'Evening', 'Night', 'Full Day'])

export async function POST(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier'])
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json().catch(() => null) as {
      reportId?: unknown
      openedAt?: unknown
      openingCash?: unknown
      shiftLabel?: unknown
      closedAt?: unknown
      actualCash?: unknown
    } | null

    if (
      !body ||
      typeof body.reportId !== 'string' ||
      !UUID.test(body.reportId) ||
      typeof body.openedAt !== 'string' ||
      !Number.isFinite(Number(body.openingCash)) ||
      Number(body.openingCash) < 0
    ) {
      return NextResponse.json({ error: 'Invalid shift details.' }, { status: 400 })
    }

    const profile = auth.profile!
    const user = auth.user!
    if (!profile.business_id || !profile.branch_id) {
      return NextResponse.json({ error: 'No business branch is assigned to this account.' }, { status: 403 })
    }

    const openedAt = new Date(body.openedAt)
    const closedAt = typeof body.closedAt === 'string' ? new Date(body.closedAt) : null
    const actualCash = body.actualCash == null ? null : Number(body.actualCash)
    if (
      !Number.isFinite(openedAt.getTime()) ||
      openedAt.getTime() > Date.now() + 5 * 60_000 ||
      (closedAt && (!Number.isFinite(closedAt.getTime()) || closedAt < openedAt)) ||
      (actualCash != null && (!Number.isFinite(actualCash) || actualCash < 0))
    ) {
      return NextResponse.json({ error: 'Invalid shift time or cash amount.' }, { status: 400 })
    }

    const openingCash = Number(body.openingCash)
    const shiftLabel = typeof body.shiftLabel === 'string' && SHIFT_LABELS.has(body.shiftLabel)
      ? body.shiftLabel
      : 'Full Day'
    const closeFields = closedAt
      ? {
          status: 'closed' as const,
          closed_at: closedAt.toISOString(),
          closed_by: user.id,
          actual_cash: actualCash,
          actual_cash_reported: actualCash,
          closing_float: actualCash,
          expected_cash: openingCash,
          difference: actualCash == null ? null : actualCash - openingCash,
        }
      : { status: 'open' as const }

    const findOpenShift = async () => client
      .from('shifts')
      .select('*')
      .eq('business_id', profile.business_id!)
      .eq('branch_id', profile.branch_id!)
      .eq('cashier_id', user.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const closeExisting = async (shift: NonNullable<Awaited<ReturnType<typeof findOpenShift>>['data']>) => {
      if (!closedAt) return shift
      const { data, error } = await client
        .from('shifts')
        .update(closeFields)
        .eq('id', shift.id)
        .eq('business_id', profile.business_id!)
        .eq('branch_id', profile.branch_id!)
        .eq('cashier_id', user.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    }

    const { data: sameId, error: sameIdError } = await client
      .from('shifts')
      .select('*')
      .eq('id', body.reportId)
      .eq('business_id', profile.business_id)
      .eq('branch_id', profile.branch_id)
      .eq('cashier_id', user.id)
      .maybeSingle()
    if (sameIdError) throw sameIdError
    if (sameId) {
      const shift = closedAt ? await closeExisting(sameId) : sameId
      return NextResponse.json({ success: true, shift })
    }

    const { data: existingOpenShift, error: openShiftError } = await findOpenShift()
    if (openShiftError) throw openShiftError
    if (existingOpenShift) {
      const shift = closedAt ? await closeExisting(existingOpenShift) : existingOpenShift
      return NextResponse.json({ success: true, reused: true, shift })
    }

    const { data: inserted, error: insertError } = await client
      .from('shifts')
      .insert({
        id: body.reportId,
        business_id: profile.business_id,
        branch_id: profile.branch_id,
        cashier_id: user.id,
        opened_by: user.id,
        opened_at: openedAt.toISOString(),
        opening_cash: openingCash,
        opening_float: openingCash,
        shift_label: shiftLabel,
        ...closeFields,
      })
      .select('*')
      .single()

    if (!insertError && inserted) {
      return NextResponse.json({ success: true, shift: inserted })
    }

    if (insertError?.code === '23505') {
      const { data: racedShift, error: raceLookupError } = await findOpenShift()
      if (raceLookupError) throw raceLookupError
      if (racedShift) {
        const shift = closedAt ? await closeExisting(racedShift) : racedShift
        return NextResponse.json({ success: true, reused: true, shift })
      }
    }

    if (insertError) throw insertError
    return NextResponse.json({ error: 'Could not save the shift.' }, { status: 500 })
  } catch (error) {
    console.error('[SHIFT OPEN SYNC] Failed to persist shift:', error)
    return NextResponse.json({ error: 'Could not save the shift.' }, { status: 500 })
  }
}

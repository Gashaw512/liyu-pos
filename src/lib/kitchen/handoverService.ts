import type { createAdminDatabaseClient } from '@/lib/shift-reports/server'

type AdminClient = ReturnType<typeof createAdminDatabaseClient>

type CustodyScope = {
  businessId: string
  branchId: string
  userId: string
}

export async function getOrOpenCustodyShift(admin: AdminClient, scope: CustodyScope) {
  const { data: existing, error: lookupError } = await admin
    .from('custody_shifts')
    .select('id,user_id,branch_id,business_id,opened_at,status')
    .eq('business_id', scope.businessId)
    .eq('branch_id', scope.branchId)
    .eq('user_id', scope.userId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (lookupError) throw lookupError
  if (existing) return existing

  const { data: created, error: insertError } = await admin
    .from('custody_shifts')
    .insert({
      business_id: scope.businessId,
      branch_id: scope.branchId,
      user_id: scope.userId,
      status: 'ACTIVE',
      opened_at: new Date().toISOString(),
    })
    .select('id,user_id,branch_id,business_id,opened_at,status')
    .single()

  if (!insertError && created) return created

  // A concurrent first acceptance may have created the unique active row.
  if (insertError?.code === '23505') {
    const { data: concurrent, error } = await admin
      .from('custody_shifts')
      .select('id,user_id,branch_id,business_id,opened_at,status')
      .eq('business_id', scope.businessId)
      .eq('branch_id', scope.branchId)
      .eq('user_id', scope.userId)
      .eq('status', 'ACTIVE')
      .maybeSingle()
    if (error) throw error
    if (concurrent) return concurrent
  }

  throw insertError ?? new Error('Could not open a custody shift.')
}

export async function acceptHandoverIntoCustodyShift(
  admin: AdminClient,
  input: {
    handoverId: string
    businessId: string
    branchId: string
    recipientUserId: string
  },
) {
  const { data: handover, error: handoverError } = await admin
    .from('stock_handovers')
    .select('id,request_id,business_id,branch_id,received_by_user_id,product_id,quantity_issued,status,custody_shift_id')
    .eq('id', input.handoverId)
    .eq('business_id', input.businessId)
    .eq('branch_id', input.branchId)
    .maybeSingle()

  if (handoverError) throw handoverError
  if (!handover) throw new Error('Handover not found.')
  if (handover.received_by_user_id !== input.recipientUserId) {
    throw new Error('Only the selected recipient can verify this handover.')
  }
  if (handover.status !== 'pending_verification' && handover.status !== 'accepted') {
    throw new Error('This handover has already been resolved.')
  }

  const custodyShift = handover.status === 'accepted' && handover.custody_shift_id
    ? await admin
      .from('custody_shifts')
      .select('id,user_id,branch_id,business_id,opened_at,status')
      .eq('id', handover.custody_shift_id)
      .eq('business_id', input.businessId)
      .eq('branch_id', input.branchId)
      .eq('user_id', input.recipientUserId)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
    : await getOrOpenCustodyShift(admin, {
      businessId: input.businessId,
      branchId: input.branchId,
      userId: input.recipientUserId,
    })

  if (handover.status === 'pending_verification') {
    const { data: accepted, error: acceptError } = await admin
      .from('stock_handovers')
      .update({
        status: 'accepted',
        verified_at: new Date().toISOString(),
        verified_by: input.recipientUserId,
        custody_shift_id: custodyShift.id,
      })
      .eq('id', handover.id)
      .eq('business_id', input.businessId)
      .eq('branch_id', input.branchId)
      .eq('received_by_user_id', input.recipientUserId)
      .eq('status', 'pending_verification')
      .select('id,status,custody_shift_id,verified_at')
      .maybeSingle()

    if (acceptError) throw acceptError
    if (!accepted) {
      const { data: latest, error } = await admin
        .from('stock_handovers')
        .select('id,status,custody_shift_id,verified_at')
        .eq('id', handover.id)
        .eq('business_id', input.businessId)
        .eq('branch_id', input.branchId)
        .maybeSingle()
      if (error) throw error
      if (latest?.status !== 'accepted') throw new Error('This handover has already been resolved.')
    }
  } else if (!handover.custody_shift_id) {
    const { data: linked, error } = await admin
      .from('stock_handovers')
      .update({ custody_shift_id: custodyShift.id })
      .eq('id', handover.id)
      .eq('business_id', input.businessId)
      .eq('branch_id', input.branchId)
      .eq('status', 'accepted')
      .is('custody_shift_id', null)
      .select('custody_shift_id')
      .maybeSingle()
    if (error) throw error
    if (!linked) {
      const { data: current, error: currentError } = await admin
        .from('stock_handovers')
        .select('custody_shift_id')
        .eq('id', handover.id)
        .eq('business_id', input.businessId)
        .eq('branch_id', input.branchId)
        .single()
      if (currentError) throw currentError
      if (current.custody_shift_id !== custodyShift.id) throw new Error('This handover is already assigned to another custody shift.')
    }
  }

  // A unique handover_id makes retries safe. It also repairs the ledger if a
  // request was interrupted after the status transition but before this insert.
  const { data: ledgerEntry, error: ledgerError } = await admin
    .from('custody_shift_inventory')
    .upsert({
      business_id: input.businessId,
      branch_id: input.branchId,
      custody_shift_id: custodyShift.id,
      handover_id: handover.id,
      product_id: handover.product_id,
      quantity_received: handover.quantity_issued,
    }, { onConflict: 'handover_id', ignoreDuplicates: true })
    .select('custody_shift_id,product_id,quantity_received')
    .maybeSingle()

  if (ledgerError) throw ledgerError
  if (!ledgerEntry) {
    const { data: existingEntry, error } = await admin
      .from('custody_shift_inventory')
      .select('custody_shift_id,product_id,quantity_received')
      .eq('handover_id', handover.id)
      .single()
    if (error) throw error
    if (existingEntry.custody_shift_id !== custodyShift.id
      || existingEntry.product_id !== handover.product_id
      || Number(existingEntry.quantity_received) !== Number(handover.quantity_issued)) {
      throw new Error('Handover custody ledger does not match the accepted quantity.')
    }
  }

  return { ...handover, status: 'accepted' as const, custody_shift_id: custodyShift.id }
}

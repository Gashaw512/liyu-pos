import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createPasswordRecoveryAdminClient } from '@/lib/auth/passwordRecoveryAdmin'
import { generateRecoveryCode, hashRecoveryCode, normalizeEthiopianPhone } from '@/lib/auth/recoveryCode'
import { isPasswordRecoverySupportAgent } from '@/lib/auth/passwordRecoverySupport'

export const dynamic = 'force-dynamic'

const RECOVERY_CODE_TTL_MS = 365 * 24 * 60 * 60 * 1000
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireSupportAgent() {
  const sessionClient = await createClient()
  const { data: { user }, error } = await sessionClient.auth.getUser()

  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) }
  }

  if (!isPasswordRecoverySupportAgent(user.id)) {
    return { user: null, response: NextResponse.json({ error: 'Support access is not enabled for this account.' }, { status: 403 }) }
  }

  return { user, response: null }
}

export async function GET() {
  const support = await requireSupportAgent()
  if (!support.user) return support.response

  try {
    const admin = createPasswordRecoveryAdminClient()
    const { data, error } = await admin
      .from('password_recovery_support_requests')
      .select('id,contact_name,business_name,phone_e164,details,status,created_at')
      .in('status', ['pending', 'reviewing'])
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ requests: data ?? [] }, { status: 200 })
  } catch (error) {
    console.error('[password-recovery-support] Queue load failed:', error)
    return NextResponse.json({ error: 'Could not load the support queue.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const support = await requireSupportAgent()
  if (!support.user) return support.response

  let claimedRequestId: string | null = null

  try {
    const body = await request.json() as {
      requestId?: unknown
      identityVerified?: unknown
      verificationNotes?: unknown
    }
    const requestId = typeof body.requestId === 'string' ? body.requestId : ''
    const verificationNotes = typeof body.verificationNotes === 'string'
      ? body.verificationNotes.trim()
      : ''

    if (
      !REQUEST_ID_PATTERN.test(requestId) ||
      body.identityVerified !== true ||
      verificationNotes.length < 20 ||
      verificationNotes.length > 1000
    ) {
      return NextResponse.json({ error: 'Verify the requester and record a verification note before issuing a code.' }, { status: 400 })
    }

    const admin = createPasswordRecoveryAdminClient()
    const reviewingAt = new Date().toISOString()
    const { data: supportRequest, error: claimError } = await admin
      .from('password_recovery_support_requests')
      .update({
        status: 'reviewing',
        support_agent_id: support.user.id,
        support_notes: verificationNotes,
        updated_at: reviewingAt,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id,phone_e164')
      .maybeSingle()

    if (claimError) throw claimError
    if (!supportRequest) {
      return NextResponse.json({ error: 'This request is no longer pending.' }, { status: 409 })
    }
    claimedRequestId = supportRequest.id

    const phone = normalizeEthiopianPhone(supportRequest.phone_e164)
    if (!phone) throw new Error('The support request phone number is invalid.')

    const { data: profiles, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(2)

    if (profileError) throw profileError
    if (profiles?.length !== 1) {
      throw new Error('No unique active account matches the verified phone number.')
    }

    const userId = profiles[0].id
    const recoveryCode = generateRecoveryCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + RECOVERY_CODE_TTL_MS).toISOString()

    const { error: codeError } = await admin
      .from('password_recovery_codes')
      .upsert({
        user_id: userId,
        code_hash: hashRecoveryCode(recoveryCode),
        created_at: now.toISOString(),
        expires_at: expiresAt,
        consumed_at: null,
      }, { onConflict: 'user_id' })

    if (codeError) throw codeError

    const { error: completeError } = await admin
      .from('password_recovery_support_requests')
      .update({
        status: 'code_issued',
        code_issued_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', supportRequest.id)
      .eq('status', 'reviewing')

    if (completeError) throw completeError

    return NextResponse.json({ recoveryCode, expiresAt }, { status: 200 })
  } catch (error) {
    if (claimedRequestId) {
      const admin = createPasswordRecoveryAdminClient()
      await admin
        .from('password_recovery_support_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', claimedRequestId)
        .eq('status', 'reviewing')
    }

    console.error('[password-recovery-support] Code issuance failed:', error)
    return NextResponse.json({ error: 'Could not issue a recovery code. Verify the account and try again.' }, { status: 400 })
  }
}
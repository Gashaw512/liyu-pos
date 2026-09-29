import { NextResponse } from 'next/server'

import { createPasswordRecoveryAdminClient } from '@/lib/auth/passwordRecoveryAdmin'
import { normalizeEthiopianPhone, verifyRecoveryCode } from '@/lib/auth/recoveryCode'

export const dynamic = 'force-dynamic'

const GENERIC_INVALID_MESSAGE = 'Phone, recovery code, or password could not be verified.'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      phone?: unknown
      recoveryCode?: unknown
      password?: unknown
    }

    const phone = normalizeEthiopianPhone(body.phone)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!phone || typeof body.recoveryCode !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 })
    }

    const admin = createPasswordRecoveryAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 })
    }

    const { data: recovery, error: recoveryError } = await admin
      .from('password_recovery_codes')
      .select('code_hash, expires_at, consumed_at')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (recoveryError) throw recoveryError

    if (
      !recovery ||
      recovery.consumed_at ||
      Date.parse(recovery.expires_at) <= Date.now() ||
      !verifyRecoveryCode(body.recoveryCode, recovery.code_hash)
    ) {
      return NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 })
    }

    const consumedAt = new Date().toISOString()
    const { data: claim, error: claimError } = await admin
      .from('password_recovery_codes')
      .update({ consumed_at: consumedAt })
      .eq('user_id', profile.id)
      .eq('code_hash', recovery.code_hash)
      .is('consumed_at', null)
      .gt('expires_at', consumedAt)
      .select('user_id')
      .maybeSingle()

    if (claimError) throw claimError
    if (!claim) {
      return NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 })
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      profile.id,
      { password },
    )

    if (passwordError) {
      await admin
        .from('password_recovery_codes')
        .update({ consumed_at: null })
        .eq('user_id', profile.id)
        .eq('consumed_at', consumedAt)
      throw passwordError
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[password-recovery] Reset failed:', error)
    return NextResponse.json({ error: 'Password reset is temporarily unavailable. Please try again.' }, { status: 500 })
  }
}
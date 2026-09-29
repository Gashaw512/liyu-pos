import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createPasswordRecoveryAdminClient } from '@/lib/auth/passwordRecoveryAdmin'
import { generateRecoveryCode, hashRecoveryCode } from '@/lib/auth/recoveryCode'

export const dynamic = 'force-dynamic'

const RECOVERY_CODE_TTL_MS = 365 * 24 * 60 * 60 * 1000

export async function POST() {
  try {
    const sessionClient = await createClient()
    const { data: { user }, error: authError } = await sessionClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to generate a recovery code.' }, { status: 401 })
    }

    const admin = createPasswordRecoveryAdminClient()
    const recoveryCode = generateRecoveryCode()
    const now = new Date()
    const { error } = await admin
      .from('password_recovery_codes')
      .upsert({
        user_id: user.id,
        code_hash: hashRecoveryCode(recoveryCode),
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + RECOVERY_CODE_TTL_MS).toISOString(),
        consumed_at: null,
      }, { onConflict: 'user_id' })

    if (error) throw error

    return NextResponse.json({
      recoveryCode,
      expiresAt: new Date(now.getTime() + RECOVERY_CODE_TTL_MS).toISOString(),
    }, { status: 200 })
  } catch (error) {
    console.error('[password-recovery] Code issuance failed:', error)
    return NextResponse.json({ error: 'Could not create a recovery code. Please try again.' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

import { normalizeEthiopianPhone } from '@/lib/auth/recoveryCode'

export const dynamic = 'force-dynamic'

function normalizeName(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
    : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      code?: unknown
      fullName?: unknown
      phone?: unknown
    }

    const code = typeof body.code === 'string'
      ? body.code.trim().toUpperCase()
      : ''
    const fullName = normalizeName(body.fullName)
    const phone = normalizeEthiopianPhone(body.phone)

    if (!/^LY-[A-Z0-9-]{6,60}$/.test(code) || fullName.length < 2 || !phone) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Invitation validation is not configured.')
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: invitation, error } = await admin
      .from('staff_invitations')
      .select('staff_name,phone')
      .eq('code', code)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw error

    const valid = Boolean(
      invitation &&
      normalizeName(invitation.staff_name) === fullName &&
      normalizeEthiopianPhone(invitation.phone) === phone
    )

    return NextResponse.json({ valid }, { status: 200 })
  } catch (error) {
    console.error('[INVITATION] Validation request failed:', error)
    return NextResponse.json(
      { valid: false, error: 'Invitation validation is temporarily unavailable.' },
      { status: 503 },
    )
  }
}

import { NextResponse } from 'next/server'

import { createPasswordRecoveryAdminClient } from '@/lib/auth/passwordRecoveryAdmin'
import { normalizeEthiopianPhone } from '@/lib/auth/recoveryCode'
import { hashSupportRequestIp } from '@/lib/auth/passwordRecoverySupport'

export const dynamic = 'force-dynamic'

const REQUEST_WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_IP_PER_HOUR = 5
const ACCEPTED_RESPONSE = {
  success: true,
  message: 'If your request can be processed, support will review it.',
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      contactName?: unknown
      businessName?: unknown
      phone?: unknown
      details?: unknown
      website?: unknown
    }

    // Quietly accept honeypot submissions without storing spam.
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 })
    }

    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : ''
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
    const phone = normalizeEthiopianPhone(body.phone)
    const details = typeof body.details === 'string' ? body.details.trim() : ''

    if (
      contactName.length < 2 || contactName.length > 150 ||
      businessName.length < 2 || businessName.length > 200 ||
      !phone || details.length < 15 || details.length > 1000
    ) {
      return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 })
    }

    const admin = createPasswordRecoveryAdminClient()
    const forwardedAddress = request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'
    const requesterIpHash = hashSupportRequestIp(forwardedAddress)
    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS).toISOString()

    const { count, error: rateLimitError } = await admin
      .from('password_recovery_support_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_ip_hash', requesterIpHash)
      .gte('created_at', windowStart)

    if (rateLimitError) throw rateLimitError
    if ((count ?? 0) >= MAX_REQUESTS_PER_IP_PER_HOUR) {
      return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 })
    }

    const { error } = await admin
      .from('password_recovery_support_requests')
      .insert({
        contact_name: contactName,
        business_name: businessName,
        phone_e164: phone,
        details,
        requester_ip_hash: requesterIpHash,
      })

    if (error) throw error

    return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 })
  } catch (error) {
    console.error('[password-recovery-support] Request intake failed:', error)
    return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 })
  }
}
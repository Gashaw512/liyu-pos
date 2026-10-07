import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getAssignedProfileRoles } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > maxLength) return undefined
  return trimmed
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return json({ error: 'unauthorized' }, 401)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_id, role, full_name, deleted_at')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError || !profile) return json({ error: 'profile_missing' }, 404)
    const roles = await getAssignedProfileRoles(supabase, user.id, profile.role)

    let business = null
    if (profile.business_id) {
      const { data, error } = await supabase
        .from('businesses')
        .select('name, phone, email, address, city, is_hotel_integrated')
        .eq('id', profile.business_id)
        .maybeSingle()

      if (error) return json({ error: 'business_load_failed' }, 500)
      business = data
    }

    return json({
      profile: { fullName: profile.full_name },
      business,
      canEditBusiness: roles.includes('owner'),
    })
  } catch {
    return json({ error: 'load_failed' }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null)
    if (!isRecord(body) || (body.section !== 'account' && body.section !== 'business')) {
      return json({ error: 'invalid_request' }, 400)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return json({ error: 'unauthorized' }, 401)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_id, role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError || !profile) return json({ error: 'profile_missing' }, 404)
    const roles = await getAssignedProfileRoles(supabase, user.id, profile.role)

    if (body.section === 'account') {
      const fullName = optionalText(body.fullName, 150)
      if (!fullName || fullName.length < 2) {
        return json({ error: 'invalid_name' }, 400)
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) return json({ error: 'save_account_failed' }, 500)
      return json({ success: true, fullName })
    }

    if (!roles.includes('owner') || !profile.business_id) {
      return json({ error: 'business_owner_only' }, 403)
    }

    const name = optionalText(body.name, 200)
    const phone = optionalText(body.phone, 20)
    const emailProvided = Object.prototype.hasOwnProperty.call(body, 'email')
    const email = !emailProvided
      ? undefined
      : body.email == null
        ? null
        : optionalText(body.email, 255)
    const city = optionalText(body.city, 100)
    const address = optionalText(body.address, 500)
    if (body.is_hotel_integrated !== undefined && typeof body.is_hotel_integrated !== 'boolean') {
      return json({ error: 'invalid_hotel_setting' }, 400)
    }

    if (!name || name.length < 2) return json({ error: 'invalid_business_name' }, 400)
    if (phone === undefined || (phone && (!/^[+\d() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7))) {
      return json({ error: 'invalid_phone' }, 400)
    }
    if ((emailProvided && email === undefined) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return json({ error: 'invalid_email' }, 400)
    }
    if (city === undefined || address === undefined) return json({ error: 'field_too_long' }, 400)

    const { data, error } = await supabase
      .from('businesses')
      .update({
        name,
        phone,
        ...(emailProvided ? { email: email ?? null } : {}),
        city,
        address,
        ...(typeof body.is_hotel_integrated === 'boolean'
          ? { is_hotel_integrated: body.is_hotel_integrated }
          : {}),
      })
      .eq('id', profile.business_id)
      .select('name, phone, email, address, city, is_hotel_integrated')
      .maybeSingle()

    if (error) return json({ error: 'save_business_failed' }, 500)
    if (!data) return json({ error: 'business_owner_only' }, 403)

    return json({ success: true, business: data })
  } catch {
    return json({ error: 'save_failed' }, 500)
  }
}

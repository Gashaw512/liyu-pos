// src/app/api/reports/exports/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedProfile } from '@/lib/shift-reports/server'

export async function GET() {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client)
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'Unauthorized' ? 401 : 403 },
    )
  }

  return NextResponse.json({ available: false, message: 'Report exports are not available yet.' }, { status: 501 })
}

export async function POST() {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client)
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'Unauthorized' ? 401 : 403 },
    )
  }

  return NextResponse.json({ error: 'Report exports are not available yet.' }, { status: 501 })
}

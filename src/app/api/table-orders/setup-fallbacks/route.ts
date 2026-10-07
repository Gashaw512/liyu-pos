import { NextResponse } from 'next/server'

import { getAuthorizedProfile } from '@/lib/shift-reports/server'
import { createClient } from '@/lib/supabase/server'
import { FALLBACK_TABLES } from '@/lib/pos/tableDefaults'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager'])
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.error === 'Unauthorized' ? 401 : 403 },
      )
    }

    const profile = auth.profile!
    if (!profile.business_id || !profile.branch_id) {
      return NextResponse.json(
        { error: 'No business branch is assigned to this account.' },
        { status: 403 },
      )
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: existing, error: readError } = await client
        .from('restaurant_tables')
        .select('name')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .is('deleted_at', null)
      if (readError) throw readError

      const existingNames = new Set((existing ?? []).map((table) => table.name))
      const missingNames = FALLBACK_TABLES.filter((name) => !existingNames.has(name))
      if (missingNames.length === 0) {
        return NextResponse.json({ success: true, created: 0 })
      }

      const { error: insertError } = await client
        .from('restaurant_tables')
        .insert(missingNames.map((name) => ({
          business_id: profile.business_id!,
          branch_id: profile.branch_id!,
          name,
        })))

      if (!insertError) {
        return NextResponse.json({ success: true, created: missingNames.length })
      }

      // Another manager may have created these names concurrently. Re-read
      // once and treat it as success if the desired names now exist.
      if (insertError.code !== '23505' || attempt === 1) throw insertError
    }

    return NextResponse.json({ success: true, created: 0 })
  } catch (error) {
    console.error('[TABLE ORDERS] Failed to create fallback tables:', error)
    return NextResponse.json({ error: 'Could not create the default table names.' }, { status: 500 })
  }
}

// lib/auth/getBusinessId.ts
import createClient from '@/lib/supabase/client'

export async function getBusinessId() {
  const supabase = createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  return data?.business_id || null
}
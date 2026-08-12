// src/app/api/admin/db-maintenance/route.ts
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const executionLogs: string[] = []
  
  try {
    const { action } = await request.json()

    // 1. Authenticate the incoming request session safely
    const baseSupabase = await createServerClient()
    const { data: { user } } = await baseSupabase.auth.getUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // 2. Resolve target workspace business context mapping
    const { data: profile } = await baseSupabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.business_id || profile.role !== 'owner') {
      return NextResponse.json({ message: 'Forbidden: Admin clearance mismatch' }, { status: 403 })
    }

    const businessId = profile.business_id
    executionLogs.push(`Authenticated user as Owner of business unit UUID: ${businessId}`)

    // 3. Initialize high-privilege client using your secret server variable
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // =========================================================
    // TASK BLOCK A: RECONCILE DATA ALIGNMENT MATRIX
    // =========================================================
    if (action === 'reconcile_categories') {
      executionLogs.push("Fetching category records from database...")
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('business_id', businessId)

      executionLogs.push(`Found ${categories?.length || 0} active working category contexts.`)

      executionLogs.push("Auditing unlinked table rows in 'products'...")
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name, category_id')
        .eq('business_id', businessId)
        .is('category_id', null)

      executionLogs.push(`Found ${products?.length || 0} orphan items matching parameters.`)
      
      // Real-time loop patch mapping
      if (products && categories && products.length > 0) {
        for (const prod of products) {
          const matched = categories.find(c => c.name.toLowerCase() === prod.name.toLowerCase())
          if (matched) {
            await supabaseAdmin.from('products').update({ category_id: matched.id }).eq('id', prod.id)
            executionLogs.push(`Successfully linked item [${prod.name}] to Category [${matched.name}]`)
          }
        }
      }
    }

    // =========================================================
    // TASK BLOCK B: PURGE & WIPE WORKSPACE SCHEMAS
    // =========================================================
    if (action === 'wipe_demo_data') {
      executionLogs.push("Initiating cascaded database records wipe routine...")
      
      const { error: pErr } = await supabaseAdmin.from('products').delete().eq('business_id', businessId)
      if (pErr) throw pErr
      executionLogs.push("Table 'products' purged successfully.")

      const { error: cErr } = await supabaseAdmin.from('categories').delete().eq('business_id', businessId)
      if (cErr) throw cErr
      executionLogs.push("Table 'categories' purged successfully.")

      executionLogs.push("Workspace tables completely cleared to default state.")
    }

    return NextResponse.json({ success: true, logs: executionLogs })
  } catch (error: any) {
    return NextResponse.json({ message: error.message, logs: executionLogs }, { status: 500 })
  }
}

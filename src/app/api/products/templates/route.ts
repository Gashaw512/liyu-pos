import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Optional: Validate session context if your products are private
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Pull down static configurations from your Supabase cluster
    const [productsRes, categoriesRes, inventoryRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('inventory').select('*')
    ]);

    if (productsRes.error) throw productsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (inventoryRes.error) throw inventoryRes.error;

    // 3. Return the payload structured precisely for your sync engine's parsing loop
    return NextResponse.json({
      products: productsRes.data || [],
      categories: categoriesRes.data || [],
      inventory: inventoryRes.data || []
    }, { status: 200 });

  } catch (err: any) {
    console.error('Master reference catalog build failure:', err.message);
    return NextResponse.json(
      { error: 'Failed to build catalog configurations: ' + err.message },
      { status: 500 }
    );
  }
}
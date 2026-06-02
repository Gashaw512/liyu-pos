import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Validate session identity context securely
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || !body.transactions) {
      return NextResponse.json({ error: 'Missing transactions payload array' }, { status: 400 });
    }

    const { transactions } = body;
    const syncedIds: string[] = [];

    // Processes transactions sequentially 
    for (const tx of transactions) {
      if (tx.type === 'sale') {
        const { error: saleError } = await supabase
          .from('receipts')
          .insert({ 
            ...tx.payload, 
            created_at: new Date(tx.timestamp).toISOString() 
          });
        
        if (saleError) {
          // 🛠️ CRITICAL LOGGING: Shows exactly which field or key constraint is failing in terminal
          console.error(`Supabase Receipts Insert Rejection [TX: ${tx.id}]:`, saleError.message, saleError.details);
          continue; // Move to the next transaction instead of breaking the connection completely
        }
        
        syncedIds.push(tx.id);
      } 
      
      else if (tx.type === 'inventory_count') {
        const { error: invError } = await supabase
          .from('inventory_reconciliations')
          .insert({ 
            ...tx.payload, 
            checked_at: new Date(tx.timestamp).toISOString() 
          });

        if (invError) {
          console.error(`Supabase Reconciliations Insert Rejection [TX: ${tx.id}]:`, invError.message, invError.details);
          continue;
        }

        syncedIds.push(tx.id);
      }
    }

    // Always return a valid JSON object footprint, even if zero items synced successfully
    return NextResponse.json({ success: true, syncedIds });
  } catch (err: any) {
    console.error("Critical crash inside api/sync/route pipeline:", err.message);
    return NextResponse.json({ error: err.message || 'Internal Server Crash' }, { status: 500 });
  }
}
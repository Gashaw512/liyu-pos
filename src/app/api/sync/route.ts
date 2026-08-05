import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// ==========================================
// 1. DATA TRANSFORMATION & DATA TRANSFER OBJECTS (DTO)
// ==========================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SyncContext {
  mainBranchId: string | null;
  activeBusinessId: string | null;
  operatorUserId: string;
}

/**
 * Validates structural Postgres UUID string compliance
 */
const toValidUuid = (id: string | null | undefined, fallback: string | null = null): string | null => {
  if (!id) return fallback;
  return UUID_REGEX.test(id) ? id : fallback;
};

/**
 * Transforms raw offline client sale records to match exact database field definitions
 */
function transformSalePayload(payload: any, context: SyncContext, timestamp: string) {
  const resolvedBranch = payload.branch_id === 'branch_main' ? context.mainBranchId : toValidUuid(payload.branch_id);
  const resolvedBusiness = payload.business_id === 'biz_active' ? context.activeBusinessId : toValidUuid(payload.business_id);
  const resolvedCashier = toValidUuid(payload.cashier_id, context.operatorUserId);
  const resolvedShift = toValidUuid(payload.shift_id);

  if (!resolvedBranch || !resolvedBusiness) {
    throw new Error(`Incomplete system hierarchy references for sale sync.`);
  }

  return {
    id: payload.id,
    branch_id: resolvedBranch,
    business_id: resolvedBusiness,
    cashier_id: resolvedCashier,
    shift_id: resolvedShift,
    subtotal: payload.subtotal || payload.total_amount || 0,
    discount_amount: payload.discount_amount || 0,
    tax_amount: payload.tax_amount || 0,
    total_amount: payload.total_amount || 0,
    receipt_number: payload.receipt_number || `REC-${Date.now().toString().slice(-6)}`,
    status: payload.status || 'completed',
    is_offline_sync: true,
    created_at: timestamp
  };
}

/**
 * Formats order item layers, omitting generated database expressions like 'total_amount'
 */
function transformSaleItems(items: any[], saleId: string) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    sale_id: saleId,
    product_id: item.product_id,
    product_name: item.product_name || 'Item',
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    cost_price: Number(item.cost_price || 0)
    // 💡 total_amount is OMITTED. Postgres calculates this column automatically via expression rules.
  }));
}

/**
 * Standardizes downstream transaction ledger payment logs
 */
function transformPayments(payments: any[], saleId: string, businessId: string, timestamp: string) {
  if (!Array.isArray(payments)) return [];
  return payments.map((p) => ({
    sale_id: saleId,
    business_id: businessId,
    amount: Number(p.amount || 0),
    method: p.method || 'cash',
    status: 'completed',
    created_at: timestamp
  }));
}

// ==========================================
// 2. ROUTE CONTROLLER ENTRYPOINT
// ==========================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || !body.transactions) {
      return NextResponse.json({ error: 'Missing transactions payload array' }, { status: 400 });
    }

    // Context Resolution: Query active context profiles globally once per pipeline batch
    const [branchRes, businessRes] = await Promise.all([
      supabase.from('branches').select('id').eq('is_main', true).limit(1).maybeSingle(),
      supabase.from('businesses').select('id').eq('is_active', true).limit(1).maybeSingle()
    ]);

    let fallbackBusinessId = businessRes.data?.id || null;
    if (!fallbackBusinessId) {
      const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      fallbackBusinessId = fallbackBiz?.id || null;
    }

    const context: SyncContext = {
      mainBranchId: branchRes.data?.id || null,
      activeBusinessId: fallbackBusinessId,
      operatorUserId: user.id
    };

    const { transactions } = body;
    const syncedIds: string[] = [];

    // Processing Loop
    for (const tx of transactions) {
      const { id: txId, type, payload, timestamp } = tx;
      const formattedTimestamp = new Date(timestamp).toISOString();

      try {
        // ─── CASE A: SALE TRANSACTION ENGINE ───
        if (type === 'sale') {
          const cleanSale = transformSalePayload(payload, context, formattedTimestamp);
          const cleanItems = transformSaleItems(payload.items, payload.id);
          const cleanPayments = transformPayments(payload.payments, payload.id, cleanSale.business_id, formattedTimestamp);

          // Write parent row securely
          const { error: saleError } = await supabase.from('sales').insert(cleanSale);
          if (saleError) throw saleError;

          // Write multi-line sub-items cleanly
          if (cleanItems.length > 0) {
            const { error: itemsError } = await supabase.from('sale_items').insert(cleanItems);
            if (itemsError) throw itemsError;
          }

          // Write payment tracks safely
          if (cleanPayments.length > 0) {
            const { error: paymentsError } = await supabase.from('payments').insert(cleanPayments);
            if (paymentsError) throw paymentsError;
          }

          syncedIds.push(txId);
        } 
        
        // ─── CASE B: INVENTORY RECONCILIATION ENGINE ───
        else if (type === 'inventory_count') {
          const resolvedBranch = payload.branch_id === 'branch_main' ? context.mainBranchId : toValidUuid(payload.branch_id);
          const resolvedBusiness = payload.business_id === 'biz_active' ? context.activeBusinessId : toValidUuid(payload.business_id);
          
          if (!resolvedBranch || !resolvedBusiness) {
            throw new Error(`Incomplete database relations mapping for inventory sync.`);
          }

          const systemQty = Number(payload.system_quantity || payload.expected_quantity || 0);
          const countedQty = Number(payload.counted_quantity || 0);
          const varianceDelta = countedQty - systemQty;

          // Log movement trail record
          const { error: moveError } = await supabase.from('inventory_movements').insert({
            branch_id: resolvedBranch,
            business_id: resolvedBusiness,
            product_id: payload.product_id,
            user_id: context.operatorUserId,
            quantity: varianceDelta,
            movement_type: 'adjustment',
            notes: payload.notes || 'Hand counted via Mobile Sheet Form',
            created_at: formattedTimestamp
          });
          if (moveError) throw moveError;

          // Reconcile total inventory on-hand balance states
          const { error: invError } = await supabase.from('inventory').upsert({
            branch_id: resolvedBranch,
            business_id: resolvedBusiness,
            product_id: payload.product_id,
            quantity: countedQty,
            updated_at: formattedTimestamp
          }, {
            onConflict: 'branch_id,product_id'
          });
          if (invError) throw invError;

          syncedIds.push(txId);
        }
      } catch (txException: any) {
        // Log transaction exceptions safely without crashing the batch worker loop
        console.error(`[SYNC FAILURE - TX ID: ${txId}]:`, txException.message || txException);
      }
    }

    return NextResponse.json({ success: true, syncedIds });
  } catch (err: any) {
    console.error("Critical routing pipeline failure:", err.message);
    return NextResponse.json({ error: 'Internal Server Sync Pipeline Crash' }, { status: 500 });
  }
}
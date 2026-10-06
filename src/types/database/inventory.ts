// export interface Inventory {}
// export interface InventoryMovement {}
// export interface StockReconciliation {}
// export interface Purchase {}
// export interface PurchaseItem {}


// src/types/database/inventory.ts

import type { MovementType, PurchaseStatus } from '../enum';

/* ============================================================================
 * 1. INVENTORY MATRIX (public.inventory)
 * ========================================================================== */
export interface Inventory {
  id: string; // UUID Primary Key
  business_id: string; // Tenant FK
  branch_id: string; // Location Branch FK
  product_id: string; // Product Target FK
  quantity: number; // NUMERIC(10,2) supports precision weights
  updated_at: string; // TIMESTAMP WITH TIME ZONE
}

/* ============================================================================
 * 2. INVENTORY MOVEMENTS LOGS (public.inventory_movements)
 * ========================================================================== */
export interface InventoryMovement {
  id: string; // UUID Primary Key
  business_id: string;
  branch_id: string;
  product_id: string;
  user_id: string | null; // Profile FK performing action
  movement_type: MovementType; // Strict: 'sale' | 'purchase' | 'adjustment' etc.
  quantity: number; // NUMERIC(10,2)
  balance_after: number | null;
  unit_cost: number | null; // Optional baseline pricing valuation
  reference_id: string | null; // Optional link to specific source document Container ID
  reference_type: string | null; // E.g., 'purchase_id', 'sale_id'
  notes: string | null;
  created_at: string;
}

/* ============================================================================
 * 3. PURCHASES (public.purchases)
 * ========================================================================== */
export interface Purchase {
  id: string; // UUID Primary Key
  business_id: string;
  branch_id: string;
  supplier_id: string | null; // FK to Suppliers
  created_by: string | null; // Profile FK creator
  reference_no: string | null; // Supplier invoice or tracking number reference
  total_amount: number;
  paid_amount: number | null;
  status: PurchaseStatus; // Strict: 'pending' | 'received' | 'partial'
  notes: string | null;
  purchased_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ============================================================================
 * 4. PURCHASE ITEMS (public.purchase_items)
 * ========================================================================== */
export interface PurchaseItem {
  id: string; // UUID Primary Key
  purchase_id: string; // Parent Purchase FK
  product_id: string; // Target Product FK
  quantity: number;
  unit_cost: number;
  
  /**
   * ⚠️ DATABASE GENERATED ALWAYS AS COLUMN
   * Calculated automatically inside PostgreSQL. Do not pass during outbound sync writes!
   */
  total_cost: number; 
}

/** A received inventory batch with its remaining FIFO quantity. */
export interface InventoryCostLayer {
  id: string;
  fifo_sequence: number;
  business_id: string;
  branch_id: string;
  product_id: string;
  source_movement_id: string | null;
  received_at: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  created_at: string;
}

/** The batch-level cost portions assigned to a sale item. */
export interface InventoryCostAllocation {
  id: string;
  sale_item_id: string;
  cost_layer_id: string | null;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

/** A server-recorded issue/acceptance entry for branch stock custody. */
export type StockHandoverStatus = 'pending_verification' | 'accepted' | 'disputed';

export interface StockHandover {
  id: string;
  request_id: string;
  business_id: string;
  branch_id: string;
  issued_by_clerk_id: string;
  received_by_user_id: string;
  product_id: string;
  recipient_shift_id: string | null;
  custody_shift_id: string | null;
  quantity_issued: number;
  status: StockHandoverStatus;
  dispute_reason: string | null;
  issued_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export type CustodyShiftStatus = 'ACTIVE' | 'CLOSED';

export interface CustodyShift {
  id: string;
  business_id: string;
  branch_id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  closed_by: string | null;
  status: CustodyShiftStatus;
  close_reason: string | null;
  created_at: string;
}

export interface CustodyShiftInventoryEntry {
  id: string;
  business_id: string;
  branch_id: string;
  custody_shift_id: string;
  handover_id: string;
  product_id: string;
  quantity_received: number;
  accepted_at: string;
}

export interface CustodyShiftReconciliation {
  id: string;
  business_id: string;
  branch_id: string;
  custody_shift_id: string;
  closed_by: string;
  closed_at: string;
  accepted_stock_snapshot: Array<{
    product_id: string;
    product_name: string;
    quantity_received: number;
    physical_count: number | null;
    difference: number | null;
  }>;
  physical_count_snapshot: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
  }> | null;
  created_at: string;
}

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
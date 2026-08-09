// src/types/inventory.ts

import type { UnitOfMeasure, MovementType } from './enum';

/* ============================================================================
 * 1. RICH BUSINESS LAYOUT VIEW MODELS
 * ========================================================================== */

/**
 * 📊 Flattened presentation model optimized for single-row list components.
 * Guarantees zero duplicate product lines while mapping clear category descriptions.
 */
export interface InventoryProduct {
  id: string; // Product UUID
  name: string;
  name_am: string | null;
  barcode: string | null;
  sku: string | null;
  unit_type: UnitOfMeasure; // Extracted from Product definition parameters
  retail_price: number; // Hard server snapshot baseline
  cost_price: number;
  
  // Joined Category parameters
  category_id: string | null;
  category_name: string;
  category_name_am: string | null;
  category_icon: string;
  category_color: string;
  
  // Real-time calculated matrix value from the localized branch cache
  opening_count: number; 
}

/**
 * Tracks explicit lower threshold bounds for emergency dashboard alerts.
 */
export interface LowStockItem {
  productId: string;
  productName: string;
  productNameAm: string | null;
  quantity: number;
  threshold: number;
  unitType: UnitOfMeasure;
}

/**
 * Manages manual inline runtime inventory overrides in managerial layouts.
 */
export interface InventoryAdjustment {
  productId: string;
  oldQty: number;
  newQty: number;
  reason: 'counting_error' | 'waste' | 'theft' | 'spoiled' | 'opening_stock';
  notes: string | null;
}

/* ============================================================================
 * 2. INDEXEDDB LOCAL FIRST WRITE OUTBOX QUEUES
 * ========================================================================== */

/**
 * 💾 INDEXEDDB OUTBOX CONTRACT FOR STOCK COUNTS
 * Purpose: Structure used to store physical stock assessments inside the local browser 
 * queue table ('pending_stock_reconciliations') until a reliable network connection is found.
 */
export interface LocalPendingStockCount {
  // Local PWA synchronization lifecycles
  localId: string; // Pre-generated client UUID tracker keypath
  createdAt: string; // ISO creation stamp
  retryCount: number;
  syncStatus: 'pending' | 'failed';

  // Transaction payloads destined for processing scripts on the server
  product_id: string;
  business_id: string;
  branch_id: string;
  shift_id: string | null; // Keeps accountability metrics bound to the drawer shift session
  counted_quantity: number;
  system_quantity: number; // Aggregated baseline at moment of capture
  notes: string | null;
}

/**
 * Live computed stock metadata for UI rendering layer
 */
export interface LiveMetaData {
  systemCount: number
  hasPendingTransactions: boolean
}
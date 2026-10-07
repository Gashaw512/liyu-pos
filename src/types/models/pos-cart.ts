// src/types/models/pos-cart.ts

import type { CreateSaleDTO } from '../dto/sales-sync.dto';
import type { Sale, SaleItem, Payment } from '../database/sales';

/* ============================================================================
 * 1. GLOBAL OFFLINE LIFECYCLE METADATA
 * ========================================================================== */

export interface OfflineSyncMeta {
  /**
   * Unique browser tracking identifier.
   */
  localId: string

  /**
   * ISO timestamp when the transaction was created locally.
   */
  createdAt: string

  /**
   * Number of synchronization attempts.
   */
  retryCount: number

  /**
   * Current synchronization state.
   */
  syncStatus: 'pending' | 'syncing' | 'failed'

  /**
   * Last time synchronization was attempted.
   */
  lastSyncAttempt?: string

  /**
   * Last synchronization error.
   */
  lastSyncError?: string
}

/* ============================================================================
 * 2. TRANSACTIONAL VIEW MODELS
 * ========================================================================== */

export type LocalPendingSale =
  CreateSaleDTO & OfflineSyncMeta;

/**
 * Historical sale stored locally after successful completion.
 */
export type LocalHistoricalSale =
  Sale & {
    items: SaleItem[];
    payments: Payment[];
    localSyncStatus?: 'pending' | 'synced' | 'failed';
  };

/* ============================================================================
 * 3. HOSPITALITY / RESTAURANT DOMAIN MODELS
 * ========================================================================== */

export interface LocalOpenTab {
  id: string;
  table_number: string;
  updated_at: string;
  table_id?: string;
  business_id?: string;
  branch_id?: string;
  cashier_id?: string;
  revision?: number;

  items: Array<{
    product_id: string;
    product_name: string;
    product_name_am?: string | null;
    quantity: number;
    unit_price: number;
    price_proof?: string;
  }>;

  total_accumulated: number;
}

export interface LocalPendingTableOrder {
  localId: string;
  tableId: string;
  tableNumber: string;
  businessId?: string;
  branchId?: string;
  cashierId?: string;
  operation: 'save' | 'complete' | 'cancel';
  baseItems: LocalOpenTab['items'];
  items: LocalOpenTab['items'];
  totalAmount: number;
  saleId?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface LocalTableConfiguration {
  id: string;
  name: string;
  table_number?: string | number;
  business_id?: string;
  branch_id?: string;
  status?: 'vacant' | 'occupied' | 'dirty' | 'reserved';
}

/* ============================================================================
 * 4. FRONTEND CART
 * ========================================================================== */

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;

  product_id?: string;
  product_name?: string;
  unit_price?: number;
}

/* ============================================================================
 * 5. PAYMENT METHODS
 * ========================================================================== */

export type PaymentMethod =
  | 'cash'
  | 'telebirr'
  | 'cbe_birr'
  | 'awash_bank'
  | 'bank_transfer'
  | 'credit'
  | 'room_charge';

export interface PaymentSplit {
  cash: number
  telebirr: number
  cbe_birr: number
  awash_bank: number
  bank_transfer: number
  credit: number
  room_charge: number
}

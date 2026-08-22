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
  syncStatus: 'pending' | 'failed'

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
  };

/* ============================================================================
 * 3. HOSPITALITY / RESTAURANT DOMAIN MODELS
 * ========================================================================== */

export interface LocalOpenTab {
  id: string;
  table_number: string;
  updated_at: string;

  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;

  total_accumulated: number;
}

export interface LocalTableConfiguration {
  id: string;
  name: string;
  table_number?: string | number;
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
  | 'card'
  | 'credit';
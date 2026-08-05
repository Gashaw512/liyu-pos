// src/types/model/pos-cart.ts

import type { CreateSaleDTO } from '../dto/sales-sync.dto';
import type { Sale, SaleItem, Payment } from '../database/sales';

/* ============================================================================
 * 1. GLOBAL OFFLINE LIFECYCLE METADATA
 * ========================================================================== */

/**
 * Global tracking contract injected into any transactional record 
 * waiting in the local browser outbox queue to be synced to the cloud.
 */
export interface OfflineSyncMeta {
  /**
   * Unique browser tracking identifier (UUID or timestamp keypath).
   */
  localId: string;
  
  /**
   * ISO Timestamp string recording exactly when the cashier confirmed the action offline.
   */
  createdAt: string;
  
  /**
   * Counter tracking failed network synchronization handshakes.
   */
  retryCount: number;
  
  /**
   * Safe status flag determining state visibility across local UI elements.
   */
  syncStatus: 'pending' | 'failed';
}

/* ============================================================================
 * 2. TRANSACTIONAL VIEW MODELS
 * ========================================================================== */

/**
 * 🛒 THE INDEXEDDB OUTBOX PAYLOAD FOR SALES
 * Intersects your clean transactional network DTO with local browser sync control properties.
 * Maps to: IndexedDB -> 'pending_sales' store.
 */
export type LocalPendingSale = CreateSaleDTO & OfflineSyncMeta;

/**
 * 📜 THE UNIFIED HISTORICAL LOG MODEL
 * Combines the flat, normalized database tables into a deep nested format 
 * for sub-millisecond, lag-free rendering of past receipts while offline.
 * Maps to: IndexedDB -> 'completed_sales_history' store.
 */
export type LocalHistoricalSale = Sale & {
  items: SaleItem[];
  payments: Payment[];
};

/* ============================================================================
 * 3. HOSPITALITY / RESTAURANT DOMAIN MODELS
 * ========================================================================== */

/**
 * 🍽️ WAITER ACTIVE OPEN TABS
 * Captures incremental line item logs for active tables before final checkout settlement.
 * Maps to: IndexedDB -> 'open_tabs' store.
 */
export interface LocalOpenTab {
  /**
   * Matches the unique Table UUID session key tracker.
   */
  id: string;
  table_number: string;
  updated_at: string;
  
  /**
   * Temporary nested line item array optimized for quick modifiers inside restaurant layouts.
   */
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  total_accumulated: number;
}

/**
 * 🪑 DYNAMIC TABLES CONFIGURATION MAP
 * Manages spatial layouts, table labels, and real-time operational availability states.
 * Maps to: IndexedDB -> 'tables' store.
 */
export interface LocalTableConfiguration {
  id: string;
  name: string;
  table_number?: string | number;
  status?: 'vacant' | 'occupied' | 'dirty' | 'reserved';
}
// src/types/dto/sales-sync.dto.ts

import type { PaymentMethod, TransactionStatus } from '../enum';

/**
 * DATA TRANSFER OBJECT (DTO)
 * Purpose: Packages an entire checkout event (Header + Lines + Payments) 
 * for optimized network transit and atomic execution.
 * * Boundary Rule: Contains ZERO database timestamps (created_at, updated_at) 
 * and ZERO UI sync states (syncStatus, retryCount). It holds pure transactional intent.
 */
export interface CreateSaleDTO {
  /**
   * Client-generated UUID that maps directly to `Sale.id`.
   * Essential for guaranteeing network IDEMPOTENCY (prevents duplicate sales if retried).
   */
  offline_id: string;

  business_id: string;
  branch_id: string;
  shift_id: string | null;
  cashier_id: string | null;
  receipt_number: string;

  // Financial Metrics (Absolute Primitive values calculated at point of checkout)
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  tip_amount: number;

  status: TransactionStatus;

  // Optional Context Metadata
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  
  // Hospitality Domain Extensions (Nullable for standard retail transactions)
  table_id: string | null;
  table_name: string | null;

  // Security & Audit Tracking
  device_id: string | null;

  /**
   * 🛒 NESTED CARGO LINES
   * Maps directly to what will become rows in `public.sale_items`.
   * Note: `id`, `sale_id`, `total_amount`, and `gross_profit` are OMITTED here 
   * because the database auto-computes or auto-generates them upon insertion!
   */
  items: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    cost_price: number;
    quantity: number;
    discount: number;
    price_proof?: string;
  }>;

  /**
   * 💳 NESTED BILL SETTLEMENT PAYMENTS
   * Maps directly to what will become rows in `public.payments`.
   * Supports split-payment configurations (e.g., Half Cash, Half Telebirr).
   */
  payments: Array<{
    id: string; // Pre-generated client-side payment row UUID
    method: PaymentMethod;
    amount: number;
    reference_no: string | null; // Crucial for transaction reconciliation tracking
    status: 'completed' | 'pending' | 'failed';
  }>;
}

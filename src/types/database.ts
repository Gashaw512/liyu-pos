/* ─── DOMAIN VALIDATION LITERAL ENUMS ───────────────────────────────────── */
export type BusinessPlan = 'starter' | 'business' | 'pro';
export type BusinessVertical = 'bar_restaurant' | 'cafe_restaurant' | 'bar_traditional' | 'retail_kiosk' | 'service_hospitality' | 'other';
export type StaffRole = 'owner' | 'manager' | 'cashier' | 'inventory_clerk';
export type UnitOfMeasure = 'piece' | 'bottle' | 'crate' | 'kg' | 'gram' | 'liter' | 'ml' | 'pack';
export type MovementType = 'sale' | 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'waste' | 'theft' | 'return' | 'opening';
export type PurchaseStatus = 'pending' | 'received' | 'partial';
export type ShiftLabel = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day';
export type ShiftStatus = 'open' | 'closed' | 'suspended';
export type TransactionStatus = 'completed' | 'voided' | 'refunded' | 'pending';
export type LocalPaymentMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'coop_bank' | 'awash_bank' | 'dashen_bank' | 'bank_transfer' | 'credit';

/* ─── 1. BUSINESSES ─────────────────────────────────────────────────────── */
export interface Business {
  id: string; // UUID
  name: string;
  type: BusinessVertical;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string; // Default 'Addis Ababa'
  logo_url: string | null;
  currency: string; // Default 'ETB'
  timezone: string; // Default 'Africa/Addis_Ababa'
  language: string; // Default 'am'
  tax_rate: number;
  is_active: boolean;
  plan: BusinessPlan;
  trial_ends_at: string | null; // ISO Date-string
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ─── 2. BRANCHES ───────────────────────────────────────────────────────── */
export interface Branch {
  id: string; // UUID
  business_id: string; // FK to Business
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

/* ─── 3. PROFILES ───────────────────────────────────────────────────────── */
export interface Profile {
  id: string; // UUID - Maps directly to auth.users
  business_id: string | null; // Nullable until onboarding sequence is finished
  branch_id: string | null;
  full_name: string;
  phone: string | null;
  pin_hash: string | null; // Protected system storage hash string
  role: StaffRole;
  language: string; // Default 'am'
  avatar_url: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ─── 4. CATEGORIES ─────────────────────────────────────────────────────── */
export interface Category {
  id: string; // UUID
  business_id: string;
  name: string; // English standard name
  name_am: string | null; // Amharic local rendering string
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

/* ─── 5. PRODUCTS ───────────────────────────────────────────────────────── */
export interface Product {
  id: string; // UUID
  business_id: string;
  branch_id: string | null;
  category_id: string | null;
  name: string;
  name_am: string | null;
  barcode: string | null;
  sku: string | null;
  unit_type: UnitOfMeasure;
  units_per_crate: number;
  cost_price: number;
  retail_price: number;
  tax_inclusive: boolean;
  image_url: string | null;
  is_active: boolean;
  is_sold_by_weight: boolean;
  track_inventory: boolean;
  low_stock_alert: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ─── 6. SUPPLIERS ──────────────────────────────────────────────────────── */
export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

/* ─── 7. INVENTORY ──────────────────────────────────────────────────────── */
export interface Inventory {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  quantity: number; // Support precision decimals for sold by weight items
  updated_at: string;
}

/* ─── 8. STOCK RECONCILIATION ───────────────────────────────────────────── */
export interface StockReconciliation {
  id: string;
  business_id: string;
  branch_id: string;
  shift_id: string | null;
  product_id: string;
  counted_by: string | null; // Profile ID reference
  recon_date: string; // format "YYYY-MM-DD"
  opening_qty: number;
  added_qty: number;
  closing_qty: number;
  logged_sales_qty: number;
  discrepancy_qty: number; // Managed database auto-computed column
  discrepancy_value: number | null; // Auto-calculated via trigger (qty * retail_price)
  notes: string | null;
  is_verified: boolean;
  verified_by: string | null;
  created_at: string;
}

/* ─── 9. INVENTORY MOVEMENTS ────────────────────────────────────────────── */
export interface InventoryMovement {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  user_id: string | null;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null; // Target document source container index
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

/* ─── 10. PURCHASES ─────────────────────────────────────────────────────── */
export interface Purchase {
  id: string;
  business_id: string;
  branch_id: string;
  supplier_id: string | null;
  created_by: string | null;
  reference_no: string | null;
  total_amount: number;
  paid_amount: number;
  status: PurchaseStatus;
  notes: string | null;
  purchased_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number; // Generated column database side
}

/* ─── 11. SHIFTS ────────────────────────────────────────────────────────── */
export interface Shift {
  id: string;
  business_id: string;
  branch_id: string;
  cashier_id: string;
  opened_by: string | null;
  closed_by: string | null;
  shift_label: ShiftLabel;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  expected_cash: number;
  actual_cash_reported: number | null;
  cash_discrepancy: number | null; // Generated column (reported - expected)
  total_sales: number;
  total_transactions: number;
  status: ShiftStatus;
  notes: string | null;
  created_at: string;
}

/* ─── 12. SALES ─────────────────────────────────────────────────────────── */
export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  shift_id: string | null;
  cashier_id: string | null;
  receipt_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: TransactionStatus;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  is_offline_sync: boolean;
  offline_id: string | null; // Tracks localId from device cart logs
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  deleted_at: string | null;
}

/* ─── 13. SALE ITEMS ────────────────────────────────────────────────────── */
export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  discount: number;
  total_amount: number; // Computed database generation side
  gross_profit: number; // Computed database generation side
  created_at: string;
}

/* ─── 14. PAYMENTS ──────────────────────────────────────────────────────── */
export interface Payment {
  id: string;
  sale_id: string;
  business_id: string;
  method: LocalPaymentMethod;
  amount: number;
  reference_no: string | null;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

/* ─── 15. EXPENSES ──────────────────────────────────────────────────────── */
export interface Expense {
  id: string;
  business_id: string;
  branch_id: string | null;
  recorded_by: string | null;
  shift_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string; // defaults to 'cash'
  receipt_url: string | null;
  expense_date: string;
  created_at: string;
  deleted_at: string | null;
}

/* ─── 16. AUDIT LOGS ────────────────────────────────────────────────────── */
export interface AuditLog {
  id: string;
  business_id: string | null;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/* ─── 17. APP INTERMEDIARY SYNC LOGS (LOCAL DEVICE EXTENSIONS) ───────────── */

/**
 * Maps out structural payloads for checkout lines locally inside your state system
 * before syncing to Supabase.
 */
export interface PendingSale {
  offline_id: string;
  shift_id: string;
  branch_id: string;
  cashier_id: string;
  receipt_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: LocalPaymentMethod;
  reference_no: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    discount: number;
  }>;
}

/**
 * Capture frame definition for quick local physical counter operations.
 */
export interface StockCount {
  localId: string;
  product_id: string;
  business_id: string;
  branch_id: string;
  counted_quantity: number;
  system_quantity: number;
  notes: string | null;
}
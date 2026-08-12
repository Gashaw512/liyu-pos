export type StaffRole =
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'inventory_clerk'
  | 'waiter'
  | 'barman'
  | 'kitchen';

  export type BusinessPlan =
  | 'starter'
  | 'business'
  | 'pro';

  export type PaymentMethod =
  | 'cash'
  | 'telebirr'
  | 'cbe_birr';
  export type BusinessVertical =
  | 'retail'
  | 'restaurant'
  | 'service';

  export type UnitOfMeasure =
  | 'piece'
  | 'kg'
  | 'liter'
  | 'box'
  | 'pack'
  | 'set'
  | 'crate';

export type TransactionStatus =
  'completed'
| 'pending'
| 'failed'
| 'refunded'


export type ShiftLabel = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day';
export type ShiftStatus = 'open' | 'closed' | 'suspended';

// import type { MovementType, PurchaseStatus } from '../enum';
 export type MovementType= 'sale'|'purchase'|'adjustment'|'transfer_in'|'transfer_out'|'waste'|'theft'|'return'|'opening'
 export type PurchaseStatus= 'pending'|'received'|'partial'

// Not database entities.
// Inventory workflow models.
export interface InventoryProduct{
    id: string
    name:string
    name_am: string | null
    category_id: string | null
    category_name: string | null
    category_name_am: string | null
    category_icon?: string | null
    opening_count: number
    category_color: string | null
}
export interface LowStockItem {
  productId: string;
  productName: string;
  quantity: number;
  threshold: number;
}

export interface InventoryAdjustment {
  productId: string;
  oldQty: number;
  newQty: number;
  reason: string;
}
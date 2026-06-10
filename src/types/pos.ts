
// These are not database tables. They are TypeScript interfaces that define the structure of data used in the application.
export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface ReceiptData {
  receiptNumber: string;
  cashierName: string;
  items: CartItem[];
  totalAmount: number;
}
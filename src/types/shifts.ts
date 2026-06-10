// Not the database Shift entity. This is a TypeScript interface that defines the structure of data used in the application.
// Business/UI types.
export interface ShiftSummary {
  shiftId: string;
  cashierName: string;
  totalSales: number;
  transactionCount: number;
}

export interface ShiftClosePayload {
  actualCash: number;
  notes?: string;
}
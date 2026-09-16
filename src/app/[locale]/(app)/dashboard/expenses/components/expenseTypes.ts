export interface Expense {
  id: string
  category: string
  description: string | null
  amount: number | string | null
  payment_method: string | null
  expense_date: string
  branch_id: string | null
  shift_id: string | null
  created_at: string
}
'use client'

import {
  Trash2,
} from 'lucide-react'

interface ExpenseActionResult {
  success: boolean
  error?: string
}

type ExpenseAction = (
  formData: FormData,
) => Promise<ExpenseActionResult>

interface ExpenseDeleteButtonProps {
  expenseId: string
  action: ExpenseAction
  isAm: boolean
}

export default function ExpenseDeleteButton({
  expenseId,
  action,
  isAm,
}: ExpenseDeleteButtonProps) {
  const handleDelete = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const confirmed = window.confirm(
      isAm
        ? 'ይህን ወጪ መሰረዝ ይፈልጋሉ?'
        : 'Delete this expense?',
    )

    if (!confirmed) {
      return
    }

    const formData = new FormData(
      event.currentTarget,
    )

    const result = await action(formData)

    if (!result.success) {
      window.alert(
        result.error ??
          (isAm
            ? 'ወጪውን መሰረዝ አልተቻለም።'
            : 'Failed to delete expense.'),
      )
    }
  }

  return (
    <form onSubmit={handleDelete}>
      <input
        type="hidden"
        name="expense_id"
        value={expenseId}
      />

      <button
        type="submit"
        title={
          isAm
            ? 'ወጪ ሰርዝ'
            : 'Delete expense'
        }
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          text-coffee-300
          transition
          hover:bg-red-50
          hover:text-red-600
        "
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}
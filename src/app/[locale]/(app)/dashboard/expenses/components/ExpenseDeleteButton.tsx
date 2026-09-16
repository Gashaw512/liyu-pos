'use client'

import {
  Trash2,
} from 'lucide-react'

interface ExpenseDeleteButtonProps {
  expenseId: string
  action: (formData: FormData) => void | Promise<void>
  isAm: boolean
}

export default function ExpenseDeleteButton({
  expenseId,
  action,
  isAm,
}: ExpenseDeleteButtonProps) {
  const handleDelete = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    const confirmed = window.confirm(
      isAm
        ? 'ይህን ወጪ መሰረዝ ይፈልጋሉ?'
        : 'Delete this expense?',
    )

    if (!confirmed) {
      event.preventDefault()
    }
  }

  return (
    <form
      action={action}
      onSubmit={handleDelete}
    >
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
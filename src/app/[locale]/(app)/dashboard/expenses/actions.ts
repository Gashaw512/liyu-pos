'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Route } from 'next'

import { createClient } from '@/lib/supabase/server'
import { getAssignedProfileRoles } from '@/lib/shift-reports/server'

interface ExpenseActionResult {
  success: boolean
  error?: string
}

interface ExpenseContext {
  userId: string
  businessId: string
  role: string
}

// ============================================================
// GET SECURE EXPENSE CONTEXT
// ============================================================

async function getExpenseContext(
  locale: string,
): Promise<ExpenseContext> {
  const supabase = await createClient()

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}/auth/login` as Route,
    )
  }

  // ----------------------------------------------------------
  // SECURE PROFILE
  // ----------------------------------------------------------

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      business_id
    `)
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!profile) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  // ----------------------------------------------------------
  // BUSINESS
  // ----------------------------------------------------------

  const businessId =
    profile.business_id ??
    user.user_metadata?.business_id ??
    user.app_metadata?.business_id

  if (!businessId) {
    redirect(
      `/${locale}/onboarding` as Route,
    )
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  const role =
    profile.role ??
    user.user_metadata?.role ??
    'owner'

  const roles = await getAssignedProfileRoles(supabase, user.id, role)

  // ----------------------------------------------------------
  // AUTHORIZATION
  // ----------------------------------------------------------

  if (!roles.some((assignedRole) => assignedRole === 'owner' || assignedRole === 'manager')) {
    redirect(
      `/${locale}/dashboard` as Route,
    )
  }

  return {
    userId: user.id,
    businessId,
    role,
  }
}

// ============================================================
// REVALIDATE EXPENSE PAGES
// ============================================================

function revalidateExpensePages(
  locale: string,
) {
  revalidatePath(
    `/${locale}/dashboard/expenses`,
  )

  revalidatePath(
    `/${locale}/dashboard`,
  )
}

// ============================================================
// ADD EXPENSE
// ============================================================

export async function addExpense(
  locale: string,
  formData: FormData,
): Promise<ExpenseActionResult> {
  const {
    userId,
    businessId,
  } = await getExpenseContext(locale)

  const supabase = await createClient()

  // ----------------------------------------------------------
  // READ FORM VALUES
  // ----------------------------------------------------------

  const category = String(
    formData.get('category') ?? '',
  ).trim()

  const description = String(
    formData.get('description') ?? '',
  ).trim()

  const amountRaw = String(
    formData.get('amount') ?? '',
  ).trim()

  const paymentMethod = String(
    formData.get('payment_method') ?? 'cash',
  ).trim()

  const expenseDate = String(
    formData.get('expense_date') ?? '',
  ).trim()

  const amount = Number(amountRaw)

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!category) {
    return {
      success: false,
      error: 'Category is required.',
    }
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      success: false,
      error: 'Amount must be greater than zero.',
    }
  }

  if (!expenseDate) {
    return {
      success: false,
      error: 'Expense date is required.',
    }
  }

  // ----------------------------------------------------------
  // FIND LATEST OPEN SHIFT
  // ----------------------------------------------------------

  const {
    data: activeShift,
    error: shiftError,
  } = await supabase
    .from('shifts')
    .select(`
      id,
      branch_id
    `)
    .eq(
      'business_id',
      businessId,
    )
    .eq(
      'status',
      'open',
    )
    .order(
      'opened_at',
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle()

  if (shiftError) {
    console.error(
      '[EXPENSES] Failed to load active shift:',
      shiftError,
    )

    // Expense is still allowed without an open shift.
  }

  // ----------------------------------------------------------
  // INSERT EXPENSE
  // ----------------------------------------------------------

  const {
    error: insertError,
  } = await supabase
    .from('expenses')
    .insert({
      business_id: businessId,

      branch_id:
        activeShift?.branch_id ??
        null,

      recorded_by: userId,

      shift_id:
        activeShift?.id ??
        null,

      category,

      description:
        description ||
        null,

      amount,

      payment_method:
        paymentMethod ||
        'cash',

      expense_date:
        expenseDate,
    })

  if (insertError) {
    console.error(
      '[EXPENSES] Failed to create expense:',
      insertError,
    )

    return {
      success: false,
      error: 'Failed to create expense.',
    }
  }

  // ----------------------------------------------------------
  // REVALIDATE
  // ----------------------------------------------------------

  revalidateExpensePages(locale)

  return {
    success: true,
  }
}

// ============================================================
// UPDATE EXPENSE
// ============================================================

export async function updateExpense(
  locale: string,
  formData: FormData,
): Promise<ExpenseActionResult> {
  // Get secure context ONCE.
  const {
    businessId,
  } = await getExpenseContext(locale)

  const supabase = await createClient()

  // ----------------------------------------------------------
  // READ FORM VALUES
  // ----------------------------------------------------------

  const expenseId = String(
    formData.get('expense_id') ?? '',
  ).trim()

  const category = String(
    formData.get('category') ?? '',
  ).trim()

  const description = String(
    formData.get('description') ?? '',
  ).trim()

  const amountRaw = String(
    formData.get('amount') ?? '',
  ).trim()

  const paymentMethod = String(
    formData.get('payment_method') ?? 'cash',
  ).trim()

  const expenseDate = String(
    formData.get('expense_date') ?? '',
  ).trim()

  const amount = Number(amountRaw)

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!expenseId) {
    return {
      success: false,
      error: 'Expense ID is required.',
    }
  }

  if (!category) {
    return {
      success: false,
      error: 'Category is required.',
    }
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      success: false,
      error: 'Amount must be greater than zero.',
    }
  }

  if (!expenseDate) {
    return {
      success: false,
      error: 'Expense date is required.',
    }
  }

  // ----------------------------------------------------------
  // VERIFY EXPENSE BELONGS TO BUSINESS
  // ----------------------------------------------------------

  const {
    data: existingExpense,
    error: lookupError,
  } = await supabase
    .from('expenses')
    .select(`
      id,
      business_id
    `)
    .eq(
      'id',
      expenseId,
    )
    .eq(
      'business_id',
      businessId,
    )
    .is(
      'deleted_at',
      null,
    )
    .maybeSingle()

  if (lookupError) {
    console.error(
      '[EXPENSES] Failed to verify expense:',
      lookupError,
    )

    return {
      success: false,
      error: 'Unable to verify expense.',
    }
  }

  if (!existingExpense) {
    return {
      success: false,
      error: 'Expense not found.',
    }
  }

  // ----------------------------------------------------------
  // UPDATE EXPENSE
  // ----------------------------------------------------------

  const {
    error: updateError,
  } = await supabase
    .from('expenses')
    .update({
      category,

      description:
        description ||
        null,

      amount,

      payment_method:
        paymentMethod ||
        'cash',

      expense_date:
        expenseDate,
    })
    .eq(
      'id',
      expenseId,
    )
    .eq(
      'business_id',
      businessId,
    )
    .is(
      'deleted_at',
      null,
    )

  if (updateError) {
    console.error(
      '[EXPENSES] Failed to update expense:',
      updateError,
    )

    return {
      success: false,
      error: 'Failed to update expense.',
    }
  }

  // ----------------------------------------------------------
  // REVALIDATE
  // ----------------------------------------------------------

  revalidateExpensePages(locale)

  return {
    success: true,
  }
}

// ============================================================
// SOFT DELETE EXPENSE
// ============================================================


// ============================================================
// DELETE EXPENSE
// ============================================================

export async function deleteExpense(
  locale: string,
  formData: FormData,
): Promise<ExpenseActionResult> {
  const {
    userId,
    businessId,
  } = await getExpenseContext(locale)

  const supabase = await createClient()

  // ----------------------------------------------------------
  // READ EXPENSE ID
  // ----------------------------------------------------------

  const expenseId = String(
    formData.get('expense_id') ?? '',
  ).trim()

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!expenseId) {
    return {
      success: false,
      error: 'Expense ID is required.',
    }
  }

  console.log(
    '[EXPENSE DELETE] Request:',
    {
      userId,
      businessId,
      expenseId,
    },
  )

  // ----------------------------------------------------------
  // VERIFY EXPENSE BELONGS TO CURRENT BUSINESS
  // ----------------------------------------------------------

  const {
    data: existingExpense,
    error: lookupError,
  } = await supabase
    .from('expenses')
    .select(`
      id,
      business_id,
      deleted_at,
      category,
      amount
    `)
    .eq(
      'id',
      expenseId,
    )
    .eq(
      'business_id',
      businessId,
    )
    .maybeSingle()

  if (lookupError) {
    console.error(
      '[EXPENSE DELETE] Failed to find expense:',
      lookupError,
    )

    return {
      success: false,
      error: 'Unable to verify expense.',
    }
  }

  if (!existingExpense) {
    return {
      success: false,
      error: 'Expense not found.',
    }
  }

  // ----------------------------------------------------------
  // PREVENT DELETING AN ALREADY DELETED EXPENSE
  // ----------------------------------------------------------

  if (existingExpense.deleted_at) {
    return {
      success: false,
      error: 'Expense has already been deleted.',
    }
  }

  // ----------------------------------------------------------
  // HARD DELETE
  //
  // RLS policy:
  //
  // DELETE
  // USING (business_id = auth_business_id())
  //
  // This avoids the UPDATE + deleted_at RLS problem.
  // ----------------------------------------------------------

  const {
    error: deleteError,
  } = await supabase
    .from('expenses')
    .delete()
    .eq(
      'id',
      expenseId,
    )
    .eq(
      'business_id',
      businessId,
    )

  if (deleteError) {
    console.error(
      '[EXPENSE DELETE] Failed to delete expense:',
      deleteError,
    )

    return {
      success: false,
      error: 'Failed to delete expense.',
    }
  }

  console.log(
    '[EXPENSE DELETE] Successfully deleted:',
    {
      expenseId,
      businessId,
    },
  )

  // ----------------------------------------------------------
  // REVALIDATE
  // ----------------------------------------------------------

  revalidateExpensePages(locale)

  return {
    success: true,
  }
}


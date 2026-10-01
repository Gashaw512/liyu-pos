export const LEGACY_CONTEXT_PLACEHOLDERS = new Set([
  'biz_active',
  'branch_main',
  'cashier_default',
  'default_business',
  'default_branch',
  'default_cashier',
])

export function isLegacyContextValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  return LEGACY_CONTEXT_PLACEHOLDERS.has(value.trim())
}

export function toLocalActiveShift<T extends { id: string }>(shift: T) {
  return {
    ...shift,
    id: 'current',
    report_id: shift.id,
    real_database_id: shift.id,
  }
}

export function sanitizeActiveShiftContext<T extends {
  business_id?: string | null
  branch_id?: string | null
  cashier_id?: string | null
}>(
  shift: T | null | undefined,
  context: {
    businessId?: string | null
    branchId?: string | null
    userId?: string | null
  },
): T | null {
  if (!shift) {
    return null
  }

  const sanitized = { ...shift }

  if (!sanitized.business_id || isLegacyContextValue(sanitized.business_id)) {
    sanitized.business_id = (context.businessId ?? null) as T['business_id']
  }

  if (!sanitized.branch_id || isLegacyContextValue(sanitized.branch_id)) {
    sanitized.branch_id = (context.branchId ?? null) as T['branch_id']
  }

  if (!sanitized.cashier_id || isLegacyContextValue(sanitized.cashier_id)) {
    sanitized.cashier_id = (context.userId ?? null) as T['cashier_id']
  }

  return sanitized
}

export function isSameOpenShiftInstance(
  first: {
    business_id?: string | null
    branch_id?: string | null
    cashier_id?: string | null
    opened_at?: string | null
    status?: string | null
  } | null | undefined,
  second: {
    business_id?: string | null
    branch_id?: string | null
    cashier_id?: string | null
    opened_at?: string | null
    status?: string | null
  } | null | undefined,
): boolean {
  if (!first || !second) {
    return false
  }

  const firstBusinessId = first.business_id ?? null
  const firstBranchId = first.branch_id ?? null
  const firstCashierId = first.cashier_id ?? null
  const firstOpenedAt = first.opened_at ?? null

  const secondBusinessId = second.business_id ?? null
  const secondBranchId = second.branch_id ?? null
  const secondCashierId = second.cashier_id ?? null
  const secondOpenedAt = second.opened_at ?? null

  if (
    !firstBusinessId ||
    !firstBranchId ||
    !firstCashierId ||
    !firstOpenedAt ||
    !secondBusinessId ||
    !secondBranchId ||
    !secondCashierId ||
    !secondOpenedAt
  ) {
    return false
  }

  return (
    firstBusinessId === secondBusinessId &&
    firstBranchId === secondBranchId &&
    firstCashierId === secondCashierId &&
    firstOpenedAt === secondOpenedAt &&
    (first.status === 'open' || second.status === 'open')
  )
}

export function isDuplicateShiftClosure(
  closure: {
    businessId?: string | null
    branchId?: string | null
    cashierId?: string | null
    openedAt?: string | null
    business_id?: string | null
    branch_id?: string | null
    cashier_id?: string | null
    opened_at?: string | null
  } | null | undefined,
  shift: {
    business_id?: string | null
    branch_id?: string | null
    cashier_id?: string | null
    opened_at?: string | null
  } | null | undefined,
): boolean {
  if (!closure || !shift) {
    return false
  }

  const businessId = closure.businessId ?? closure.business_id ?? null
  const branchId = closure.branchId ?? closure.branch_id ?? null
  const cashierId = closure.cashierId ?? closure.cashier_id ?? null
  const openedAt = closure.openedAt ?? closure.opened_at ?? null

  if (!businessId || !branchId || !cashierId || !openedAt) {
    return false
  }

  return (
    shift.business_id === businessId &&
    shift.branch_id === branchId &&
    shift.cashier_id === cashierId &&
    shift.opened_at === openedAt
  )
}

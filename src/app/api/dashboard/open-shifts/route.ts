import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 500
const SALE_ID_BATCH_SIZE = 100

type ShiftSummary = {
  id: string
  cashierName: string
  branchName: string
  shiftLabel: string
  openedAt: string
  openingCash: number
  salesTotal: number
  transactionCount: number
  products: Array<{ name: string; quantity: number; revenue: number }>
}

function numeric(value: number | string | null | undefined): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

export async function GET() {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner'])

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        {
          status: auth.error === 'Unauthorized' ? 401 : 403,
          headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        },
      )
    }

    const businessId = auth.profile!.business_id!
    const { data: shifts, error: shiftError } = await client
      .from('shifts')
      .select('id,cashier_id,branch_id,shift_label,opened_at,opening_cash')
      .eq('business_id', businessId)
      .eq('status', 'open')
      .order('opened_at', { ascending: true })

    if (shiftError) throw shiftError
    if (!shifts?.length) {
      return NextResponse.json(
        { shifts: [] as ShiftSummary[] },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      )
    }

    const profileIds = [...new Set(shifts.map((shift) => shift.cashier_id))]
    const branchIds = [...new Set(shifts.map((shift) => shift.branch_id))]
    const [profilesResult, branchesResult] = await Promise.all([
      client.from('profiles').select('id,full_name').eq('business_id', businessId).in('id', profileIds),
      client.from('branches').select('id,name').eq('business_id', businessId).in('id', branchIds),
    ])

    if (profilesResult.error) throw profilesResult.error
    if (branchesResult.error) throw branchesResult.error

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]))
    const branches = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch.name]))
    const summaries = new Map<string, ShiftSummary>(shifts.map((shift) => [shift.id, {
      id: shift.id,
      cashierName: profiles.get(shift.cashier_id) || 'Staff member',
      branchName: branches.get(shift.branch_id) || 'Branch',
      shiftLabel: shift.shift_label || 'Shift',
      openedAt: shift.opened_at || new Date().toISOString(),
      openingCash: numeric(shift.opening_cash),
      salesTotal: 0,
      transactionCount: 0,
      products: [],
    }]))
    const productsByShift = new Map<string, Map<string, { name: string; quantity: number; revenue: number }>>()

    const shiftIds = shifts.map((shift) => shift.id)
    const sales: Array<{ id: string; shift_id: string | null; total_amount: number }> = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await client
        .from('sales')
        .select('id,shift_id,total_amount')
        .eq('business_id', businessId)
        .in('shift_id', shiftIds)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const page = data ?? []
      sales.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    const saleToShift = new Map<string, string>()
    for (const sale of sales) {
      if (!sale.shift_id) continue
      const summary = summaries.get(sale.shift_id)
      if (!summary) continue
      summary.salesTotal += numeric(sale.total_amount)
      summary.transactionCount += 1
      saleToShift.set(sale.id, sale.shift_id)
    }

    const saleIds = sales.map((sale) => sale.id)
    for (let start = 0; start < saleIds.length; start += SALE_ID_BATCH_SIZE) {
      const batch = saleIds.slice(start, start + SALE_ID_BATCH_SIZE)
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from('sale_items')
          .select('sale_id,product_name,quantity,total_amount')
          .in('sale_id', batch)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        const page = data ?? []
        for (const item of page) {
          const shiftId = saleToShift.get(item.sale_id)
          const summary = shiftId ? summaries.get(shiftId) : undefined
          if (!shiftId || !summary) continue

          let products = productsByShift.get(shiftId)
          if (!products) {
            products = new Map()
            productsByShift.set(shiftId, products)
          }
          const productName = item.product_name || 'Product'
          const existing = products.get(productName)
          if (existing) {
            existing.quantity += numeric(item.quantity)
            existing.revenue += numeric(item.total_amount)
          } else {
            products.set(productName, {
              name: productName,
              quantity: numeric(item.quantity),
              revenue: numeric(item.total_amount),
            })
          }
        }
        if (page.length < PAGE_SIZE) break
      }
    }

    for (const [shiftId, products] of productsByShift) {
      const summary = summaries.get(shiftId)
      if (summary) summary.products = [...products.values()]
    }

    return NextResponse.json(
      {
        shifts: [...summaries.values()].map((shift) => ({
          ...shift,
          products: shift.products.sort((a, b) => b.quantity - a.quantity),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('[dashboard] open shift preview failed:', error)
    return NextResponse.json(
      { error: 'Unable to load open shift details.' },
      { status: 500 },
    )
  }
}

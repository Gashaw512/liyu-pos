import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShiftReportPdf } from '@/lib/shift-reports/pdf'
import { processRecipientDeliveries } from '@/lib/shift-reports/delivery'
import { createAdminDatabaseClient, getApplicationTelegramBotToken, getAuthorizedProfile, selectEnabledBusinessRecipients, telegramSendDocument } from '@/lib/shift-reports/server'
import { calculateExpectedDrawerCash } from '@/lib/shift-reports/cash-reconciliation'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const money = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

export async function POST(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier'])
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const body = await request.json() as { reportId?: unknown; branchId?: unknown; openedAt?: unknown; closedAt?: unknown; actualCash?: unknown }
    if (typeof body.reportId !== 'string' || !UUID.test(body.reportId) || body.branchId !== auth.profile!.branch_id || typeof body.openedAt !== 'string' || typeof body.closedAt !== 'string' || (body.actualCash != null && (typeof body.actualCash !== 'number' || !Number.isFinite(body.actualCash) || body.actualCash < 0))) return NextResponse.json({ error: 'Invalid shift close details.' }, { status: 400 })
    const openedAt = new Date(body.openedAt)
    const closedAt = new Date(body.closedAt)
    if (!Number.isFinite(openedAt.getTime()) || !Number.isFinite(closedAt.getTime()) || openedAt > closedAt || closedAt.getTime() > Date.now() + 5 * 60_000) return NextResponse.json({ error: 'Invalid shift time range.' }, { status: 400 })
    if (!auth.profile!.branch_id) return NextResponse.json({ error: 'No branch is assigned to this account.' }, { status: 403 })

    const admin = createAdminDatabaseClient()
    const { data: deliveryByShift, error: deliveryByShiftError } = await admin
      .from('shift_report_deliveries')
      .select('shift_report_id,status,attempts,updated_at')
      .eq('business_id', auth.profile!.business_id)
      .eq('shift_report_id', body.reportId)
      .maybeSingle()
    if (deliveryByShiftError) throw deliveryByShiftError
    const { data: priorByOpenTime, error: priorByOpenTimeError } = deliveryByShift
      ? { data: null, error: null }
      : await admin
        .from('shift_report_deliveries')
        .select('shift_report_id,status,attempts,updated_at')
        .eq('business_id', auth.profile!.business_id)
        .eq('cashier_id', auth.user!.id)
        .eq('opened_at', openedAt.toISOString())
        .maybeSingle()
    if (priorByOpenTimeError) throw priorByOpenTimeError
    const prior = deliveryByShift ?? priorByOpenTime
    if (prior && prior.shift_report_id !== body.reportId) return NextResponse.json({ success: true, duplicate: true, status: prior.status })
    if (prior?.status === 'sent' || prior?.status === 'disabled') {
      return NextResponse.json({ success: true, duplicate: true, status: prior.status })
    }
    if (prior?.status === 'sending' && Date.now() - Date.parse(prior.updated_at ?? '') < 5 * 60_000) {
      return NextResponse.json({ success: true, duplicate: true, status: 'sending' })
    }

    // Resolve the actual persisted shift first. Reports are tied to that shift
    // ID so sales from another shift by the same staff member cannot leak in
    // just because their timestamps overlap.
    const { data: persistedShift, error: persistedShiftError } = await admin
      .from('shifts')
      .select('id,opening_cash,opened_at,status,closed_at,actual_cash_reported')
      .eq('id', body.reportId)
      .eq('business_id', auth.profile!.business_id)
      .eq('branch_id', auth.profile!.branch_id)
      .eq('cashier_id', auth.user!.id)
      .maybeSingle()
    if (persistedShiftError) throw persistedShiftError

    const { data: legacyShift, error: legacyShiftError } = persistedShift
      ? { data: null, error: null }
      : await admin
        .from('shifts')
        .select('id,opening_cash,opened_at,status,closed_at,actual_cash_reported')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('cashier_id', auth.user!.id)
        .eq('opened_at', openedAt.toISOString())
        .maybeSingle()
    if (legacyShiftError) throw legacyShiftError
    const authoritativeShift = persistedShift ?? legacyShift
    if (!authoritativeShift) return NextResponse.json({ error: 'The active shift could not be found. Reopen the shift screen and try again.' }, { status: 404 })
    if (new Date(authoritativeShift.opened_at).getTime() !== openedAt.getTime()) {
      return NextResponse.json({ error: 'The shift opening time does not match the saved shift.' }, { status: 409 })
    }
    if (authoritativeShift.status === 'closed' && (
      new Date(authoritativeShift.closed_at ?? '').getTime() !== closedAt.getTime()
      || (authoritativeShift.actual_cash_reported == null ? body.actualCash != null : money(authoritativeShift.actual_cash_reported) !== money(body.actualCash))
    )) {
      return NextResponse.json({ error: 'This shift was already closed with different cash details.' }, { status: 409 })
    }
    const shiftId = authoritativeShift.id

    const { data: sales, error: salesError } = await admin.from('sales').select('id,receipt_number,total_amount,subtotal,tax_amount,discount_amount,tip_amount,created_at').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('cashier_id', auth.user!.id).eq('shift_id', shiftId).eq('status', 'completed').is('deleted_at', null).lte('created_at', closedAt.toISOString()).order('created_at')
    if (salesError) throw salesError
    const saleIds = (sales ?? []).map(sale => sale.id)
    const [paymentResult, itemsResult, expenseResult, inventoryResult] = await Promise.all([
      admin.from('payments').select('method,amount,status').in('sale_id', saleIds).in('status', ['completed', 'refunded']),
      admin.from('sale_items').select('product_name,quantity,unit_price,cost_price,cost_total,total_amount,sale_id').in('sale_id', saleIds),
      admin.from('expenses').select('amount,payment_method').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('recorded_by', auth.user!.id).eq('shift_id', shiftId).is('deleted_at', null),
      admin.from('inventory').select('quantity,product:products!inventory_product_id_fkey(name,name_am,low_stock_alert,track_inventory,is_active,deleted_at)').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id),
    ])
    if (paymentResult.error) throw paymentResult.error
    if (itemsResult.error) throw itemsResult.error
    if (expenseResult.error) throw expenseResult.error
    if (inventoryResult.error) throw inventoryResult.error
    const revenue = (sales ?? []).reduce((sum, sale) => sum + money(sale.total_amount), 0)
    const tips = (sales ?? []).reduce((sum, sale) => sum + money(sale.tip_amount), 0)
    const cogs = (itemsResult.data ?? []).reduce((sum, item) => sum + money(item.cost_total), 0)
    const expenseTotal = (expenseResult.data ?? []).reduce((sum, expense) => sum + money(expense.amount), 0)
    const products = new Map<string, { quantity: number; amount: number }>()
    for (const item of itemsResult.data ?? []) {
      const row = products.get(item.product_name) ?? { quantity: 0, amount: 0 }
      row.quantity += money(item.quantity)
      row.amount += money(item.total_amount)
      products.set(item.product_name, row)
    }
    const itemRevenue = (itemsResult.data ?? []).reduce((sum, item) => sum + money(item.total_amount), 0)
    const lowStockProducts = (inventoryResult.data ?? []).flatMap((row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product
      if (!product || product.deleted_at || product.is_active === false || product.track_inventory === false) return []
      const quantity = money(row.quantity)
      const alertLevel = Math.max(0, money(product.low_stock_alert))
      if (quantity > alertLevel) return []
      return [{ product_name: product.name_am || product.name || 'Product', current_stock: quantity, minimum_threshold: alertLevel }]
    }).sort((first, second) => first.current_stock - second.current_stock)
    const payments = new Map<string, number>()
    for (const payment of paymentResult.data ?? []) {
      if (payment.status !== 'completed') continue
      payments.set(payment.method, (payments.get(payment.method) ?? 0) + money(payment.amount))
    }
    // The opening float is sourced only from the authenticated cashier's
    // persisted shift. Client-supplied opening amounts are ignored.
    const openingCash = money(authoritativeShift.opening_cash)
    const actualCash = body.actualCash == null ? null : money(body.actualCash)
    const expectedCash = calculateExpectedDrawerCash(
      openingCash,
      (paymentResult.data ?? []).map((payment) => ({ method: payment.method, amount: money(payment.amount), status: payment.status })),
      (expenseResult.data ?? []).map((expense) => ({ amount: money(expense.amount), payment_method: expense.payment_method })),
    )
    const grossProfit = itemRevenue - cogs
    const netProfit = grossProfit - expenseTotal

    const actualCashReported = actualCash
    const shiftValues = {
      status: 'closed' as const,
      closed_at: closedAt.toISOString(),
      closed_by: auth.user!.id,
      opening_cash: openingCash,
      opening_float: openingCash,
      expected_cash: expectedCash,
      actual_cash_reported: actualCashReported,
      actual_cash: actualCashReported,
      closing_float: actualCashReported,
      total_sales: revenue,
      total_transactions: sales?.length ?? 0,
      difference: actualCashReported == null ? null : actualCashReported - expectedCash,
    }
    if (authoritativeShift.status !== 'closed') {
      const { data: closedShift, error: closeShiftError } = await admin
        .from('shifts')
        .update(shiftValues)
        .eq('id', shiftId)
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('cashier_id', auth.user!.id)
        .eq('status', 'open')
        .select('id')
        .maybeSingle()
      if (closeShiftError) throw closeShiftError
      if (!closedShift) return NextResponse.json({ error: 'The shift changed while it was closing. Refresh and try again.' }, { status: 409 })
    }

    // Owner/manager report closure ends all physical custody windows for the
    // branch in one database update. This is separate from the cashier's cash
    // shift and never changes inventory quantities or FIFO layers.
    const custodyInventory: Array<{
      recipient_name: string
      product_name: string
      accepted_float: number
      sold_qty: number
      expected_stock: number
      actual_count: number | null
      variance: number | null
    }> = []
    let custodyShiftCount = 0
    const canCloseBranch = auth.roles.some(role => role === 'owner' || role === 'manager')
    if (canCloseBranch) {
      const closeTimestamp = closedAt.toISOString()
      const { data: closedCustodyShifts, error: custodyCloseError } = await admin
        .from('custody_shifts')
        .update({ status: 'CLOSED', closed_at: closeTimestamp, closed_by: auth.user!.id, close_reason: 'branch_report_close' })
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('status', 'ACTIVE')
        .select('id,user_id,opened_at,closed_at')
      if (custodyCloseError) throw custodyCloseError

      // A repeated close request can find no ACTIVE rows because the previous
      // request already closed them. Reload the same closure set so the
      // reconciliation snapshot can be safely repaired/upserted.
      const { data: sameCloseShifts, error: sameCloseError } = await admin
        .from('custody_shifts')
        .select('id,user_id,opened_at,closed_at')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('status', 'CLOSED')
        .eq('closed_by', auth.user!.id)
        .eq('closed_at', closeTimestamp)
        .eq('close_reason', 'branch_report_close')
      if (sameCloseError) throw sameCloseError
      const newlyClosedShifts = closedCustodyShifts?.length ? closedCustodyShifts : (sameCloseShifts ?? [])
      custodyShiftCount = newlyClosedShifts.length
      const { data: previouslyReconciledShifts, error: priorCustodyError } = await admin
        .from('custody_shifts')
        .select('id,user_id,opened_at,closed_at')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('status', 'CLOSED')
        .eq('close_reason', 'recipient_reconciliation')
        .gte('closed_at', openedAt.toISOString())
        .lte('closed_at', closeTimestamp)
      if (priorCustodyError) throw priorCustodyError
      const shiftsById = new Map<string, (typeof newlyClosedShifts)[number] | (typeof previouslyReconciledShifts)[number]>()
      for (const shift of previouslyReconciledShifts ?? []) shiftsById.set(shift.id, shift)
      for (const shift of newlyClosedShifts) shiftsById.set(shift.id, shift)
      const custodyShifts = [...shiftsById.values()]
      const custodyShiftIds = custodyShifts.map(row => row.id)

      if (custodyShiftIds.length) {
        const { data: custodyEntries, error: custodyEntriesError } = await admin
          .from('custody_shift_inventory')
          .select('custody_shift_id,product_id,quantity_received')
          .in('custody_shift_id', custodyShiftIds)
        if (custodyEntriesError) throw custodyEntriesError

        const productIds = [...new Set((custodyEntries ?? []).map(row => row.product_id))]
        const userIds = [...new Set(custodyShifts.map(row => row.user_id))]
        const minimumOpenedAt = custodyShifts.reduce((minimum, shift) =>
          shift.opened_at < minimum ? shift.opened_at : minimum, custodyShifts[0].opened_at)
        const [custodyProducts, custodyUsers, reconciliationResult, allocationResult, kotWastageResult, wastageResult] = await Promise.all([
          productIds.length
            ? admin.from('products').select('id,name,name_am,track_inventory').in('id', productIds).eq('business_id', auth.profile!.business_id)
            : Promise.resolve({ data: [], error: null }),
          userIds.length
            ? admin.from('profiles').select('id,full_name').in('id', userIds).eq('business_id', auth.profile!.business_id)
            : Promise.resolve({ data: [], error: null }),
          admin.from('custody_shift_reconciliations')
            .select('custody_shift_id,status,accepted_stock_snapshot,physical_count_snapshot')
            .in('custody_shift_id', custodyShiftIds),
          custodyShiftIds.length && productIds.length
            ? admin.from('kot_sale_allocations').select('custody_shift_id,product_id,quantity,created_at')
              .eq('business_id', auth.profile!.business_id)
              .eq('branch_id', auth.profile!.branch_id)
              .in('custody_shift_id', custodyShiftIds)
              .in('product_id', productIds)
              .gte('created_at', minimumOpenedAt)
              .lte('created_at', closeTimestamp)
            : Promise.resolve({ data: [], error: null }),
          custodyShiftIds.length && productIds.length
            ? admin.from('kot_wastage_allocations').select('custody_shift_id,product_id,quantity,created_at')
              .eq('business_id', auth.profile!.business_id)
              .eq('branch_id', auth.profile!.branch_id)
              .in('custody_shift_id', custodyShiftIds)
              .in('product_id', productIds)
              .gte('created_at', minimumOpenedAt)
              .lte('created_at', closeTimestamp)
            : Promise.resolve({ data: [], error: null }),
          userIds.length && productIds.length
            ? admin.from('inventory_movements').select('user_id,product_id,quantity,created_at')
              .eq('business_id', auth.profile!.business_id)
              .eq('branch_id', auth.profile!.branch_id)
              .eq('movement_type', 'waste')
              .in('user_id', userIds)
              .in('product_id', productIds)
              .gte('created_at', minimumOpenedAt)
              .lte('created_at', closeTimestamp)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (custodyProducts.error || custodyUsers.error || reconciliationResult.error || allocationResult.error || kotWastageResult.error || wastageResult.error) {
          throw custodyProducts.error ?? custodyUsers.error ?? reconciliationResult.error ?? allocationResult.error ?? kotWastageResult.error ?? wastageResult.error
        }
        const productsById = new Map((custodyProducts.data ?? []).map(row => [row.id, row.name_am || row.name || 'Product']))
        const usersById = new Map((custodyUsers.data ?? []).map(row => [row.id, row.full_name || 'Staff member']))
        const trackedProductIds = new Set((custodyProducts.data ?? []).filter(row => row.track_inventory !== false).map(row => row.id))
        const entriesByShift = new Map<string, Map<string, number>>()
        for (const entry of custodyEntries ?? []) {
          if (!trackedProductIds.has(entry.product_id)) continue
          const byProduct = entriesByShift.get(entry.custody_shift_id) ?? new Map<string, number>()
          byProduct.set(entry.product_id, (byProduct.get(entry.product_id) ?? 0) + money(entry.quantity_received))
          entriesByShift.set(entry.custody_shift_id, byProduct)
        }

        const soldByShift = new Map<string, Map<string, number>>()
        for (const allocation of allocationResult.data ?? []) {
          if (!trackedProductIds.has(allocation.product_id)) continue
          const byProduct = soldByShift.get(allocation.custody_shift_id) ?? new Map<string, number>()
          byProduct.set(allocation.product_id, (byProduct.get(allocation.product_id) ?? 0) + money(allocation.quantity))
          soldByShift.set(allocation.custody_shift_id, byProduct)
        }

        const wasteByShift = new Map<string, Map<string, number>>()
        for (const allocation of kotWastageResult.data ?? []) {
          if (!trackedProductIds.has(allocation.product_id)) continue
          const byProduct = wasteByShift.get(allocation.custody_shift_id) ?? new Map<string, number>()
          byProduct.set(allocation.product_id, (byProduct.get(allocation.product_id) ?? 0) + money(allocation.quantity))
          wasteByShift.set(allocation.custody_shift_id, byProduct)
        }
        for (const movement of wastageResult.data ?? []) {
          if (!movement.user_id || !trackedProductIds.has(movement.product_id)) continue
          const custodyShift = custodyShifts.find(shift =>
            shift.user_id === movement.user_id
            && shift.opened_at <= movement.created_at
            && (shift.closed_at ?? closeTimestamp) >= movement.created_at,
          )
          if (!custodyShift) continue
          const byProduct = wasteByShift.get(custodyShift.id) ?? new Map<string, number>()
          byProduct.set(movement.product_id, (byProduct.get(movement.product_id) ?? 0) + Math.abs(money(movement.quantity)))
          wasteByShift.set(custodyShift.id, byProduct)
        }

        const reconciliationsByShift = new Map((reconciliationResult.data ?? []).map(row => [row.custody_shift_id, row]))

        const reconciliationRows = custodyShifts.map(shift => {
          const acceptedStock = [...(entriesByShift.get(shift.id) ?? new Map())].map(([productId, quantity]) => ({
            product_id: productId,
            product_name: productsById.get(productId) ?? 'Product',
            quantity_received: quantity,
            physical_count: null,
            difference: null,
          }))
          const savedReport = reconciliationsByShift.get(shift.id)
          const submittedLines = Array.isArray(savedReport?.accepted_stock_snapshot) ? savedReport.accepted_stock_snapshot as Array<Record<string, unknown>> : []
          const physicalLines = Array.isArray(savedReport?.physical_count_snapshot) ? savedReport.physical_count_snapshot as Array<Record<string, unknown>> : []
          for (const item of acceptedStock) {
            const soldQty = soldByShift.get(shift.id)?.get(item.product_id) ?? 0
            const savedLine = submittedLines.find(line => line.product_id === item.product_id)
            const recordedWastage = wasteByShift.get(shift.id)?.get(item.product_id) ?? 0
            const enteredWastage = savedReport?.status === 'submitted'
              ? money(savedLine?.quantity_wasted)
              : 0
            const wastageQty = Math.max(recordedWastage, enteredWastage)
            // The custody RPC stores server-allocated sales together with
            // manually recorded use in quantity_used. Subtract sales only
            // once, then include additional use and returned stock.
            const usedQty = savedReport?.status === 'submitted'
              ? Math.max(0, money(savedLine?.quantity_used) - soldQty)
              : 0
            const returnedQty = savedReport?.status === 'submitted'
              ? money(savedLine?.quantity_returned)
              : 0
            const expectedStock = item.quantity_received - soldQty - usedQty - returnedQty - wastageQty
            const countLine = physicalLines.find(line => line.product_id === item.product_id)
            const actualCount = savedReport?.status === 'submitted' && countLine?.physical_count != null
              ? money(countLine.physical_count)
              : null
            custodyInventory.push({
              recipient_name: usersById.get(shift.user_id) ?? 'Staff member',
              product_name: item.product_name,
              accepted_float: item.quantity_received,
              sold_qty: soldQty,
              expected_stock: expectedStock,
              actual_count: actualCount,
              variance: actualCount == null ? null : actualCount - expectedStock,
            })
          }
          return {
            business_id: auth.profile!.business_id,
            branch_id: auth.profile!.branch_id,
            custody_shift_id: shift.id,
            closed_by: auth.user!.id,
            closed_at: closeTimestamp,
            accepted_stock_snapshot: acceptedStock,
            physical_count_snapshot: null,
            status: 'not_submitted',
          }
        })
        const { error: reconciliationError } = await admin
          .from('custody_shift_reconciliations')
          .upsert(reconciliationRows, { onConflict: 'custody_shift_id', ignoreDuplicates: true })
        if (reconciliationError) throw reconciliationError
      }
    }

    const { data: settings, error: settingsError } = await admin.from('business_notification_settings').select('business_id,telegram_enabled').eq('business_id', auth.profile!.business_id).maybeSingle()
    if (settingsError) throw settingsError
    const { data: recipientRows, error: recipientsError } = await admin.from('business_notification_recipients').select('id,business_id,chat_id,label,enabled').eq('business_id', auth.profile!.business_id).eq('enabled', true)
    if (recipientsError) throw recipientsError
    const recipients = selectEnabledBusinessRecipients(auth.profile!.business_id!, settings, recipientRows ?? [])
    const botToken = settings?.telegram_enabled && recipients.length ? getApplicationTelegramBotToken() : null
    if (!prior) {
      const { error: insertError } = await admin.from('shift_report_deliveries').upsert({ business_id: auth.profile!.business_id, shift_report_id: body.reportId, branch_id: auth.profile!.branch_id, cashier_id: auth.user!.id, opened_at: openedAt.toISOString(), closed_at: closedAt.toISOString(), status: botToken ? 'pending' : 'disabled' }, { onConflict: 'business_id,shift_report_id', ignoreDuplicates: true })
      if (insertError) throw insertError
    }
    if (!botToken || recipients.length === 0) {
      await admin.from('shift_report_deliveries').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).in('status', ['pending', 'failed'])
      return NextResponse.json({ success: true, status: 'disabled' })
    }
    const staleSendingBefore = new Date(Date.now() - 5 * 60_000).toISOString()
    const { data: claim, error: claimError } = await admin.from('shift_report_deliveries').update({ status: 'sending', attempts: (prior?.attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).or(`status.in.(pending,failed),and(status.eq.sending,updated_at.lt.${staleSendingBefore})`).select('id').maybeSingle()
    if (claimError) throw claimError
    if (!claim) return NextResponse.json({ success: true, duplicate: true, status: 'sending' })

    const [branchResult, businessResult] = await Promise.all([
      admin.from('branches').select('name').eq('id', auth.profile!.branch_id).eq('business_id', auth.profile!.business_id).maybeSingle(),
      admin.from('businesses').select('name').eq('id', auth.profile!.business_id).maybeSingle(),
    ])
    if (branchResult.error) throw branchResult.error
    if (businessResult.error) throw businessResult.error
    const formatMoney = (amount: number) => `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
    const paymentLabels: Record<string, string> = {
      cash: 'Cash', telebirr: 'Telebirr', cbe_birr: 'CBE Birr', coop_bank: 'Cooperative Bank',
      awash_bank: 'Awash Bank', dashen_bank: 'Dashen Bank', bank_transfer: 'Bank transfer', credit: 'Credit',
    }
    const pdf = createShiftReportPdf({
      businessName: businessResult.data?.name || 'Liyu POS',
      branchName: branchResult.data?.name || 'Branch',
      staffName: auth.profile!.full_name || 'Staff member',
      openedAt: openedAt.toLocaleString('en-ET'),
      closedAt: closedAt.toLocaleString('en-ET'),
      summary: [
        { label: 'Sales', value: formatMoney(revenue) },
        { label: 'Tips', value: formatMoney(tips) },
        { label: 'Transactions', value: String(sales?.length ?? 0) },
        { label: 'Cost of goods', value: formatMoney(cogs) },
        { label: 'Gross profit', value: formatMoney(grossProfit) },
        { label: 'Expenses', value: formatMoney(expenseTotal) },
        { label: 'Net profit', value: formatMoney(netProfit) },
        { label: 'Opening cash', value: formatMoney(openingCash) },
        { label: 'Cash sales', value: formatMoney(payments.get('cash') ?? 0) },
        { label: 'Expected drawer cash', value: formatMoney(expectedCash) },
        { label: 'Counted cash', value: actualCash == null ? 'Not counted' : formatMoney(actualCash) },
        { label: 'Cash difference', value: actualCash == null ? 'Not counted' : formatMoney(actualCash - expectedCash) },
        ...(canCloseBranch ? [{ label: 'Custody shifts closed', value: String(custodyShiftCount) }] : []),
      ],
      payments: Array.from(payments, ([method, amount]) => ({ method: paymentLabels[method] || method.replace(/_/g, ' '), amount })),
      products: Array.from(products, ([name, row]) => ({ name, quantity: row.quantity, sales: row.amount })),
      lowStockProducts,
      custodyInventory,
    })
    const recipientDeliveryRows = recipients.map(recipient => ({ business_id: auth.profile!.business_id!, shift_report_id: body.reportId as string, recipient_id: recipient.id }))
    const { error: recipientSeedError } = await admin.from('shift_report_recipient_deliveries').upsert(recipientDeliveryRows, { onConflict: 'business_id,shift_report_id,recipient_id', ignoreDuplicates: true })
    if (recipientSeedError) throw recipientSeedError

    const recipientResults = await processRecipientDeliveries({
      recipients,
      getStatus: async recipient => {
        const { data, error } = await admin.from('shift_report_recipient_deliveries').select('status').eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).eq('recipient_id', recipient.id).maybeSingle()
        if (error) throw error
        return (data?.status ?? null) as 'pending' | 'sending' | 'sent' | 'failed' | null
      },
      claim: async recipient => {
        const { data: currentDelivery, error: currentError } = await admin.from('shift_report_recipient_deliveries').select('attempts').eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).eq('recipient_id', recipient.id).maybeSingle()
        if (currentError) throw currentError
        const recipientStaleBefore = new Date(Date.now() - 5 * 60_000).toISOString()
        const { data, error } = await admin.from('shift_report_recipient_deliveries').update({ status: 'sending', attempts: (currentDelivery?.attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).eq('recipient_id', recipient.id).or(`status.in.(pending,failed),and(status.eq.sending,updated_at.lt.${recipientStaleBefore})`).select('recipient_id').maybeSingle()
        if (error) throw error
        return Boolean(data)
      },
      send: recipient => telegramSendDocument(botToken, recipient.chat_id, pdf, `shift-report-${body.reportId}.pdf`, `Shift report: ${auth.profile!.full_name || 'Staff'} | ${revenue.toFixed(2)} ETB sales`),
      markSent: async recipient => {
        const { error } = await admin.from('shift_report_recipient_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).eq('recipient_id', recipient.id)
        if (error) throw error
      },
      markFailed: async (recipient, deliveryError) => {
        const errorMessage = deliveryError instanceof Error ? deliveryError.message.slice(0, 500) : 'Delivery failed.'
        const { error } = await admin.from('shift_report_recipient_deliveries').update({ status: 'failed', last_error: errorMessage, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).eq('recipient_id', recipient.id)
        if (error) throw error
      },
    })
    const allDelivered = recipientResults.every(result => result.success)
    const { error: finishError } = await admin.from('shift_report_deliveries').update({ status: allDelivered ? 'sent' : 'failed', sent_at: allDelivered ? new Date().toISOString() : null, last_error: allDelivered ? null : 'One or more business recipients did not receive the report.', updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId)
    if (finishError) throw finishError
    return NextResponse.json({ success: allDelivered, status: allDelivered ? 'sent' : 'failed', sent: recipientResults.filter(result => result.success).length, failed: recipientResults.filter(result => !result.success).length, results: recipientResults }, { status: allDelivered ? 200 : 502 })
  } catch (error) {
    console.error('[shift-reports] close processing failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create shift report.' }, { status: 500 })
  }
}

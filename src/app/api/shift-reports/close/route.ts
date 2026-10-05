import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShiftReportPdf } from '@/lib/shift-reports/pdf'
import { processRecipientDeliveries } from '@/lib/shift-reports/delivery'
import { createAdminDatabaseClient, getApplicationTelegramBotToken, getAuthorizedProfile, selectEnabledBusinessRecipients, telegramSendDocument } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const money = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

export async function POST(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier'])
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
    const body = await request.json() as { reportId?: unknown; branchId?: unknown; openedAt?: unknown; closedAt?: unknown; openingCash?: unknown; actualCash?: unknown }
    if (typeof body.reportId !== 'string' || !UUID.test(body.reportId) || body.branchId !== auth.profile!.branch_id || typeof body.openedAt !== 'string' || typeof body.closedAt !== 'string') return NextResponse.json({ error: 'Invalid shift close details.' }, { status: 400 })
    const openedAt = new Date(body.openedAt)
    const closedAt = new Date(body.closedAt)
    if (!Number.isFinite(openedAt.getTime()) || !Number.isFinite(closedAt.getTime()) || openedAt > closedAt || closedAt.getTime() > Date.now() + 5 * 60_000) return NextResponse.json({ error: 'Invalid shift time range.' }, { status: 400 })
    if (!auth.profile!.branch_id) return NextResponse.json({ error: 'No branch is assigned to this account.' }, { status: 403 })

    const admin = createAdminDatabaseClient()
    const { data: prior, error: priorError } = await admin.from('shift_report_deliveries').select('shift_report_id,status,attempts,updated_at').eq('business_id', auth.profile!.business_id).eq('cashier_id', auth.user!.id).eq('opened_at', openedAt.toISOString()).maybeSingle()
    if (priorError) throw priorError
    if (prior && prior.shift_report_id !== body.reportId) return NextResponse.json({ success: true, duplicate: true, status: prior.status })

    // Scope the privileged report reads with identifiers resolved from the
    // authenticated profile. Session RLS claims can be stale and may otherwise
    // make an existing shift appear to have no sales.
    const { data: sales, error: salesError } = await admin.from('sales').select('id,receipt_number,total_amount,subtotal,tax_amount,discount_amount,tip_amount,created_at').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('cashier_id', auth.user!.id).eq('status', 'completed').is('deleted_at', null).gte('created_at', openedAt.toISOString()).lte('created_at', closedAt.toISOString()).order('created_at')
    if (salesError) throw salesError
    const saleIds = (sales ?? []).map(sale => sale.id)
    const [paymentResult, itemsResult, expenseResult] = await Promise.all([
      admin.from('payments').select('method,amount').in('sale_id', saleIds).eq('status', 'completed'),
      admin.from('sale_items').select('product_name,quantity,unit_price,cost_price,total_amount,sale_id').in('sale_id', saleIds),
      admin.from('expenses').select('amount').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('recorded_by', auth.user!.id).is('deleted_at', null).gte('created_at', openedAt.toISOString()).lte('created_at', closedAt.toISOString()),
    ])
    if (paymentResult.error) throw paymentResult.error
    if (itemsResult.error) throw itemsResult.error
    if (expenseResult.error) throw expenseResult.error
    const revenue = (sales ?? []).reduce((sum, sale) => sum + money(sale.total_amount), 0)
    const tips = (sales ?? []).reduce((sum, sale) => sum + money(sale.tip_amount), 0)
    const cogs = (itemsResult.data ?? []).reduce((sum, item) => sum + money(item.quantity) * money(item.cost_price), 0)
    const expenseTotal = (expenseResult.data ?? []).reduce((sum, expense) => sum + money(expense.amount), 0)
    const products = new Map<string, { quantity: number; amount: number }>()
    for (const item of itemsResult.data ?? []) {
      const row = products.get(item.product_name) ?? { quantity: 0, amount: 0 }
      row.quantity += money(item.quantity)
      row.amount += money(item.total_amount)
      products.set(item.product_name, row)
    }
    const itemRevenue = (itemsResult.data ?? []).reduce((sum, item) => sum + money(item.total_amount), 0)
    const payments = new Map<string, number>()
    for (const payment of paymentResult.data ?? []) payments.set(payment.method, (payments.get(payment.method) ?? 0) + money(payment.amount))
    const openingCash = money(body.openingCash)
    const actualCash = body.actualCash == null ? null : money(body.actualCash)
    const expectedCash = openingCash + (payments.get('cash') ?? 0)
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
    const { data: closedShift, error: closeShiftError } = await admin
      .from('shifts')
      .update(shiftValues)
      .eq('id', body.reportId)
      .eq('business_id', auth.profile!.business_id)
      .eq('branch_id', auth.profile!.branch_id)
      .eq('cashier_id', auth.user!.id)
      .select('id')
      .maybeSingle()
    if (closeShiftError) throw closeShiftError

    if (!closedShift) {
      const { data: existingShift, error: shiftLookupError } = await admin
        .from('shifts')
        .select('id')
        .eq('business_id', auth.profile!.business_id)
        .eq('branch_id', auth.profile!.branch_id)
        .eq('cashier_id', auth.user!.id)
        .eq('opened_at', openedAt.toISOString())
        .maybeSingle()
      if (shiftLookupError) throw shiftLookupError

      if (existingShift) {
        const { error } = await admin
          .from('shifts')
          .update(shiftValues)
          .eq('id', existingShift.id)
          .eq('business_id', auth.profile!.business_id)
        if (error) throw error
      } else {
        const { error } = await admin.from('shifts').insert({
          id: body.reportId,
          business_id: auth.profile!.business_id,
          branch_id: auth.profile!.branch_id,
          cashier_id: auth.user!.id,
          opened_by: auth.user!.id,
          shift_label: 'Full Day',
          opened_at: openedAt.toISOString(),
          ...shiftValues,
        })
        if (error) throw error
      }
    }

    if (prior?.status === 'sent' || prior?.status === 'disabled') {
      return NextResponse.json({ success: true, duplicate: true, status: prior.status })
    }
    if (prior?.status === 'sending' && Date.now() - Date.parse(prior.updated_at ?? '') < 5 * 60_000) {
      return NextResponse.json({ success: true, duplicate: true, status: 'sending' })
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
      ],
      payments: Array.from(payments, ([method, amount]) => ({ method: paymentLabels[method] || method.replace(/_/g, ' '), amount })),
      products: Array.from(products, ([name, row]) => ({ name, quantity: row.quantity, sales: row.amount })),
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

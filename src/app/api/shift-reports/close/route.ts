import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptSecret } from '@/lib/shift-reports/crypto'
import { createShiftReportPdf } from '@/lib/shift-reports/pdf'
import { createAdminDatabaseClient, getAuthorizedProfile, telegramSendDocument } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const money = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

export async function POST(request: Request) {
  try {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'cashier', 'waiter'])
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
    if (prior?.status === 'sent' || prior?.status === 'disabled') return NextResponse.json({ success: true, duplicate: true, status: prior.status })
    if (prior?.status === 'sending' && Date.now() - Date.parse(prior.updated_at ?? '') < 5 * 60_000) return NextResponse.json({ success: true, duplicate: true, status: 'sending' })

    const { data: sales, error: salesError } = await client.from('sales').select('id,receipt_number,total_amount,subtotal,tax_amount,discount_amount,tip_amount,created_at').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('cashier_id', auth.user!.id).eq('status', 'completed').is('deleted_at', null).gte('created_at', openedAt.toISOString()).lte('created_at', closedAt.toISOString()).order('created_at')
    if (salesError) throw salesError
    const saleIds = (sales ?? []).map(sale => sale.id)
    const [paymentResult, itemsResult, expenseResult] = await Promise.all([
      client.from('payments').select('method,amount').in('sale_id', saleIds).eq('status', 'completed'),
      client.from('sale_items').select('product_name,quantity,unit_price,cost_price,total_amount,sale_id').in('sale_id', saleIds),
      client.from('expenses').select('amount').eq('business_id', auth.profile!.business_id).eq('branch_id', auth.profile!.branch_id).eq('recorded_by', auth.user!.id).is('deleted_at', null).gte('created_at', openedAt.toISOString()).lte('created_at', closedAt.toISOString()),
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

    const { data: settings, error: settingsError } = await admin.from('business_notification_settings').select('telegram_enabled,telegram_bot_token_encrypted,telegram_chat_id').eq('business_id', auth.profile!.business_id).maybeSingle()
    if (settingsError) throw settingsError
    if (!prior) {
      const { error: insertError } = await admin.from('shift_report_deliveries').upsert({ business_id: auth.profile!.business_id, shift_report_id: body.reportId, branch_id: auth.profile!.branch_id, cashier_id: auth.user!.id, opened_at: openedAt.toISOString(), closed_at: closedAt.toISOString(), status: settings?.telegram_enabled ? 'pending' : 'disabled' }, { onConflict: 'business_id,shift_report_id', ignoreDuplicates: true })
      if (insertError) throw insertError
    }
    if (!settings?.telegram_enabled) return NextResponse.json({ success: true, status: 'disabled' })
    const staleSendingBefore = new Date(Date.now() - 5 * 60_000).toISOString()
    const { data: claim, error: claimError } = await admin.from('shift_report_deliveries').update({ status: 'sending', attempts: (prior?.attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId).or(`status.in.(pending,failed),and(status.eq.sending,updated_at.lt.${staleSendingBefore})`).select('id').maybeSingle()
    if (claimError) throw claimError
    if (!claim) return NextResponse.json({ success: true, duplicate: true, status: 'sending' })

    const branchResult = await client.from('branches').select('name').eq('id', auth.profile!.branch_id).maybeSingle()
    const businessResult = await client.from('businesses').select('name').eq('id', auth.profile!.business_id).maybeSingle()
    const lines = [
      businessResult.data?.name || 'Liyu POS', 'WAITER / CASHIER SHIFT REPORT', `Branch: ${branchResult.data?.name || '—'}`,
      `Staff: ${auth.profile!.full_name || 'Staff member'}`, `Opened: ${openedAt.toLocaleString('en-ET')}`, `Closed: ${closedAt.toLocaleString('en-ET')}`,
      '', 'SHIFT SUMMARY', `Sales: ${revenue.toFixed(2)} ETB`, `Tips: ${tips.toFixed(2)} ETB`, `Transactions: ${sales?.length ?? 0}`,
      `Cost of goods: ${cogs.toFixed(2)} ETB`, `Gross profit: ${grossProfit.toFixed(2)} ETB`, `Expenses: ${expenseTotal.toFixed(2)} ETB`, `Net profit: ${netProfit.toFixed(2)} ETB`, `Opening cash: ${openingCash.toFixed(2)} ETB`,
      `Cash sales: ${(payments.get('cash') ?? 0).toFixed(2)} ETB`, `Expected drawer cash: ${expectedCash.toFixed(2)} ETB`, `Counted cash: ${actualCash == null ? 'Not counted' : `${actualCash.toFixed(2)} ETB`}`, `Difference: ${actualCash == null ? 'Not counted' : `${(actualCash - expectedCash).toFixed(2)} ETB`}`,
      '', 'PAYMENT BREAKDOWN', ...Array.from(payments, ([method, amount]) => `${method}: ${amount.toFixed(2)} ETB`),
      '', 'PRODUCTS SOLD', 'Product | Quantity | Sales', ...Array.from(products, ([name, row]) => `${name} | ${row.quantity} | ${row.amount.toFixed(2)} ETB`),
      '', 'Generated by Liyu POS',
    ]
    const pdf = createShiftReportPdf(lines)
    try {
      if (!settings?.telegram_bot_token_encrypted || !settings.telegram_chat_id) throw new Error('Telegram delivery is enabled but credentials are incomplete.')
      await telegramSendDocument(decryptSecret(settings.telegram_bot_token_encrypted), settings.telegram_chat_id, pdf, `shift-report-${body.reportId}.pdf`, `Shift report: ${auth.profile!.full_name || 'Staff'} | ${revenue.toFixed(2)} ETB sales`)
      await admin.from('shift_report_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId)
      return NextResponse.json({ success: true, status: 'sent' })
    } catch (deliveryError) {
      await admin.from('shift_report_deliveries').update({ status: 'failed', last_error: deliveryError instanceof Error ? deliveryError.message.slice(0, 500) : 'Delivery failed', updated_at: new Date().toISOString() }).eq('business_id', auth.profile!.business_id).eq('shift_report_id', body.reportId)
      return NextResponse.json({ success: false, status: 'failed', error: 'Shift closed. Telegram delivery failed and is available for retry.' }, { status: 502 })
    }
  } catch (error) {
    console.error('[shift-reports] close processing failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create shift report.' }, { status: 500 })
  }
}

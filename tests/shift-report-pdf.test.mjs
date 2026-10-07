import test from 'node:test'
import assert from 'node:assert/strict'
import { createShiftReportPdf } from '../src/lib/shift-reports/pdf.ts'
import { decryptSecret, encryptSecret } from '../src/lib/shift-reports/crypto.ts'
import { processRecipientDeliveries } from '../src/lib/shift-reports/delivery.ts'
import { isAllowedNotificationRole, selectEnabledBusinessRecipients } from '../src/lib/shift-reports/routing.ts'
import { telegramSendDocument, telegramSendMessage } from '../src/lib/shift-reports/telegram.ts'
import { signPriceProof, verifyPriceProof } from '../src/lib/security/price-proof.ts'

test('price proofs are bound to tenant, branch, product, and exact price', () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-only-secret'
  const claims = {
    version: 1,
    businessId: 'business-a',
    branchId: 'branch-a',
    productId: 'product-a',
    priceCents: 2500,
    kind: 'catalog',
  }
  const proof = signPriceProof(claims)
  assert.deepEqual(verifyPriceProof(proof, claims), claims)
  assert.equal(verifyPriceProof(proof, { ...claims, businessId: 'business-b' }), null)
  assert.equal(verifyPriceProof(proof, { ...claims, priceCents: 1 }), null)
  assert.equal(verifyPriceProof(`${proof}tampered`, claims), null)
})

test('creates a valid PDF with every product line over multiple pages', () => {
  const report = {
    businessName: 'Aman Bar',
    branchName: 'Main Branch',
    staffName: 'Gashaw Kidanu',
    openedAt: '9/25/2026, 6:52:36 PM',
    closedAt: '9/25/2026, 6:58:24 PM',
    summary: [{ label: 'Sales', value: '12,345.00 ETB' }],
    payments: [{ method: 'Cash', amount: 12345 }],
    products: Array.from({ length: 105 }, (_, index) => ({ name: `Product ${index + 1}`, quantity: 2, sales: 120 })),
    lowStockProducts: Array.from({ length: 30 }, (_, index) => ({ product_name: `Low stock ${index + 1}`, current_stock: index, minimum_threshold: 5 })),
  }
  const pdf = createShiftReportPdf(report)
  const text = pdf.toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.ok(text.includes('%%EOF'))
  assert.match(text, /\/Count [2-9]\b/)
  for (let index = 1; index <= 105; index++) assert.ok(text.includes(`Product ${index}`), `missing product ${index}`)
  assert.ok(text.includes('120.00 ETB'))
  assert.ok(text.includes('SHIFT SUMMARY'))
  assert.ok(text.includes('QTY SOLD'))
  assert.ok(text.includes('CURRENT LOW-STOCK PRODUCTS'))
  for (let index = 1; index <= 30; index++) assert.ok(text.includes(`Low stock ${index}`), `missing low-stock product ${index}`)
})

test('renders a clear empty shift and removes unsupported glyphs instead of question marks', () => {
  const pdf = createShiftReportPdf({
    businessName: 'Aman Bar',
    branchName: 'ዋና ቅርንጫፍ (Main Branch)',
    staffName: 'Staff member',
    openedAt: '9/25/2026, 6:52 PM',
    closedAt: '9/25/2026, 6:58 PM',
    summary: [],
    payments: [],
    products: [],
  }).toString('latin1')
  assert.ok(pdf.includes('Main Branch'))
  assert.ok(pdf.includes('No sales were recorded during this shift.'))
  assert.ok(!pdf.includes('????'))
})

test('encrypts credentials and detects ciphertext tampering', () => {
  process.env.MESSAGING_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  const encrypted = encryptSecret('telegram-secret-token')
  assert.notEqual(encrypted, 'telegram-secret-token')
  assert.equal(decryptSecret(encrypted), 'telegram-secret-token')
  const pieces = encrypted.split(':')
  pieces[3] = Buffer.from('tampered').toString('base64')
  assert.throws(() => decryptSecret(pieces.join(':')))
})

test('Telegram adapters report provider success and surface provider errors', async () => {
  const originalFetch = globalThis.fetch
  try {
    let receivedDocument = false
    globalThis.fetch = async (_url, init) => {
      const body = init?.body
      receivedDocument = body instanceof FormData && body.get('document') instanceof Blob && body.get('caption') === 'Shift closed'
      return Response.json({ ok: true })
    }
    await telegramSendMessage('fake-token', 'fake-chat', 'Test')
    await telegramSendDocument('fake-token', 'fake-chat', Buffer.from('%PDF'), 'shift.pdf', 'Shift closed')
    assert.equal(receivedDocument, true)

    globalThis.fetch = async () => Response.json({ ok: false, description: 'Chat not found' }, { status: 400 })
    await assert.rejects(() => telegramSendMessage('fake-token', 'fake-chat', 'Test'), /Chat not found/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('tenant recipient selection isolates businesses and supports multiple enabled recipients', () => {
  const recipients = [
    { id: 'a1', business_id: 'business-a', chat_id: 'chat-a1', label: 'Owner', enabled: true },
    { id: 'a2', business_id: 'business-a', chat_id: 'chat-a2', label: 'Auditor', enabled: true },
    { id: 'a3', business_id: 'business-a', chat_id: 'chat-a3', label: 'Disabled', enabled: false },
    { id: 'b1', business_id: 'business-b', chat_id: 'chat-b1', label: 'Business B', enabled: true },
  ]
  const businessA = selectEnabledBusinessRecipients('business-a', { business_id: 'business-a', telegram_enabled: true }, recipients)
  const businessB = selectEnabledBusinessRecipients('business-b', { business_id: 'business-b', telegram_enabled: true }, recipients)
  assert.deepEqual(businessA.map(recipient => recipient.chat_id), ['chat-a1', 'chat-a2'])
  assert.deepEqual(businessB.map(recipient => recipient.chat_id), ['chat-b1'])
  assert.deepEqual(selectEnabledBusinessRecipients('business-a', { business_id: 'business-a', telegram_enabled: false }, recipients), [])
  assert.deepEqual(selectEnabledBusinessRecipients('business-a', { business_id: 'business-b', telegram_enabled: true }, recipients), [])
})

test('only owner and manager roles can configure business recipients', () => {
  assert.equal(isAllowedNotificationRole('owner'), true)
  assert.equal(isAllowedNotificationRole('manager'), true)
  assert.equal(isAllowedNotificationRole('waiter'), false)
  assert.equal(isAllowedNotificationRole('cashier'), false)
})

test('partial delivery retries only the failed recipient', async () => {
  const recipients = [{ id: 'a1', label: 'Owner' }, { id: 'a2', label: 'Auditor' }]
  const state = new Map(recipients.map(recipient => [recipient.id, 'pending']))
  const sendCount = new Map(recipients.map(recipient => [recipient.id, 0]))
  let failAuditorOnce = true
  const process = () => processRecipientDeliveries({
    recipients,
    getStatus: async recipient => state.get(recipient.id),
    claim: async recipient => {
      if (!['pending', 'failed'].includes(state.get(recipient.id))) return false
      state.set(recipient.id, 'sending')
      return true
    },
    send: async recipient => {
      sendCount.set(recipient.id, sendCount.get(recipient.id) + 1)
      if (recipient.id === 'a2' && failAuditorOnce) { failAuditorOnce = false; throw new Error('Telegram unavailable') }
    },
    markSent: async recipient => state.set(recipient.id, 'sent'),
    markFailed: async recipient => state.set(recipient.id, 'failed'),
  })

  const firstAttempt = await process()
  assert.deepEqual(firstAttempt.map(result => result.success), [true, false])
  const retry = await process()
  assert.deepEqual(retry.map(result => result.success), [true, true])
  assert.equal(retry[0].skipped, true)
  assert.deepEqual([...sendCount.values()], [1, 2])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createShiftReportPdf } from '../src/lib/shift-reports/pdf.ts'
import { decryptSecret, encryptSecret } from '../src/lib/shift-reports/crypto.ts'
import { telegramSendDocument, telegramSendMessage } from '../src/lib/shift-reports/server.ts'

test('creates a valid PDF with every product line over multiple pages', () => {
  const lines = ['LIYU POS SHIFT REPORT', ...Array.from({ length: 105 }, (_, index) => `Product ${index + 1} | 2 | 120.00 ETB`)]
  const pdf = createShiftReportPdf(lines)
  const text = pdf.toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.ok(text.includes('%%EOF'))
  assert.match(text, /\/Count 3\b/)
  for (let index = 1; index <= 105; index++) assert.ok(text.includes(`Product ${index}`), `missing product ${index}`)
  assert.ok(text.includes('120.00 ETB'))
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

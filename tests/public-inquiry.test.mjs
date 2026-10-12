import test from 'node:test'
import assert from 'node:assert/strict'

import { formatPublicInquiry, parsePublicInquiry } from '../src/lib/public-inquiry.ts'
import { encryptSecret } from '../src/lib/shift-reports/crypto.ts'
import { POST } from '../src/app/api/public-inquiry/route.ts'

test('public inquiry accepts a valid plan request and builds its price from the server plan list', () => {
  const inquiry = parsePublicInquiry({
    planId: 'professional',
    language: 'en',
    name: 'Aster',
    businessName: 'Aster Cafe',
    contact: '+251 911 123 456',
    message: 'Please explain the pilot.',
    consent: true,
    price: 'ETB 0',
  })

  assert.ok(inquiry)
  const message = formatPublicInquiry(inquiry)
  assert.match(message, /Proposed ETB 999 per outlet\/month/)
  assert.doesNotMatch(message, /ETB 0/)
  assert.match(message, /Aster Cafe/)
})

test('public inquiry rejects missing consent, invalid plan, and invalid contact details', () => {
  const base = {
    planId: 'starter',
    language: 'en',
    name: 'Aster',
    businessName: 'Aster Cafe',
    contact: 'not a contact',
    message: '',
    consent: true,
  }

  assert.equal(parsePublicInquiry(base), null)
  assert.equal(parsePublicInquiry({ ...base, contact: 'aster@example.com', consent: false }), null)
  assert.equal(parsePublicInquiry({ ...base, contact: 'aster@example.com', planId: 'admin' }), null)
  assert.equal(parsePublicInquiry({ ...base, contact: 'aster@example.com', name: 'x' }), null)
})

test('public inquiry strips control characters and bounds optional message text', () => {
  const inquiry = parsePublicInquiry({
    planId: 'demo', language: 'am', name: 'Aster', businessName: 'Cafe',
    contact: 'aster@example.com', message: `${'x'.repeat(700)}\nInjected: line`, consent: true,
  })

  assert.ok(inquiry)
  assert.equal(inquiry.message.length, 600)
  assert.doesNotMatch(formatPublicInquiry(inquiry), /\nInjected/)
})

test('public inquiry endpoint sends validated plan and contact details to the configured Telegram chat', async () => {
  const priorFetch = globalThis.fetch
  const priorEncryptionKey = process.env.MESSAGING_ENCRYPTION_KEY
  const priorEncryptedToken = process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED
  const priorChatId = process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID
  const key = Buffer.alloc(32, 5).toString('base64')
  process.env.MESSAGING_ENCRYPTION_KEY = key
  process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED = encryptSecret('test-bot-token')
  process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID = 'test-owner-chat'

  let telegramPayload
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /bottest-bot-token\/sendMessage$/)
    telegramPayload = JSON.parse(String(init?.body))
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const response = await POST(new Request('http://localhost/api/public-inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '192.0.2.15' },
      body: JSON.stringify({
        planId: 'professional', language: 'en', name: 'Aster', businessName: 'Aster Cafe',
        contact: 'aster@example.com', message: 'Please call me.', consent: true, website: '',
        price: 'Free forever',
      }),
    }))
    const result = await response.json()

    assert.equal(response.status, 200)
    assert.equal(result.success, true)
    assert.equal(telegramPayload.chat_id, 'test-owner-chat')
    assert.match(telegramPayload.text, /Proposed ETB 999 per outlet\/month/)
    assert.match(telegramPayload.text, /Aster Cafe/)
    assert.doesNotMatch(telegramPayload.text, /Free forever/)
  } finally {
    globalThis.fetch = priorFetch
    if (priorEncryptionKey === undefined) delete process.env.MESSAGING_ENCRYPTION_KEY
    else process.env.MESSAGING_ENCRYPTION_KEY = priorEncryptionKey
    if (priorEncryptedToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED
    else process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED = priorEncryptedToken
    if (priorChatId === undefined) delete process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID
    else process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID = priorChatId
  }
})

test('public inquiry endpoint does not report success when Telegram rejects delivery', async () => {
  const priorFetch = globalThis.fetch
  const priorEncryptionKey = process.env.MESSAGING_ENCRYPTION_KEY
  const priorEncryptedToken = process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED
  const priorChatId = process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID
  process.env.MESSAGING_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64')
  process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED = encryptSecret('test-bot-token')
  process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID = 'test-owner-chat'
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, description: 'chat unavailable' }), { status: 400 })

  try {
    const response = await POST(new Request('http://localhost/api/public-inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '192.0.2.16' },
      body: JSON.stringify({
        planId: 'demo', language: 'en', name: 'Aster', businessName: 'Aster Cafe',
        contact: 'aster@example.com', consent: true,
      }),
    }))
    assert.equal(response.status, 502)
    assert.equal((await response.json()).success, undefined)
  } finally {
    globalThis.fetch = priorFetch
    if (priorEncryptionKey === undefined) delete process.env.MESSAGING_ENCRYPTION_KEY
    else process.env.MESSAGING_ENCRYPTION_KEY = priorEncryptionKey
    if (priorEncryptedToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED
    else process.env.TELEGRAM_BOT_TOKEN_ENCRYPTED = priorEncryptedToken
    if (priorChatId === undefined) delete process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID
    else process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID = priorChatId
  }
})

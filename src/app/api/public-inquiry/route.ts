import { createHash } from 'node:crypto'
import { formatPublicInquiry, parsePublicInquiry } from '@/lib/public-inquiry'
import { getApplicationTelegramBotToken, telegramSendMessage } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_HOUR = 4
const requestTimes = new Map<string, number[]>()

function getRequestKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = request.headers.get('x-real-ip')?.trim() || forwardedFor || 'unknown'
  return createHash('sha256').update(address).digest('hex')
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host && new URL(origin).host !== host) {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 8_192) return Response.json({ error: 'Request is too large.' }, { status: 413 })

    const rawBody = await request.text()
    if (rawBody.length > 8_192) return Response.json({ error: 'Request is too large.' }, { status: 413 })
    const body = JSON.parse(rawBody) as Record<string, unknown>
    if (typeof body.website === 'string' && body.website.trim()) {
      return Response.json({ success: true }, { status: 202 })
    }

    const inquiry = parsePublicInquiry(body)
    if (!inquiry) return Response.json({ error: 'Check the required fields and try again.' }, { status: 400 })

    const chatId = process.env.PILOT_INQUIRY_TELEGRAM_CHAT_ID?.trim()
    if (!chatId) {
      return Response.json({ error: 'Inquiry delivery is not configured. Please use the email address shown.' }, { status: 503 })
    }

    const now = Date.now()
    for (const [addressHash, timestamps] of requestTimes) {
      const active = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS)
      if (active.length) requestTimes.set(addressHash, active)
      else requestTimes.delete(addressHash)
    }
    const key = getRequestKey(request)
    const recent = (requestTimes.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS)
    if (recent.length >= MAX_REQUESTS_PER_HOUR) {
      return Response.json({ error: 'Please wait before sending another inquiry.' }, { status: 429 })
    }

    // Reserve the request before contacting Telegram so simultaneous submissions
    // from the same browser address cannot all pass the in-process limit.
    recent.push(now)
    requestTimes.set(key, recent)
    if (requestTimes.size > 2_000) {
      const oldestKey = requestTimes.keys().next().value
      if (oldestKey) requestTimes.delete(oldestKey)
    }

    try {
      await telegramSendMessage(getApplicationTelegramBotToken(), chatId, formatPublicInquiry(inquiry))
    } catch {
      console.error('[public-inquiry] Telegram delivery failed')
      recent.pop()
      requestTimes.set(key, recent)
      return Response.json({ error: 'We could not send your inquiry right now. Please email the address shown.' }, { status: 502 })
    }

    return Response.json({ success: true, message: 'Your inquiry was sent. We will contact you using the details provided.' }, { status: 200 })
  } catch {
    return Response.json({ error: 'We could not process this inquiry. Please check the form and try again.' }, { status: 400 })
  }
}

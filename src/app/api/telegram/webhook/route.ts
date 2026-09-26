import { NextResponse } from 'next/server'
import {
  getApplicationTelegramBotToken,
  telegramSendMessage,
} from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const update = await request.json()

    const message = update?.message

    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const text = typeof message.text === 'string'
      ? message.text.trim()
      : ''

    console.log('[telegram] incoming message', {
      chatId,
      username: message.from?.username ?? null,
      firstName: message.from?.first_name ?? null,
      text,
    })

    const token = getApplicationTelegramBotToken()

    if (text === '/start' || text === '/id') {
      const reply = [
        'Welcome to Liyu POS!',
        '',
        'Your Telegram Chat ID is:',
        chatId,
        '',
        'Give this ID to your Liyu POS administrator to receive shift reports.',
      ].join('\n')

      await telegramSendMessage(token, chatId, reply)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[telegram] webhook failed:', error)

    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

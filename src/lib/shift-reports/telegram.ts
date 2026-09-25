export async function telegramSendMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }), cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}.`)
}

export async function telegramSendDocument(token: string, chatId: string, file: Buffer, filename: string, caption: string) {
  const form = new FormData()
  form.set('chat_id', chatId)
  form.set('caption', caption.slice(0, 900))
  form.set('document', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), filename)
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(30000) })
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}.`)
}

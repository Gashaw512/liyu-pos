import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function encryptionKey(): Buffer {
  const value = process.env.MESSAGING_ENCRYPTION_KEY
  if (!value) throw new Error('MESSAGING_ENCRYPTION_KEY is not configured.')
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64')
  if (key.length !== 32) throw new Error('MESSAGING_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.')
  return key
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(value: string): string {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(':')
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) throw new Error('Stored Telegram credential has an invalid format.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64')), decipher.final()]).toString('utf8')
}

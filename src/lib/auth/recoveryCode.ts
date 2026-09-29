import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const RECOVERY_CODE_HEX_LENGTH = 48

export function generateRecoveryCode(): string {
  const rawCode = randomBytes(24).toString('hex').toUpperCase()
  return rawCode.match(/.{1,6}/g)?.join('-') ?? rawCode
}

export function normalizeRecoveryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.replace(/[\s-]/g, '').toUpperCase()
  return new RegExp(`^[A-F0-9]{${RECOVERY_CODE_HEX_LENGTH}}$`).test(normalized)
    ? normalized
    : null
}

export function hashRecoveryCode(value: string): string {
  const normalized = normalizeRecoveryCode(value)
  if (!normalized) throw new Error('Invalid recovery code format.')

  return createHash('sha256').update(normalized).digest('hex')
}

export function verifyRecoveryCode(value: unknown, storedHash: string): boolean {
  const normalized = normalizeRecoveryCode(value)
  if (!normalized || !/^[a-f0-9]{64}$/i.test(storedHash)) return false

  const candidateHash = Buffer.from(hashRecoveryCode(normalized), 'hex')
  const expectedHash = Buffer.from(storedHash, 'hex')

  return timingSafeEqual(candidateHash, expectedHash)
}

export function normalizeEthiopianPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const digits = value.replace(/\D/g, '')
  const nationalNumber = digits.startsWith('0')
    ? digits.slice(1)
    : digits.startsWith('251')
      ? digits.slice(3)
      : digits

  if (!/^[79]\d{8}$/.test(nationalNumber)) return null

  return `+251${nationalNumber}`
}
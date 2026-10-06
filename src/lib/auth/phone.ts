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

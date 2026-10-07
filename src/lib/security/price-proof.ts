import { createHmac, timingSafeEqual } from 'node:crypto'

export type PriceProofClaims = {
  version: 1
  businessId: string
  branchId: string
  productId: string
  priceCents: number
  kind: 'catalog' | 'manager_override'
  issuedBy?: string
}

function proofKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Price proof signing is not configured.')
  return `liyu-pos:offline-price-proof:v1:${key}`
}

function signature(payload: string): Buffer {
  return createHmac('sha256', proofKey()).update(payload).digest()
}

export function signPriceProof(claims: PriceProofClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload).toString('base64url')}`
}

export function verifyPriceProof(
  proof: unknown,
  expected: Omit<PriceProofClaims, 'version' | 'kind' | 'issuedBy' | 'priceCents'> & { priceCents: number },
): PriceProofClaims | null {
  if (typeof proof !== 'string' || proof.length > 2048) return null
  const [payload, encodedSignature, ...extra] = proof.split('.')
  if (!payload || !encodedSignature || extra.length > 0) return null

  try {
    const provided = Buffer.from(encodedSignature, 'base64url')
    const expectedSignature = signature(payload)
    if (provided.length !== expectedSignature.length || !timingSafeEqual(provided, expectedSignature)) return null

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PriceProofClaims
    if (
      claims.version !== 1 ||
      claims.businessId !== expected.businessId ||
      claims.branchId !== expected.branchId ||
      claims.productId !== expected.productId ||
      !Number.isSafeInteger(claims.priceCents) ||
      claims.priceCents !== expected.priceCents ||
      !['catalog', 'manager_override'].includes(claims.kind)
    ) return null
    return claims
  } catch {
    return null
  }
}

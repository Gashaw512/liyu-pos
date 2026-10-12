export const PUBLIC_INQUIRY_PLANS = {
  demo: { en: 'Product demo', am: 'የምርት ማሳያ', price: 'Sample-data walkthrough; no charge' },
  starter: { en: 'Starter', am: 'ጀማሪ', price: 'Proposed ETB 499 per outlet/month' },
  professional: { en: 'Professional', am: 'ፕሮፌሽናል', price: 'Proposed ETB 999 per outlet/month' },
  business: { en: 'Business', am: 'ቢዝነስ', price: 'Proposed ETB 2,499/month; outlet scope to be agreed' },
  enterprise: { en: 'Enterprise', am: 'ኢንተርፕራይዝ', price: 'Proposed from ETB 7,500/month; quote required' },
} as const

export type PublicInquiryPlanId = keyof typeof PUBLIC_INQUIRY_PLANS

export interface PublicInquiry {
  name: string
  businessName: string
  contact: string
  planId: PublicInquiryPlanId
  message: string
  language: 'en' | 'am'
}

const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''

export function parsePublicInquiry(value: unknown): PublicInquiry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  const name = cleanText(body.name, 80)
  const businessName = cleanText(body.businessName, 120)
  const contact = cleanText(body.contact, 160)
  const planId = body.planId
  const message = cleanText(body.message, 600)
  const language = body.language === 'am' ? 'am' : body.language === 'en' ? 'en' : null
  const validPlan = typeof planId === 'string' && Object.prototype.hasOwnProperty.call(PUBLIC_INQUIRY_PLANS, planId)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  const isPhone = /^\+?[0-9][0-9\s().-]{5,24}$/.test(contact)

  if (
    name.length < 2 || businessName.length < 2 || (!isEmail && !isPhone) ||
    !validPlan || !language || body.consent !== true
  ) return null

  return { name, businessName, contact, planId: planId as PublicInquiryPlanId, message, language }
}

export function formatPublicInquiry(inquiry: PublicInquiry): string {
  const plan = PUBLIC_INQUIRY_PLANS[inquiry.planId]
  const planName = plan[inquiry.language]
  return [
    'New Liyu POS website inquiry',
    `Plan: ${planName}`,
    `Price reference: ${plan.price}`,
    `Name: ${inquiry.name}`,
    `Business: ${inquiry.businessName}`,
    `Contact: ${inquiry.contact}`,
    inquiry.message ? `Message: ${inquiry.message}` : null,
  ].filter(Boolean).join('\n')
}

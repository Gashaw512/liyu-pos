export function isAllowedNotificationRole(role: string | null | undefined, allowedRoles: string[] = ['owner', 'manager']): boolean {
  return typeof role === 'string' && allowedRoles.includes(role)
}

export interface BusinessTelegramRecipient {
  id: string
  business_id: string
  chat_id: string
  label: string
  enabled: boolean
}

export function selectEnabledBusinessRecipients(
  businessId: string,
  settings: { business_id: string; telegram_enabled: boolean } | null,
  recipients: BusinessTelegramRecipient[],
): BusinessTelegramRecipient[] {
  if (!settings || settings.business_id !== businessId || !settings.telegram_enabled) return []
  return recipients.filter(recipient => recipient.business_id === businessId && recipient.enabled && recipient.chat_id.trim().length > 0)
}

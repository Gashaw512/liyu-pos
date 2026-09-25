export interface DeliveryRecipient {
  id: string
  label: string
}

export type RecipientDeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed' | null

interface ProcessRecipientDeliveriesOptions<TRecipient extends DeliveryRecipient> {
  recipients: TRecipient[]
  getStatus: (recipient: TRecipient) => Promise<RecipientDeliveryStatus>
  claim: (recipient: TRecipient) => Promise<boolean>
  send: (recipient: TRecipient) => Promise<void>
  markSent: (recipient: TRecipient) => Promise<void>
  markFailed: (recipient: TRecipient, error: unknown) => Promise<void>
}

export async function processRecipientDeliveries<TRecipient extends DeliveryRecipient>(options: ProcessRecipientDeliveriesOptions<TRecipient>) {
  const results: Array<{ label: string; success: boolean; skipped?: boolean; error?: string }> = []
  for (const recipient of options.recipients) {
    const status = await options.getStatus(recipient)
    if (status === 'sent') {
      results.push({ label: recipient.label, success: true, skipped: true })
      continue
    }
    if (!await options.claim(recipient)) {
      results.push({ label: recipient.label, success: false, error: 'Delivery is already being processed.' })
      continue
    }
    try {
      await options.send(recipient)
      await options.markSent(recipient)
      results.push({ label: recipient.label, success: true })
    } catch (error) {
      await options.markFailed(recipient, error)
      results.push({ label: recipient.label, success: false, error: error instanceof Error ? error.message : 'Delivery failed.' })
    }
  }
  return results
}

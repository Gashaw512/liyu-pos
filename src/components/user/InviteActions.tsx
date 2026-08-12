'use client'

import React from 'react'
import QRInvite from './QRInvite'
import { toast } from '@/lib/utils/toast'

type Props = {
  generatedInvite: {
    name: string
    code: string
    inviteUrl: string
  }
  phone: string
  locale: string
}

export default function InviteActions({
  generatedInvite,
  phone,
  locale,
}: Props) {
  if (!generatedInvite) return null

  const inviteUrl = generatedInvite.inviteUrl

  const message = `👋 You are invited to LIYU POS.
Code: ${generatedInvite.code}`

  return (
    <div className="space-y-4">

      {/* QR CODE */}
      <QRInvite url={inviteUrl} />

      {/* ACTION GRID */}
      <div className="grid grid-cols-2 gap-2">

        {/* WHATSAPP */}
        <button
          type="button"
          onClick={() =>
            window.open(
              `https://wa.me/?text=${encodeURIComponent(message + ' ' + inviteUrl)}`,
              '_blank'
            )
          }
          className="h-11 rounded-xl bg-green-600 text-white font-bold"
        >
          WhatsApp
        </button>

        {/* TELEGRAM */}
        <button
          type="button"
          onClick={() =>
            window.open(
              `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(message)}`,
              '_blank'
            )
          }
          className="h-11 rounded-xl bg-blue-600 text-white font-bold"
        >
          Telegram
        </button>

        {/* SMS */}
        <button
          type="button"
          onClick={() =>
            (window.location.href =
              `sms:${phone}?body=${encodeURIComponent(message + ' ' + inviteUrl)}`)
          }
          className="h-11 rounded-xl bg-berbere-500 text-white font-bold"
        >
          SMS
        </button>

        {/* SHARE SHEET */}
        <button
          type="button"
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({
                  title: 'LIYU POS',
                  text: message,
                  url: inviteUrl,
                })
              } else {
                await navigator.clipboard.writeText(message)
                toast('Copied to clipboard', 'success')
              }
            } catch {
              await navigator.clipboard.writeText(message)
              toast('Copied to clipboard', 'info')
            }
          }}
          className="h-11 rounded-xl bg-gold-400 text-white font-bold"
        >
          Share
        </button>

      </div>

      {/* EXPIRY */}
      <div className="text-center text-xs text-coffee-500">
        This invite expires in 7 days
      </div>

    </div>
  )
}
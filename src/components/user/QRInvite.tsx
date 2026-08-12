'use client'

import { QRCodeCanvas } from 'qrcode.react'

interface QRInviteProps {
  url: string
}

export default function QRInvite({ url }: QRInviteProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border">
      <QRCodeCanvas value={url} size={140} />

      <p className="text-xs text-coffee-500 text-center">
        Scan to join LIYU POS
      </p>
    </div>
  )
}
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  loading: boolean
  onSave: () => void
  label: string
}

export default function InventoryBottomBar({
  loading,
  onSave,
  label,
}: Props) {
  return (
    <div
      className="
      fixed
      bottom-5
      left-0
      right-0
      z-40
      bg-gradient-to-t
      from-[#F7F4EB]
      via-[#F7F4EB]
      to-transparent
      px-4
      pt-8
      pb-5
    "
    >
      <div className="max-w-3xl mx-auto">
        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={onSave}
        >
          {!loading && '💾'}
          {label}
        </Button>
      </div>
    </div>
  )
}
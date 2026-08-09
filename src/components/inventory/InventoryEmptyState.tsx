// components/inventory/InventoryEmptyState.tsx

import { EmptyState } from "@/components/ui/EmptyState"

type Props = {
  t: (en: string, am: string) => string
}

export default function InventoryEmptyState({ t }: Props) {
  return (
    <EmptyState
      title={t(
        "No products found",
        "ምንም ምርት አልተገኘም"
      )}
      description={t(
        "Try changing search filters",
        "የፍለጋ መስፈርቶችን ይቀይሩ"
      )}
    />
  )
}
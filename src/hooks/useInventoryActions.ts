import { getDB } from '@/lib/offline/db'
import { computeLiveLocalStock } from '@/lib/calculations/stockCalculator'
import { toast } from '@/lib/utils/toast'

import type {
    InventoryProduct
} from '@/types/inventory'

export function useInventoryActions(
    setLiveStockMap: any,
    setRowSavingId: any,
    setIsSaving: any,
    t: (en: string, am: string) => string,
    isAm: boolean
) {
    /* =========================
     * SAVE SINGLE ROW
     * ========================= */
    const handleSaveSingleRow = async (
        targetProduct: InventoryProduct,
        counts: Record<string, number>,
        liveStockMap: any
    ) => {
        const currentInputValue =
            counts[targetProduct.id] ?? 0

        const currentLiveBaseline =
            liveStockMap[targetProduct.id]?.systemCount ??
            targetProduct.opening_count

        if (currentInputValue === currentLiveBaseline) return

        setRowSavingId(targetProduct.id)

        try {
            const db = await getDB()
            const activeShift = await db.get('active_shift', 'current')

            if (!activeShift) {
                toast(
                    t(
                        '❌ Please open an active shift first!',
                        '❌ እባክዎ መጀመሪያ ክፍት የፈረቃ ስራ ይጀምሩ!'
                    ),
                    'error'
                )
                return
            }

            const tx = db.transaction(
                'pending_stock_reconciliations',
                'readwrite'
            )

            const store = tx.objectStore('pending_stock_reconciliations')

            const row = {
                localId: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                retryCount: 0,
                syncStatus: 'pending' as const,
                product_id: targetProduct.id,
                business_id: activeShift.business_id,
                branch_id: activeShift.branch_id,
                shift_id: activeShift.id,
                counted_quantity: currentInputValue,
                system_quantity: currentLiveBaseline,
                notes: 'Single row adjustment'
            }

            await store.put(row)
            await tx.done

            const updated = await computeLiveLocalStock(db, [
                targetProduct
            ])

            setLiveStockMap((prev: any) => ({
                ...prev,
                [targetProduct.id]: updated[targetProduct.id]
            }))

            toast(
                t(
                    '✅ Saved local change successfully!',
                    '✅ ማስተካከያው ተቀምጧል!'
                ),
                'success'

            )
        } finally {
            setRowSavingId(null)
        }
    }

    /* =========================
     * SAVE ALL
     * ========================= */
    const handleSaveAll = async (
        products: InventoryProduct[],
        counts: Record<string, number>,
        liveStockMap: any
    ) => {
        setIsSaving(true)

        try {
            const db = await getDB()
            const activeShift = await db.get('active_shift', 'current')

            if (!activeShift) {
                toast(
                    t(
                        '❌ Please open an active shift first!',
                        '❌ እባክዎ መጀመሪያ ክፍት የፈረቃ ስራ ይጀምሩ!'
                    ),
                    'success'
                )

                setRowSavingId(null) // 👈 THIS is what you missed
                return
            }

            const tx = db.transaction(
                'pending_stock_reconciliations',
                'readwrite'
            )

            const store = tx.objectStore('pending_stock_reconciliations')

            let changes = 0
            const now = new Date().toISOString()

            for (const product of products) {
                const input = counts[product.id] ?? 0
                const system =
                    liveStockMap[product.id]?.systemCount ??
                    product.opening_count

                if (input === system) continue

                await store.put({
                    localId: crypto.randomUUID(),
                    createdAt: now,
                    retryCount: 0,
                    syncStatus: 'pending' as const,
                    product_id: product.id,
                    business_id: activeShift.business_id,
                    branch_id: activeShift.branch_id,
                    shift_id: activeShift.id,
                    counted_quantity: input,
                    system_quantity: system,
                    notes: 'Bulk adjustment'
                })

                changes++
            }

            await tx.done

            if (!changes) {
                toast(t('ℹ️ No changes', 'ℹ️ ምንም ለውጥ የለም'))
                return
            }

            const updated = await computeLiveLocalStock(
                db,
                products
            )

            setLiveStockMap(updated)

            toast(
                t(
                    '✅ Saved all changes!',
                    '✅ ተቀምጧል!'
                ),
                'success'
            )
        } finally {
            setIsSaving(false)
        }
    }

    return {
        handleSaveSingleRow,
        handleSaveAll
    }
}
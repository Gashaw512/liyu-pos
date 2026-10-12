'use client'
import { useEffect, useState } from 'react'
import { syncEngine } from '../lib/offline/syncEngine'
import { getDB } from '../lib/offline/db'
import { PENDING_OPERATION_STORES, sumPendingOperationCounts } from '../lib/offline/pendingOperationCount'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let active = true

    const refreshPendingCount = async () => {
      try {
        const db = await getDB()
        const values = await Promise.all(PENDING_OPERATION_STORES.map((storeName) =>
          db.objectStoreNames.contains(storeName) ? db.count(storeName) : Promise.resolve(0),
        ))
        const counts: Partial<Record<(typeof PENDING_OPERATION_STORES)[number], number>> = {}
        PENDING_OPERATION_STORES.forEach((storeName, index) => {
          counts[storeName] = values[index]
        })
        if (active) setPendingCount(sumPendingOperationCounts(counts))
      } catch {
        // Keep the last known count if IndexedDB is temporarily unavailable.
      }
    }

    const goOnline = async () => {
      setIsOnline(true)
      void refreshPendingCount()
      await syncEngine.syncAll()
      void refreshPendingCount()
    }
    const goOffline = () => {
      setIsOnline(false)
      void refreshPendingCount()
    }
    const onSyncComplete = () => void refreshPendingCount()

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener('liyu:sync-complete', onSyncComplete)

    // Hydrate a new device's reference catalog on its first online visit,
    // even when there are no sales or inventory actions waiting to sync.
    if (navigator.onLine) {
      void syncEngine.syncAll()
    }
    void refreshPendingCount()

    // Local sales and table edits are saved before they sync; refresh their
    // visible queue count even if those writes do not emit a browser event.
    const pendingCountInterval = setInterval(() => void refreshPendingCount(), 5_000)

    // Also poll every 30s when online to catch missed syncs
    const interval = setInterval(() => {
      if (navigator.onLine) void syncEngine.syncAll()
    }, 30_000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('liyu:sync-complete', onSyncComplete)
      active = false
      clearInterval(pendingCountInterval)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, pendingCount }
}

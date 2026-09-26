'use client'
import { useEffect, useState } from 'react'
import { SyncEngine } from '../lib/offline/syncEngine'

const syncEngine = new SyncEngine()

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true)
      await syncEngine.syncAll()
    }
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Hydrate a new device's reference catalog on its first online visit,
    // even when there are no sales or inventory actions waiting to sync.
    if (navigator.onLine) {
      void syncEngine.syncAll()
    }

    // Also poll every 30s when online to catch missed syncs
    const interval = setInterval(() => {
      if (navigator.onLine) void syncEngine.syncAll()
    }, 30_000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, pendingCount }
}

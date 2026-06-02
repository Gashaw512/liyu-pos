export class SyncEngine {
  private isSyncing = false

  async syncAll() {
    if (this.isSyncing || !navigator.onLine) return
    this.isSyncing = true

    try {
      await this.syncPendingSales()
      await this.syncPendingStockCounts()
      await this.pullLatestProducts()
    } finally {
      this.isSyncing = false
    }
  }

  private async syncPendingSales() {
    const db = await getDB()
    const pending = await db.getAll('pending_sales')
    // Sort by createdAt ascending — preserve order
    const sorted = pending.sort((a, b) => a.createdAt - b.createdAt)

    for (const sale of sorted) {
      try {
        const response = await fetch('/api/sync/sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale),
        })
        if (response.ok) {
          await db.delete('pending_sales', sale.localId)
        }
      } catch {
        // Increment retry count, leave in queue
        await db.put('pending_sales', { ...sale, retryCount: sale.retryCount + 1 })
      }
    }
  }

  // ... syncPendingStockCounts, pullLatestProducts
}

// Conflict resolution strategy:
// Last-Write-Wins for stock counts (server timestamp wins)
// Append-Only for sales (all offline sales accepted, server assigns final ID)
// Products pulled fresh from server, local cache is read-only for product data
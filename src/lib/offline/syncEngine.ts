// src/lib/offline/syncEngine.ts
import { getDB } from './db';

export class SyncEngine {
  private isSyncing = false;

  public async syncAll(): Promise<void> {
    if (this.isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }
    this.isSyncing = true;

    try {
      await this.syncOutboundTransactions();
      await this.pullLatestProducts();
    } catch (error) {
      console.error('Background synchronization pipeline error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncOutboundTransactions(): Promise<void> {
    const db = await getDB();
    
    // Read from both local queues
    const pendingSales = await db.getAll('pending_sales');
    const pendingStock = await db.getAll('pending_stock_reconciliations');

    if (pendingSales.length === 0 && pendingStock.length === 0) return;

    const formattedTransactions: any[] = [];

    // 1. Map Sales Logs
    pendingSales.forEach((sale: any) => {
      formattedTransactions.push({
        id: sale.localId, // Uniform transaction ID track
        type: 'sale',
        timestamp: new Date(sale.createdAt).getTime(),
        payload: {
          id: sale.localId,
          shift_id: sale.shift_id,
          branch_id: sale.branch_id,
          cashier_id: sale.cashier_id,
          business_id: sale.business_id,
          total_amount: sale.total_amount,
          items: sale.items || []
        }
      });
    });

    // 2. Map Inventory Adjustments (Fixed key references)
    pendingStock.forEach((record: any) => {
      formattedTransactions.push({
        id: record.localId, // Used downstream by syncedIds verification mapping
        type: 'inventory_count',
        timestamp: new Date(record.createdAt).getTime(),
        payload: {
          id: record.localId, // Fixed reference fallback from rawRecord.id mapping error
          product_id: record.product_id,
          business_id: record.business_id,
          branch_id: record.branch_id,
          shift_id: record.shift_id,
          counted_quantity: Number(record.counted_quantity),
          system_quantity: Number(record.system_quantity || 0),
          notes: record.notes || 'Mobile Counter Sync'
        }
      });
    });

    // Order chronologically to maintain integrity rules
    formattedTransactions.sort((a, b) => a.timestamp - b.timestamp);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: formattedTransactions }),
      });

      if (!response.ok) {
        throw new Error(`Server rejected sync batch stream with status code: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) throw new Error('Empty server synchronization footprint received.');

      const { success, syncedIds } = JSON.parse(responseText);

      if (success && Array.isArray(syncedIds) && syncedIds.length > 0) {
        const tx = db.transaction(['pending_sales', 'pending_stock_reconciliations', 'sync_log'], 'readwrite');
        
        const salesStore = tx.objectStore('pending_sales');
        const stockStore = tx.objectStore('pending_stock_reconciliations');

        // Target delete records safely ONLY from the table they actually belong to
        for (const targetId of syncedIds) {
          const matchingSale = pendingSales.some(s => s.localId === targetId);
          if (matchingSale) {
            await salesStore.delete(targetId);
          } else {
            await stockStore.delete(targetId);
          }
        }

        // Keep local metrics history logging clear
        await tx.objectStore('sync_log').put({
          id: crypto.randomUUID(),
          type: 'inventory_recon',
          status: 'success',
          timestamp: new Date().toISOString()
        });

        await tx.done;
        console.log('Successfully flushed outbox cache logs.');
      }
    } catch (err) {
      console.error('Failed processing pipeline fallback flags updates:', err);
      
      // Edge-case recovery handling: flag records so they don't lock up UI processing loops
      const tx = db.transaction(['pending_sales', 'pending_stock_reconciliations'], 'readwrite');
      for (const sale of pendingSales) {
        await tx.objectStore('pending_sales').put({ ...sale, syncStatus: 'failed' });
      }
      for (const record of pendingStock) {
        await tx.objectStore('pending_stock_reconciliations').put({ ...record, syncStatus: 'failed' });
      }
      await tx.done;
    }
  }

  private async pullLatestProducts(): Promise<void> {
    try {
      const response = await fetch('/api/products/templates');
      if (!response.ok) return;

      const { products, categories, inventory } = await response.json();
      const db = await getDB();

      const tx = db.transaction(['products', 'categories', 'inventory', 'sync_log'], 'readwrite');

      await tx.objectStore('products').clear();
      await tx.objectStore('categories').clear();
      await tx.objectStore('inventory').clear();

      if (products) for (const item of products) await tx.objectStore('products').put(item);
      if (categories) for (const cat of categories) await tx.objectStore('categories').put(cat);
      if (inventory) for (const inv of inventory) await tx.objectStore('inventory').put(inv);

      await tx.objectStore('sync_log').put({
        id: crypto.randomUUID(),
        type: 'catalog_pull',
        status: 'success',
        timestamp: new Date().toISOString()
      });

      await tx.done;
    } catch (err) {
      console.error('Unable to finalize master catalog template updates:', err);
    }
  }
}
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadParsedOrdersBatched } from '../hooks/useQueries';
import { getQueuedIngestions, removeFromQueue } from './db';

export interface SyncState {
  isSyncing: boolean;
  queueCount: number;
  lastSyncTime: Date | null;
  error: string | null;
}

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const uploadOrdersMutation = useUploadParsedOrdersBatched();
  
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    queueCount: 0,
    lastSyncTime: null,
    error: null,
  });
  
  const syncInProgressRef = useRef(false);

  // Count queued items
  const updateQueueCount = async () => {
    try {
      const queuedItems = await getQueuedIngestions();
      setSyncState(prev => ({ ...prev, queueCount: queuedItems.length }));
    } catch (error) {
      console.error('[Sync] Failed to count queue:', error);
    }
  };

  // Process sync queue
  const processQueue = async () => {
    if (syncInProgressRef.current) {
      console.log('[Sync] Sync already in progress, skipping');
      return;
    }

    syncInProgressRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      console.log('[Sync] Starting sync process...');

      // Get all queued ingestions
      const queuedItems = await getQueuedIngestions();
      
      if (queuedItems.length === 0) {
        console.log('[Sync] No items in queue');
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          queueCount: 0,
          lastSyncTime: new Date(),
        }));
        syncInProgressRef.current = false;
        return;
      }

      console.log(`[Sync] Processing ${queuedItems.length} queued batch(es)...`);

      let totalUploaded = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      // Process each queued batch
      for (const item of queuedItems) {
        try {
          console.log(`[Sync] Uploading batch with ${item.orders.length} orders...`);
          
          await uploadOrdersMutation.mutateAsync({
            orders: item.orders,
            onProgress: (progress) => {
              console.log(`[Sync] Progress: batch ${progress.currentBatch}/${progress.totalBatches}, uploaded ${progress.uploadedOrders}/${progress.totalOrders}`);
            },
          });

          console.log(`[Sync] Batch uploaded successfully (${item.orders.length} orders)`);
          totalUploaded += item.orders.length;
          
          // Remove from queue on success
          if (item.id) {
            await removeFromQueue(item.id);
          }
        } catch (error: any) {
          console.error('[Sync] Batch upload failed:', error);
          totalFailed += item.orders.length;
          errors.push(error.message || 'Unknown error');
          
          // Don't remove from queue on complete failure - will retry next time
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });

      if (errors.length > 0) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: `Sync completed with errors: ${errors.join('; ')}`,
          lastSyncTime: new Date(),
        }));
        console.warn(`[Sync] Completed with errors: ${totalUploaded} uploaded, ${totalFailed} failed`);
      } else {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          queueCount: 0,
          lastSyncTime: new Date(),
          error: null,
        }));
        console.log(`[Sync] Sync completed successfully: ${totalUploaded} orders uploaded`);
      }

      // Update queue count after processing
      await updateQueueCount();
    } catch (error: any) {
      console.error('[Sync] Sync failed:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || 'Sync failed',
      }));
      
      // Update queue count after failure
      await updateQueueCount();
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Auto-sync when online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Network online, triggering sync...');
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Initial queue count
    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    ...syncState,
    processQueue,
    updateQueueCount,
  };
}

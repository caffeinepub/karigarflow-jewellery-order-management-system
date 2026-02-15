import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { getQueuedIngestions, removeFromQueue, setLastSyncTime, getLastSyncTime } from './db';
import { toast } from 'sonner';

export function useOfflineSync() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastSyncTime, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadQueueCount();
    loadLastSyncTime();
  }, []);

  const loadQueueCount = async () => {
    const queued = await getQueuedIngestions();
    setQueuedCount(queued.length);
  };

  const loadLastSyncTime = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const syncNow = async () => {
    if (!actor || isSyncing) return;

    setIsSyncing(true);
    try {
      const queued = await getQueuedIngestions();
      
      for (const item of queued) {
        try {
          await actor.uploadParsedOrders(item.orders);
          // Only remove from queue if id exists
          if (typeof item.id === 'number') {
            await removeFromQueue(item.id);
          }
        } catch (error) {
          console.error('Failed to sync item:', error);
          toast.error('Some items failed to sync');
        }
      }

      const now = Date.now();
      await setLastSyncTime(now);
      setLastSync(now);
      
      await loadQueueCount();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      
      if (queued.length > 0) {
        toast.success('Sync completed successfully');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    queuedCount,
    lastSyncTime,
    syncNow,
    isSyncing,
  };
}

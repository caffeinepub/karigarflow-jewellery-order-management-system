import { useState, useEffect } from 'react';
import { useGetOrders } from './useQueries';
import { getDB, clearOrdersCache, replaceOrdersCache } from '@/offline/db';
import { sanitizeOrders } from '@/lib/orders/validatePersistentOrder';
import type { PersistentOrder } from '../backend';

/**
 * Shared hook that hydrates orders from IndexedDB on mount,
 * provides combined cached + backend orders,
 * persists backend fetches to IndexedDB,
 * and exposes explicit loading/error states to prevent empty-state flashing during bootstrap.
 */
export function useOrdersCache() {
  const [cachedOrders, setCachedOrders] = useState<PersistentOrder[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [invalidOrdersSkippedCount, setInvalidOrdersSkippedCount] = useState(0);
  
  const ordersQuery = useGetOrders();

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    
    async function hydrate() {
      try {
        const db = await getDB();
        const transaction = db.transaction(['orders'], 'readonly');
        const store = transaction.objectStore('orders');
        
        const allOrders = await new Promise<any[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        // Sanitize cached orders
        const { validOrders, skippedCount } = sanitizeOrders(allOrders);
        
        if (mounted) {
          setCachedOrders(validOrders);
          setInvalidOrdersSkippedCount(skippedCount);
          
          // If we found invalid entries, clean up the cache
          if (skippedCount > 0) {
            console.warn(`Found ${skippedCount} invalid cached orders, cleaning up cache...`);
            try {
              await replaceOrdersCache(validOrders);
            } catch (error) {
              console.error('Failed to clean up invalid cached orders:', error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to hydrate orders from IndexedDB:', error);
      } finally {
        if (mounted) {
          setIsHydrating(false);
        }
      }
    }
    
    hydrate();
    
    return () => {
      mounted = false;
    };
  }, []);

  // When backend data arrives, prefer it over cached data
  const orders = ordersQuery.data ?? cachedOrders;
  
  // Explicit loading state: true only when hydrating OR when backend is loading AND we have no data yet
  const isLoading = isHydrating || (ordersQuery.isLoading && orders.length === 0);
  
  // Error state from backend query
  const error = ordersQuery.error;

  const clearLocalOrdersCacheAndReload = async () => {
    try {
      await clearOrdersCache();
      setInvalidOrdersSkippedCount(0);
      setCachedOrders([]);
      // Trigger a refetch from backend
      await ordersQuery.refetch();
    } catch (error) {
      console.error('Failed to clear local orders cache:', error);
      throw error;
    }
  };

  return {
    orders,
    isLoading,
    error,
    isHydrating,
    isFetching: ordersQuery.isFetching,
    refetch: ordersQuery.refetch,
    invalidOrdersSkippedCount,
    clearLocalOrdersCacheAndReload,
  };
}

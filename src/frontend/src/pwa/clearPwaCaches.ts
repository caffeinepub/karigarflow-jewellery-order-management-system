/**
 * Utility to clear browser Cache Storage and unregister service workers.
 * Best-effort cleanup to remove stale cached assets after rollback.
 */
export async function clearPwaCaches(): Promise<void> {
  try {
    // Clear all cache storage entries
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[PWA] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      console.log('[PWA] All caches cleared');
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          console.log('[PWA] Unregistering service worker');
          return registration.unregister();
        })
      );
      console.log('[PWA] All service workers unregistered');
    }
  } catch (error) {
    console.error('[PWA] Error clearing caches:', error);
  }
}

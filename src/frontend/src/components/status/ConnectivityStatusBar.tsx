import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../offline/sync';

export function ConnectivityStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { queuedCount, lastSyncTime, syncNow, isSyncing } = useOfflineSync();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && queuedCount === 0) {
    return null;
  }

  return (
    <div className="border-b bg-muted/50">
      <div className="container px-4 py-2">
        <Alert className="border-0 bg-transparent p-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-orange-600" />
              )}
              <AlertDescription className="text-sm">
                {isOnline ? (
                  queuedCount > 0 ? (
                    <span>
                      {queuedCount} upload{queuedCount > 1 ? 's' : ''} pending sync
                    </span>
                  ) : (
                    <span>Connected</span>
                  )
                ) : (
                  <span>Offline mode - changes will sync when online</span>
                )}
                {lastSyncTime && (
                  <span className="ml-2 text-muted-foreground">
                    • Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </AlertDescription>
            </div>
            {isOnline && queuedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={syncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-2 h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
          </div>
        </Alert>
      </div>
    </div>
  );
}

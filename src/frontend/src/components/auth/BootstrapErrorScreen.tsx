import { AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { presentError } from '@/utils/errorPresentation';
import { ErrorDetailsPanel } from '@/components/errors/ErrorDetailsPanel';
import { useState } from 'react';

interface BootstrapErrorScreenProps {
  error?: Error | null;
  onRetry: () => void;
}

export function BootstrapErrorScreen({ error, onRetry }: BootstrapErrorScreenProps) {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const presentation = error ? presentError(error) : null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Keep loading state for a moment to show feedback
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await clear();
      queryClient.clear();
      // Reload to reset all state
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="text-center max-w-md w-full">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Unable to Load Application</h1>
        
        <p className="mb-4 text-muted-foreground">
          {presentation?.friendlyMessage || 'We encountered an error while loading your profile. This could be a temporary issue or a permissions problem.'}
        </p>

        <p className="mb-6 text-sm text-muted-foreground">
          Check the <span className="font-medium">Backend status</span> indicator in the header for more information about the connection.
        </p>

        {error && presentation && (
          <div className="mb-6">
            <ErrorDetailsPanel rawErrorString={presentation.rawErrorString} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={handleRetry} 
            className="gap-2"
            disabled={isRetrying || isLoggingOut}
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="gap-2"
            disabled={isRetrying || isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
}

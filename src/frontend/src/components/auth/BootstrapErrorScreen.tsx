import { AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { presentError } from '@/utils/errorPresentation';
import { ErrorDetailsPanel } from '@/components/errors/ErrorDetailsPanel';

interface BootstrapErrorScreenProps {
  error?: Error | null;
  onRetry: () => void;
}

export function BootstrapErrorScreen({ error, onRetry }: BootstrapErrorScreenProps) {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const presentation = error ? presentError(error) : null;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="text-center max-w-md w-full">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Unable to Load Profile</h1>
        
        <p className="mb-6 text-muted-foreground">
          {presentation?.friendlyMessage || 'We encountered an error while loading your profile. This could be a temporary issue or a permissions problem.'}
        </p>

        {error && presentation && (
          <div className="mb-6">
            <ErrorDetailsPanel rawErrorString={presentation.rawErrorString} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

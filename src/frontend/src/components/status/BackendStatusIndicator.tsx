import { Activity, AlertCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBackendReachability } from '@/hooks/useBackendReachability';
import { ErrorDetailsPanel } from '../errors/ErrorDetailsPanel';
import { presentError } from '@/utils/errorPresentation';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { toast } from 'sonner';

/**
 * Compact backend status indicator for the app header.
 * Shows online/offline/checking states with canister ID display when online,
 * and friendly offline explanation with collapsible technical details.
 */
export function BackendStatusIndicator() {
  const { status, error, healthData, refetch, isRefetching } = useBackendReachability();
  const [expanded, setExpanded] = useState(false);
  const { copyToClipboard, copyStatus } = useCopyToClipboard();

  const handleRefresh = () => {
    refetch();
  };

  const handleCopyCanisterId = () => {
    if (healthData?.canisterId) {
      copyToClipboard(healthData.canisterId);
      toast.success('Canister ID copied to clipboard');
    }
  };

  // Checking state
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 animate-pulse" />
        <span className="hidden sm:inline">Checking backend…</span>
      </div>
    );
  }

  // Online state with canister ID
  if (status === 'online') {
    return (
      <div className="flex items-center gap-2">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Backend online</span>
            </Badge>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefetching}
              title="Refresh backend status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>

            {healthData?.canisterId && healthData.canisterId !== 'unknown' && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={expanded ? 'Hide canister ID' : 'Show canister ID'}
                >
                  {expanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {healthData?.canisterId && healthData.canisterId !== 'unknown' && (
            <CollapsibleContent>
              <div className="absolute right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] bg-card border rounded-lg shadow-lg p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Backend Canister ID</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all">
                        {healthData.canisterId}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCanisterId}
                        className="gap-1.5 flex-shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                        {copyStatus === 'success' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  }

  // Offline state with error details
  const errorPresentation = error ? presentError(error) : null;

  return (
    <div className="flex items-center gap-2">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
            <AlertCircle className="h-3 w-3" />
            <span className="hidden sm:inline">Backend offline</span>
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isRefetching}
            title="Retry connection"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>

          {errorPresentation && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={expanded ? 'Hide details' : 'Show details'}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {errorPresentation && (
          <CollapsibleContent>
            <div className="absolute right-4 top-16 z-50 w-96 max-w-[calc(100vw-2rem)] bg-card border rounded-lg shadow-lg p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">Backend Offline</p>
                    <p className="text-sm text-muted-foreground">
                      {errorPresentation.friendlyMessage}
                    </p>
                  </div>
                </div>
                
                <ErrorDetailsPanel rawErrorString={errorPresentation.rawErrorString} />
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

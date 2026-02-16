import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface OrdersDataWarningBannerProps {
  skippedCount: number;
  onClearCache: () => void;
  isClearing?: boolean;
}

export function OrdersDataWarningBanner({ 
  skippedCount, 
  onClearCache,
  isClearing = false 
}: OrdersDataWarningBannerProps) {
  if (skippedCount === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Data Quality Warning</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {skippedCount} invalid order{skippedCount > 1 ? 's were' : ' was'} detected and skipped from the local cache. 
          This may indicate corrupted data. Please clear your local cache to resolve this issue.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearCache}
          disabled={isClearing}
          className="shrink-0"
        >
          {isClearing ? 'Clearing...' : 'Clear Cache & Reload'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

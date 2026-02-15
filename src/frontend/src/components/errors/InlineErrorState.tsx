import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getStoppedCanisterMessage } from '@/utils/errorPresentation';
import { ErrorDetailsPanel } from './ErrorDetailsPanel';
import { getSafeErrorString } from '@/utils/bootstrapErrorClassification';

interface InlineErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  error?: unknown;
}

export function InlineErrorState({ title = 'Error', message, onRetry, error }: InlineErrorStateProps) {
  // Check if this is a stopped-canister error
  const stoppedCanisterMessage = error ? getStoppedCanisterMessage(error) : null;
  const displayMessage = stoppedCanisterMessage || message;
  const rawErrorString = error ? getSafeErrorString(error) : null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{displayMessage}</p>
        
        {rawErrorString && (
          <div className="mt-4">
            <ErrorDetailsPanel rawErrorString={rawErrorString} />
          </div>
        )}
        
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

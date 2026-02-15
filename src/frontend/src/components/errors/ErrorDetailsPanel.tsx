import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useState } from 'react';

interface ErrorDetailsPanelProps {
  rawErrorString: string;
}

/**
 * Reusable error details panel with collapsible technical details and copy action.
 */
export function ErrorDetailsPanel({ rawErrorString }: ErrorDetailsPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { copyStatus, copyToClipboard, getButtonLabel } = useCopyToClipboard();

  return (
    <div>
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {detailsOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide error details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show error details
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(rawErrorString)}
            className="gap-1.5"
            disabled={copyStatus !== 'idle'}
          >
            {copyStatus === 'success' ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-sm">{getButtonLabel()}</span>
              </>
            )}
          </Button>
        </div>
        
        <CollapsibleContent>
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Technical Details
            </p>
            <p className="text-sm font-mono text-muted-foreground break-words whitespace-pre-wrap">
              {rawErrorString}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

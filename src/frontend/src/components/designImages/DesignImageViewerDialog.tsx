import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useGetDesignImageForCode } from '../../hooks/useQueries';

interface DesignImageViewerDialogProps {
  designCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesignImageViewerDialog({ designCode, open, onOpenChange }: DesignImageViewerDialogProps) {
  const { data: imageMapping, isLoading, isError, error } = useGetDesignImageForCode(designCode, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Design Image</DialogTitle>
          <DialogDescription>
            Design Code: <span className="font-mono">{designCode}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load image'}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && !imageMapping && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No image found for this design code.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && imageMapping && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">Generic Name:</p>
                <p className="text-muted-foreground">{imageMapping.genericName}</p>
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/20">
                <img
                  src={imageMapping.image.getDirectURL()}
                  alt={`Design ${designCode}`}
                  className="w-full h-auto max-h-[500px] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.insertAdjacentHTML(
                      'beforeend',
                      '<div class="flex items-center justify-center p-8 text-muted-foreground">Failed to load image</div>'
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

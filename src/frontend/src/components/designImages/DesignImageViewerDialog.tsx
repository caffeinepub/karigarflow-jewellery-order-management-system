import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertCircle } from 'lucide-react';
import { useGetDesignImageForCode } from '../../hooks/useQueries';
import { useEffect, useState } from 'react';

interface DesignImageViewerDialogProps {
  designCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesignImageViewerDialog({ designCode, open, onOpenChange }: DesignImageViewerDialogProps) {
  const { data: imageMapping, isLoading, isError, error } = useGetDesignImageForCode(designCode);
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (imageMapping?.image) {
      const url = imageMapping.image.getDirectURL();
      setImageUrl(url);
      return () => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [imageMapping]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Design Image: {designCode}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {isError && (
            <div className="flex items-center gap-2 text-destructive py-4">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading image: {error instanceof Error ? error.message : 'Unknown error'}</span>
            </div>
          )}
          
          {!isLoading && !isError && !imageMapping && (
            <div className="text-center text-muted-foreground py-8">
              No image found for design code: {designCode}
            </div>
          )}
          
          {imageMapping && imageUrl && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Generic Name:</strong> {imageMapping.genericName}
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/20">
                <img 
                  src={imageUrl} 
                  alt={`Design ${designCode}`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

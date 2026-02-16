import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import { DesignImageViewerDialog } from '../designImages/DesignImageViewerDialog';
import type { PersistentOrder } from '../../backend';
import { format } from 'date-fns';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';

interface KarigarOrderViewDialogProps {
  order: PersistentOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KarigarOrderViewDialog({ order, open, onOpenChange }: KarigarOrderViewDialogProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Design Code</p>
                <p className="font-mono text-lg">{order.designCode}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Generic Name</p>
                <p className="text-lg">{order.genericName}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weight</p>
                <p>{order.weight.toFixed(2)}g</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Size</p>
                <p>{order.size.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                <p>{Number(order.qty)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="outline">{order.status}</Badge>
              </div>
            </div>

            {order.remarks && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                  <p className="text-sm">{order.remarks}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Date</p>
              <p className="text-sm">{format(getOrderTimestamp(order), 'MMMM d, yyyy')}</p>
            </div>

            <Button
              onClick={() => setImageViewerOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Design Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DesignImageViewerDialog
        designCode={order.designCode}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </>
  );
}

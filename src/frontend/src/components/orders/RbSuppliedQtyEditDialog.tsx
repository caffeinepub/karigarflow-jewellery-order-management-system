import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateOrderTotalSupplied } from '../../hooks/useQueries';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';

interface RbSuppliedQtyEditDialogProps {
  order: PersistentOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RbSuppliedQtyEditDialog({ order, open, onOpenChange }: RbSuppliedQtyEditDialogProps) {
  const [newQty, setNewQty] = useState<string>('');
  const [error, setError] = useState<string>('');
  const updateMutation = useUpdateOrderTotalSupplied();

  useEffect(() => {
    if (open && order && order.qty !== undefined) {
      setNewQty(String(order.qty));
      setError('');
    }
  }, [open, order]);

  // Guard against invalid order prop - after all hooks
  if (!order || !order.orderNo) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(newQty, 10);
    
    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (qty === 0) {
      setError('Quantity cannot be zero');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        orderNo: order.orderNo,
        newTotalSupplied: BigInt(qty),
      });
      toast.success('Order quantity updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to update order quantity:', err);
      const errorMessage = err?.message || 'Failed to update order quantity';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit RB Order Total Supplied</DialogTitle>
          <DialogDescription>
            Update the total supplied quantity for order {order.orderNo}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newQty">New Total Supplied Quantity</Label>
            <Input
              id="newQty"
              type="number"
              min="1"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Enter new quantity"
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Current quantity: {String(order.qty)}</p>
            <p className="text-xs">
              Note: This will update the total supplied quantity and adjust the hallmark order accordingly.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !newQty || error !== ''}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

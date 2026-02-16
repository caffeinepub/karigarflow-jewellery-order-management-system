import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PersistentOrder } from '../../backend';

interface PartialFulfillmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: PersistentOrder[];
  onConfirm: (quantities: Map<string, number>) => void;
  isSubmitting: boolean;
}

export function PartialFulfillmentDialog({
  open,
  onOpenChange,
  orders,
  onConfirm,
  isSubmitting,
}: PartialFulfillmentDialogProps) {
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // Initialize quantities when dialog opens or orders change
  useEffect(() => {
    if (open && orders && orders.length > 0) {
      const initialQuantities = new Map<string, number>();
      orders.forEach((order) => {
        if (order && order.orderNo && order.qty !== undefined) {
          initialQuantities.set(order.orderNo, Number(order.qty));
        }
      });
      setQuantities(initialQuantities);
      setErrors(new Map());
    }
  }, [open, orders]);

  // Guard against invalid orders prop - after all hooks
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return null;
  }

  const handleQuantityChange = (orderNo: string, value: string) => {
    const newQuantities = new Map(quantities);
    const newErrors = new Map(errors);

    // Parse the input value
    const numValue = parseInt(value, 10);

    if (value === '' || isNaN(numValue)) {
      newErrors.set(orderNo, 'Please enter a valid number');
    } else if (numValue <= 0) {
      newErrors.set(orderNo, 'Quantity must be greater than 0');
    } else {
      const order = orders.find((o) => o && o.orderNo === orderNo);
      if (order && order.qty !== undefined && numValue > Number(order.qty)) {
        newErrors.set(orderNo, `Cannot exceed ${order.qty}`);
      } else {
        newErrors.delete(orderNo);
      }
    }

    newQuantities.set(orderNo, numValue);
    setQuantities(newQuantities);
    setErrors(newErrors);
  };

  const isValid = () => {
    if (errors.size > 0) return false;
    if (orders.length === 0) return false;
    
    // Check all orders have valid quantities
    for (const order of orders) {
      if (!order || !order.orderNo || order.qty === undefined) continue;
      const qty = quantities.get(order.orderNo);
      if (!qty || qty <= 0 || qty > Number(order.qty)) {
        return false;
      }
    }
    
    return true;
  };

  const handleConfirm = () => {
    if (isValid()) {
      onConfirm(quantities);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Specify Supplied Quantities</DialogTitle>
          <DialogDescription>
            Enter the quantity supplied for each RB order. The remaining quantity will stay in Total Orders.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {orders.map((order) => {
              // Skip invalid orders
              if (!order || !order.orderNo || order.qty === undefined) {
                return null;
              }

              const qty = quantities.get(order.orderNo) || 0;
              const error = errors.get(order.orderNo);

              return (
                <div key={order.orderNo} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Order: {order.orderNo}</p>
                      <p className="text-sm text-muted-foreground">
                        Design: {order.designCode || 'N/A'} | Total Qty: {String(order.qty)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`qty-${order.orderNo}`}>
                      Supplied Quantity
                    </Label>
                    <Input
                      id={`qty-${order.orderNo}`}
                      type="number"
                      min="1"
                      max={Number(order.qty)}
                      value={qty || ''}
                      onChange={(e) => handleQuantityChange(order.orderNo, e.target.value)}
                      className={error ? 'border-destructive' : ''}
                    />
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid() || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

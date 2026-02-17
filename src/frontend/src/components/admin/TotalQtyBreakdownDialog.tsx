import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface TotalQtyBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdownData: {
    delivered: number;
    hallmark: number;
    totalOrders: number;
    customerOrders: number;
    karigars: number;
  };
}

export function TotalQtyBreakdownDialog({ open, onOpenChange, breakdownData }: TotalQtyBreakdownDialogProps) {
  const items = [
    { label: 'Delivered', value: breakdownData.delivered, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Hallmark', value: breakdownData.hallmark, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Orders', value: breakdownData.totalOrders, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Customer Orders', value: breakdownData.customerOrders, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Karigars', value: breakdownData.karigars, color: 'text-pink-600 dark:text-pink-400' },
  ];

  const totalQty = Object.values(breakdownData).reduce((sum, val) => sum + val, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Total Quantity Breakdown
          </DialogTitle>
          <DialogDescription>
            Quantity breakdown across all sheets
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Grand Total</div>
                <div className="text-4xl font-bold text-primary">{totalQty}</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-medium">{item.label}</span>
                <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

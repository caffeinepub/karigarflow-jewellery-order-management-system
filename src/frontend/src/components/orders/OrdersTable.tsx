import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import type { PersistentOrder } from '../../backend';
import { format } from 'date-fns';

interface OrdersTableProps {
  orders: PersistentOrder[];
  selectionMode?: boolean;
  selectedOrders?: Set<string>;
  onSelectionChange?: (orderNos: Set<string>) => void;
  emptyMessage?: string;
}

export function OrdersTable({ 
  orders, 
  selectionMode = false,
  selectedOrders = new Set(),
  onSelectionChange,
  emptyMessage = 'No orders found'
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(orders.map(o => o.orderNo)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (orderNo: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedOrders);
    if (checked) {
      newSelection.add(orderNo);
    } else {
      newSelection.delete(orderNo);
    }
    onSelectionChange(newSelection);
  };

  const allSelected = orders.length > 0 && orders.every(o => selectedOrders.has(o.orderNo));
  const someSelected = orders.some(o => selectedOrders.has(o.orderNo)) && !allSelected;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all orders"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
            )}
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design</TableHead>
            <TableHead>Generic</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.orderNo}
              className={order.isCustomerOrder ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
            >
              {selectionMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.has(order.orderNo)}
                    onCheckedChange={(checked) => handleSelectOne(order.orderNo, checked as boolean)}
                    aria-label={`Select order ${order.orderNo}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{order.orderNo}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {order.orderType}
                  {order.isCustomerOrder && (
                    <Badge variant="outline" className="text-xs bg-yellow-100 dark:bg-yellow-900">
                      CO
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">{order.designCode}</TableCell>
              <TableCell>{order.genericName}</TableCell>
              <TableCell>{formatKarigarName(order.karigarName)}</TableCell>
              <TableCell className="text-right">{order.weight.toFixed(2)}g</TableCell>
              <TableCell className="text-right">{order.size.toFixed(2)}</TableCell>
              <TableCell className="text-right">{Number(order.qty)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{order.remarks}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(getOrderTimestamp(order), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

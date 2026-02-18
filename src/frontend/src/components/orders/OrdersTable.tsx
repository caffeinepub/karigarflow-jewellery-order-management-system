import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';
import type { PersistentOrder } from '../../backend';

interface OrdersTableProps {
  orders: PersistentOrder[];
  selectionMode?: boolean;
  selectedOrders?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onViewDesignImage?: (order: PersistentOrder) => void;
}

export function OrdersTable({
  orders,
  selectionMode = false,
  selectedOrders = new Set(),
  onSelectionChange,
  onViewDesignImage,
}: OrdersTableProps) {
  const handleRowClick = (orderNo: string) => {
    if (!selectionMode || !onSelectionChange) return;
    
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderNo)) {
      newSelected.delete(orderNo);
    } else {
      newSelected.add(orderNo);
    }
    onSelectionChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange(new Set(orders.map(o => o.orderNo)));
    } else {
      onSelectionChange(new Set());
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No orders found
      </div>
    );
  }

  const allSelected = orders.length > 0 && orders.every(o => selectedOrders.has(o.orderNo));
  const someSelected = orders.some(o => selectedOrders.has(o.orderNo)) && !allSelected;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card/30">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              {selectionMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? 'opacity-50' : ''}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Order No</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Design Code</TableHead>
              <TableHead className="font-semibold">Generic Name</TableHead>
              <TableHead className="font-semibold">Karigar</TableHead>
              <TableHead className="text-right font-semibold">Weight</TableHead>
              <TableHead className="text-right font-semibold">Size</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Remarks</TableHead>
              {onViewDesignImage && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const isSelected = selectedOrders.has(order.orderNo);
              return (
                <TableRow
                  key={order.orderNo}
                  className={`${
                    selectionMode ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500 dark:border-l-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
                      : 'border-b border-border/30'
                  } hover:bg-muted/30 transition-colors`}
                  onClick={() => selectionMode && handleRowClick(order.orderNo)}
                >
                  {selectionMode && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleRowClick(order.orderNo)}
                        aria-label={`Select order ${order.orderNo}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {order.orderType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{order.designCode}</TableCell>
                  <TableCell>{order.genericName}</TableCell>
                  <TableCell>{formatKarigarName(order.karigarId)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatOptionalNumber(order.weight, 2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatOptionalNumber(order.size, 2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{order.qty}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === 'delivered'
                          ? 'default'
                          : order.status === 'given_to_hallmark'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={order.remarks}>
                    {order.remarks || '-'}
                  </TableCell>
                  {onViewDesignImage && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDesignImage(order)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" aria-label="View design image" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

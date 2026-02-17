import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Edit } from 'lucide-react';
import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';

interface OrdersTableProps {
  orders: PersistentOrder[];
  selectionMode?: boolean;
  selectedOrders?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onEditRbSupplied?: (order: PersistentOrder) => void;
  onViewDesignImage?: (order: PersistentOrder) => void;
  allowRbEditStatuses?: string[];
  highlightReturnedFromDelivered?: boolean;
}

export function OrdersTable({
  orders,
  selectionMode = false,
  selectedOrders = new Set(),
  onSelectionChange,
  onEditRbSupplied,
  onViewDesignImage,
  allowRbEditStatuses = ['pending'],
  highlightReturnedFromDelivered = false,
}: OrdersTableProps) {
  const { validOrders } = sanitizeOrders(orders);

  const handleRowClick = (orderNo: string, e: React.MouseEvent) => {
    // Don't toggle selection if clicking on action buttons or checkbox
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="checkbox"]') ||
      target.tagName === 'INPUT'
    ) {
      return;
    }

    if (selectionMode && onSelectionChange) {
      const newSelected = new Set(selectedOrders);
      if (newSelected.has(orderNo)) {
        newSelected.delete(orderNo);
      } else {
        newSelected.add(orderNo);
      }
      onSelectionChange(newSelected);
    }
  };

  const handleCheckboxChange = (orderNo: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderNo);
    } else {
      newSelected.delete(orderNo);
    }
    onSelectionChange(newSelected);
  };

  const canEditRbSupplied = (order: PersistentOrder) => {
    return (
      order.orderType === 'RB' &&
      allowRbEditStatuses.includes(order.status) &&
      onEditRbSupplied
    );
  };

  if (validOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders to display
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && <TableHead className="w-12">Select</TableHead>}
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validOrders.map((order) => {
            const isSelected = selectedOrders.has(order.orderNo);
            const isReturnedFromDelivered = highlightReturnedFromDelivered && order.isReturnedFromDelivered;
            
            return (
              <TableRow
                key={order.orderNo}
                onClick={(e) => handleRowClick(order.orderNo, e)}
                className={`
                  ${selectionMode ? 'cursor-pointer' : ''}
                  ${isSelected ? 'bg-muted/50' : ''}
                  ${isReturnedFromDelivered ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500' : ''}
                `}
              >
                {selectionMode && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(order.orderNo, checked as boolean)
                      }
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {order.orderNo}
                  {isReturnedFromDelivered && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Returned
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={order.isCustomerOrder ? 'default' : 'secondary'}>
                    {order.orderType}
                  </Badge>
                </TableCell>
                <TableCell>{order.designCode}</TableCell>
                <TableCell>{order.genericName}</TableCell>
                <TableCell>{formatKarigarName(order.karigarName)}</TableCell>
                <TableCell className="text-right">{order.qty}</TableCell>
                <TableCell className="text-right">
                  {formatOptionalNumber(order.weight, 2) || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {formatOptionalNumber(order.size, 2) || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === 'delivered'
                        ? 'default'
                        : order.status === 'pending'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">{order.remarks}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {onViewDesignImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDesignImage(order)}
                        title="View Design Image"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {canEditRbSupplied(order) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditRbSupplied!(order)}
                        title="Edit Supplied Qty"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';
import type { PersistentOrder } from '../../backend';
import { format } from 'date-fns';
import { Edit, Eye } from 'lucide-react';

interface OrdersTableProps {
  orders: PersistentOrder[];
  selectionMode?: boolean;
  selectedOrders?: Set<string>;
  onSelectionChange?: (orderNos: Set<string>) => void;
  emptyMessage?: string;
  onEditRbSupplied?: (order: PersistentOrder) => void;
  onViewDesignImage?: (order: PersistentOrder) => void;
  karigarMode?: boolean;
  onViewOrder?: (order: PersistentOrder) => void;
}

export function OrdersTable({ 
  orders, 
  selectionMode = false,
  selectedOrders = new Set(),
  onSelectionChange,
  emptyMessage = 'No orders found',
  onEditRbSupplied,
  onViewDesignImage,
  karigarMode = false,
  onViewOrder,
}: OrdersTableProps) {
  // Sanitize orders as a last line of defense
  const { validOrders } = sanitizeOrders(orders);
  
  if (validOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(validOrders.map(o => o.orderNo)));
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

  const handleRowClick = (orderNo: string, e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('[role="checkbox"]')
    ) {
      return;
    }

    if (!selectionMode || !onSelectionChange) return;
    
    const isSelected = selectedOrders.has(orderNo);
    handleSelectOne(orderNo, !isSelected);
  };

  const isRbOrder = (order: PersistentOrder) => {
    return order.orderType === 'RB' && !order.orderNo.endsWith('_hallmark');
  };

  const canEditRbSupplied = (order: PersistentOrder) => {
    return isRbOrder(order) && order.status === 'pending';
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={validOrders.length > 0 && validOrders.every(o => selectedOrders.has(o.orderNo))}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            {!karigarMode && <TableHead>Karigar</TableHead>}
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validOrders.map((order) => {
            const isSelected = selectedOrders.has(order.orderNo);
            const orderDate = getOrderTimestamp(order);
            
            return (
              <TableRow 
                key={order.orderNo}
                className={`${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-muted/50' : ''}`}
                onClick={(e) => handleRowClick(order.orderNo, e)}
              >
                {selectionMode && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(order.orderNo, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>
                  <Badge variant={order.isCustomerOrder ? 'default' : 'secondary'}>
                    {order.orderType}
                  </Badge>
                </TableCell>
                <TableCell>{order.designCode}</TableCell>
                <TableCell>{order.genericName}</TableCell>
                {!karigarMode && (
                  <TableCell>{formatKarigarName(order.karigarName)}</TableCell>
                )}
                <TableCell className="text-right">{Number(order.qty)}</TableCell>
                <TableCell className="text-right">{order.weight.toFixed(2)}</TableCell>
                <TableCell className="text-right">{order.size.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={order.status === 'pending' ? 'outline' : 'default'}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(orderDate, 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onViewDesignImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDesignImage(order);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEditRbSupplied && canEditRbSupplied(order) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRbSupplied(order);
                        }}
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

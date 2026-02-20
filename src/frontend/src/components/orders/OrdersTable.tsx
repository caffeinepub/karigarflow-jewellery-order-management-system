import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';
import { getStatusRowColor } from '../../lib/orders/getStatusRowColor';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import { resolveKarigarName } from '../../lib/orders/resolveKarigarName';
import type { PersistentOrder, PersistentKarigar } from '../../backend';
import { DesignImageViewerDialog } from '../designImages/DesignImageViewerDialog';

interface OrdersTableProps {
  orders: PersistentOrder[];
  karigars: PersistentKarigar[];
  selectedOrders: string[];
  onSelectionChange: (orderNos: string[]) => void;
}

export function OrdersTable({ orders, karigars, selectedOrders, onSelectionChange }: OrdersTableProps) {
  const [viewingDesignCode, setViewingDesignCode] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(orders.map(o => o.orderNo));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOrder = (orderNo: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedOrders, orderNo]);
    } else {
      onSelectionChange(selectedOrders.filter(no => no !== orderNo));
    }
  };

  const handleRowClick = (orderNo: string, e: React.MouseEvent) => {
    // Prevent row click when clicking on checkbox or button
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]')) {
      return;
    }

    const isSelected = selectedOrders.includes(orderNo);
    handleSelectOrder(orderNo, !isSelected);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No orders found
      </div>
    );
  }

  const allSelected = orders.length > 0 && orders.every(o => selectedOrders.includes(o.orderNo));
  const someSelected = orders.some(o => selectedOrders.includes(o.orderNo)) && !allSelected;

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all orders"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              <TableHead>Order No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Design Code</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead>Weight (g)</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const isSelected = selectedOrders.includes(order.orderNo);
              const rowColor = getStatusRowColor(normalizeStatus(order.status));
              const bgClass = isSelected ? 'bg-red-100 hover:bg-red-200' : `${rowColor} hover:bg-muted/50`;

              return (
                <TableRow
                  key={order.orderNo}
                  className={`cursor-pointer min-h-[44px] ${bgClass} transition-colors`}
                  onClick={(e) => handleRowClick(order.orderNo, e)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOrder(order.orderNo, checked as boolean)}
                      aria-label={`Select order ${order.orderNo}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>
                    {order.orderType}
                    {order.isCustomerOrder && (
                      <Badge variant="secondary" className="ml-2">CO</Badge>
                    )}
                  </TableCell>
                  <TableCell>{order.designCode}</TableCell>
                  <TableCell>{order.genericName}</TableCell>
                  <TableCell>{resolveKarigarName(order.karigarId, karigars)}</TableCell>
                  <TableCell>{formatOptionalNumber(order.weight, 2)}</TableCell>
                  <TableCell>{formatOptionalNumber(order.size, 2)}</TableCell>
                  <TableCell>{Number(order.qty)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{order.remarks}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.status}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingDesignCode(order.designCode)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DesignImageViewerDialog
        designCode={viewingDesignCode || ''}
        open={!!viewingDesignCode}
        onOpenChange={(open) => !open && setViewingDesignCode(null)}
      />
    </>
  );
}

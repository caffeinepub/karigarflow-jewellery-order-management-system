import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus } from 'lucide-react';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';
import { getKarigarBadgeClasses } from '../../lib/karigars/getKarigarColor';
import { getStatusRowColor } from '../../lib/orders/getStatusRowColor';
import { resolveKarigarName } from '../../lib/orders/resolveKarigarName';
import type { PersistentOrder, PersistentKarigar } from '../../backend';

interface OrdersTableProps {
  orders: PersistentOrder[];
  karigars: PersistentKarigar[];
  selectedOrders: string[];
  onSelectionChange: (orderNos: string[]) => void;
}

export function OrdersTable({ orders, karigars, selectedOrders, onSelectionChange }: OrdersTableProps) {
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(orders.map((o) => o.orderNo));
    }
  };

  const handleSelectOrder = (orderNo: string) => {
    if (selectedOrders.includes(orderNo)) {
      onSelectionChange(selectedOrders.filter((o) => o !== orderNo));
    } else {
      onSelectionChange([...selectedOrders, orderNo]);
    }
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              {someSelected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 w-8 p-0"
                  aria-label="Deselect all"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              ) : (
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} aria-label="Select all" />
              )}
            </TableHead>
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isSelected = selectedOrders.includes(order.orderNo);
            const karigarName = resolveKarigarName(order.karigarId, karigars);
            const statusRowColor = getStatusRowColor(order.status);
            
            return (
              <TableRow
                key={order.orderNo}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10 hover:bg-primary/15' : statusRowColor
                }`}
                onClick={() => handleSelectOrder(order.orderNo)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectOrder(order.orderNo)}
                    aria-label={`Select order ${order.orderNo}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>
                  <Badge variant={order.isCustomerOrder ? 'default' : 'secondary'}>{order.orderType}</Badge>
                </TableCell>
                <TableCell>{order.designCode}</TableCell>
                <TableCell>{order.genericName}</TableCell>
                <TableCell>
                  <Badge className={getKarigarBadgeClasses(karigarName)}>
                    {karigarName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatOptionalNumber(order.weight, 2)}</TableCell>
                <TableCell className="text-right">{formatOptionalNumber(order.size, 2)}</TableCell>
                <TableCell className="text-right font-semibold">{order.qty.toString()}</TableCell>
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
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{order.remarks || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X } from 'lucide-react';
import type { SavedOrder } from '../../backend';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';

interface BatchOrdersTableProps {
  orders: SavedOrder[];
  onRemove: (orderNo: string) => void;
}

export function BatchOrdersTable({ orders, onRemove }: BatchOrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white">Order No</TableHead>
            <TableHead className="text-white">Design Code</TableHead>
            <TableHead className="text-white">Generic Name</TableHead>
            <TableHead className="text-white">Karigar</TableHead>
            <TableHead className="text-white">Status</TableHead>
            <TableHead className="text-white">Qty</TableHead>
            <TableHead className="w-[80px] text-white">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.orderNo}>
              <TableCell className="text-white">{order.orderNo}</TableCell>
              <TableCell className="text-white">{order.designCode}</TableCell>
              <TableCell className="text-white">{order.genericName}</TableCell>
              <TableCell className="text-white">{order.karigarName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-white">{order.status}</Badge>
              </TableCell>
              <TableCell className="text-white">{Number(order.qty)}</TableCell>
              <TableCell>
                <Button
                  onClick={() => onRemove(order.orderNo)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

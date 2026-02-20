import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, CheckCircle2 } from 'lucide-react';
import type { SavedOrder } from '../../backend';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';

interface BarcodeOrdersListProps {
  orders: SavedOrder[];
  highlightedOrderNo: string | null;
  scannedOrderNos: Set<string>;
}

export function BarcodeOrdersList({ orders, highlightedOrderNo, scannedOrderNos }: BarcodeOrdersListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.designCode.toLowerCase().includes(term) ||
      order.orderNo.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by design code or order number..."
          className="pl-10 text-white"
        />
      </div>

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const isHighlighted = order.orderNo === highlightedOrderNo;
              const isScanned = scannedOrderNos.has(order.orderNo);
              
              return (
                <TableRow
                  key={order.orderNo}
                  className={
                    isHighlighted
                      ? 'bg-purple-900/50 border-l-4 border-l-purple-500'
                      : isScanned
                      ? 'opacity-50'
                      : ''
                  }
                >
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      {order.orderNo}
                      {isScanned && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-white">{order.designCode}</TableCell>
                  <TableCell className="text-white">{order.genericName}</TableCell>
                  <TableCell className="text-white">{order.karigarName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-white">{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-white">{Number(order.qty)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

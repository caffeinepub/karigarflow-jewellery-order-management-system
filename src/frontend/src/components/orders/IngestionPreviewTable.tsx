import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { formatKarigarName } from '@/lib/orders/formatKarigarName';
import type { PersistentOrder } from '../../backend';

interface IngestionPreviewTableProps {
  orders: PersistentOrder[];
  unmappedCodes: string[];
}

export function IngestionPreviewTable({ orders, unmappedCodes }: IngestionPreviewTableProps) {
  const unmappedSet = new Set(unmappedCodes);

  return (
    <ScrollArea className="h-[500px] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[180px]">Order No</TableHead>
            <TableHead className="w-[80px]">Type</TableHead>
            <TableHead className="w-[120px]">Design</TableHead>
            <TableHead className="w-[150px]">Generic</TableHead>
            <TableHead className="w-[150px]">Karigar</TableHead>
            <TableHead className="w-[100px] text-right">Weight</TableHead>
            <TableHead className="w-[100px] text-right">Size</TableHead>
            <TableHead className="w-[80px] text-right">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order, idx) => {
            const isUnmapped = unmappedSet.has(order.designCode);
            const hasPdfKarigar = order.karigarName && order.karigarName.trim() !== '' && order.karigarName.trim().toLowerCase() !== 'unassigned';
            
            return (
              <TableRow key={`${order.orderNo}-${idx}`} className={isUnmapped ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                <TableCell>
                  <Badge variant={order.isCustomerOrder ? 'default' : 'secondary'} className="text-xs">
                    {order.orderType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {order.designCode}
                  {isUnmapped && (
                    <Badge variant="outline" className="ml-2 text-xs text-yellow-600">
                      Unmapped
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {order.genericName || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    {hasPdfKarigar && (
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" aria-label="Assigned from PDF" />
                    )}
                    <span>{formatKarigarName(order.karigarName)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{order.weight.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{order.size.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{order.qty}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

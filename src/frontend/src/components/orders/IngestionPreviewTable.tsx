import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';

interface IngestionPreviewTableProps {
  previewOrders: PersistentOrder[];
  unmappedCodes: string[];
}

export function IngestionPreviewTable({ previewOrders, unmappedCodes }: IngestionPreviewTableProps) {
  const isUnmapped = (designCode: string) => unmappedCodes.includes(designCode);

  if (previewOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders to preview
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto max-h-[600px] overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-12">Status</TableHead>
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewOrders.map((order, idx) => {
            const unmapped = isUnmapped(order.designCode);
            const isPdfDerived = order.karigarName && order.karigarName.trim() !== '' && order.karigarName.toLowerCase() !== 'unassigned';
            
            return (
              <TableRow
                key={`${order.orderNo}-${idx}`}
                className={unmapped ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
              >
                <TableCell>
                  {unmapped ? (
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-label="Unmapped" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" aria-label="Mapped" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>
                  <Badge variant={order.isCustomerOrder ? 'default' : 'secondary'}>
                    {order.orderType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{order.designCode}</TableCell>
                <TableCell>{order.genericName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    {formatKarigarName(order.karigarName)}
                    {isPdfDerived && (
                      <CheckCircle 
                        className="h-3 w-3 text-blue-600 flex-shrink-0" 
                        aria-label="Assigned from PDF"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">{order.qty.toString()}</TableCell>
                <TableCell className="text-right">
                  {formatOptionalNumber(order.weight, 2) || <span className="text-muted-foreground italic">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {formatOptionalNumber(order.size, 2) || <span className="text-muted-foreground italic">—</span>}
                </TableCell>
                <TableCell className="max-w-xs truncate">{order.remarks || <span className="text-muted-foreground italic">—</span>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

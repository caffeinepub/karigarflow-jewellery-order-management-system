import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import type { Order } from '../../backend';
import { normalizeDesignCode } from '../../lib/mapping/normalizeDesignCode';

interface IngestionPreviewTableProps {
  orders: Order[];
  unmappedCodes: string[];
}

export function IngestionPreviewTable({ orders, unmappedCodes }: IngestionPreviewTableProps) {
  // Normalize unmapped codes for comparison
  const normalizedUnmappedCodes = new Set(unmappedCodes.map(code => normalizeDesignCode(code)));

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order No</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Design</TableHead>
            <TableHead>Generic</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order, idx) => {
            // Check if this order's design code is unmapped using normalized comparison
            const normalizedOrderCode = normalizeDesignCode(order.designCode);
            const isUnmapped = normalizedUnmappedCodes.has(normalizedOrderCode);
            
            return (
              <TableRow
                key={idx}
                className={order.isCustomerOrder ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
              >
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
                <TableCell>
                  {isUnmapped ? (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs">Unmapped</span>
                    </div>
                  ) : (
                    order.genericName || '-'
                  )}
                </TableCell>
                <TableCell>
                  {/* Always show karigarName, even for unmapped orders */}
                  {order.karigarName || '-'}
                </TableCell>
                <TableCell className="text-right">{order.weight.toFixed(2)}</TableCell>
                <TableCell className="text-right">{order.size.toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(order.qty)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{order.status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

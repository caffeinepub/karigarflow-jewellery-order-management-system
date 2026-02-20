import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SavedOrder } from '../../backend';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';

interface HallmarkOrdersTableProps {
  orders: SavedOrder[];
  selectedOrderNos: string[];
  onSelectionChange: (orderNos: string[]) => void;
}

export function HallmarkOrdersTable({
  orders,
  selectedOrderNos,
  onSelectionChange,
}: HallmarkOrdersTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allOrderNos = orders.map(o => o.orderNo);
      onSelectionChange([...new Set([...selectedOrderNos, ...allOrderNos])]);
    } else {
      const orderNosSet = new Set(orders.map(o => o.orderNo));
      onSelectionChange(selectedOrderNos.filter(no => !orderNosSet.has(no)));
    }
  };

  const handleSelectOrder = (orderNo: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedOrderNos, orderNo]);
    } else {
      onSelectionChange(selectedOrderNos.filter(no => no !== orderNo));
    }
  };

  const allSelected = orders.length > 0 && orders.every(o => selectedOrderNos.includes(o.orderNo));
  const someSelected = orders.some(o => selectedOrderNos.includes(o.orderNo)) && !allSelected;

  return (
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
            <TableHead className="text-white">Order No</TableHead>
            <TableHead className="text-white">Design Code</TableHead>
            <TableHead className="text-white">Generic Name</TableHead>
            <TableHead className="text-white">Karigar</TableHead>
            <TableHead className="text-white">Qty</TableHead>
            <TableHead className="text-white">Weight (g)</TableHead>
            <TableHead className="text-white">Size</TableHead>
            <TableHead className="text-white">Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isSelected = selectedOrderNos.includes(order.orderNo);
            const timestamp = getOrderTimestamp(order);
            
            return (
              <TableRow key={order.orderNo} className={isSelected ? 'bg-primary/10' : ''}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOrder(order.orderNo, checked as boolean)}
                    aria-label={`Select order ${order.orderNo}`}
                  />
                </TableCell>
                <TableCell className="text-white">{order.orderNo}</TableCell>
                <TableCell className="text-white">{order.designCode}</TableCell>
                <TableCell className="text-white">{order.genericName}</TableCell>
                <TableCell className="text-white">{order.karigarName}</TableCell>
                <TableCell className="text-white">{Number(order.qty)}</TableCell>
                <TableCell className="text-white">{formatOptionalNumber(order.weight)}</TableCell>
                <TableCell className="text-white">{formatOptionalNumber(order.size)}</TableCell>
                <TableCell className="text-white text-xs">
                  {timestamp.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

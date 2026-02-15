import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActor } from '../../hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Order } from '../../backend';
import { format } from 'date-fns';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';

interface OrdersTableProps {
  orders: Order[];
  showStatusUpdate?: boolean;
}

export function OrdersTable({ orders, showStatusUpdate = false }: OrdersTableProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const handleStatusChange = async (orderNo: string, newStatus: string) => {
    if (!actor) return;
    
    try {
      // Note: Backend doesn't have updateOrderStatus, so this is a placeholder
      // In a real implementation, you'd need to add this method to the backend
      toast.info('Status update feature coming soon');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update order status');
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found
      </div>
    );
  }

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
            <TableHead>Remarks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.orderNo}
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
              <TableCell>{order.genericName}</TableCell>
              <TableCell>{formatKarigarName(order.karigarName)}</TableCell>
              <TableCell className="text-right">{order.weight.toFixed(2)}g</TableCell>
              <TableCell className="text-right">{order.size.toFixed(2)}</TableCell>
              <TableCell className="text-right">{Number(order.qty)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{order.remarks}</TableCell>
              <TableCell>
                {showStatusUpdate ? (
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.orderNo, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Received</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{order.status}</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(Number(order.uploadDate) / 1000000), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

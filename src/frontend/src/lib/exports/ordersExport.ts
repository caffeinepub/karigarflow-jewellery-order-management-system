import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from '../orders/formatKarigarName';
import { formatOptionalNumberForExport } from '../orders/formatOptionalNumber';
import { getOrderTimestamp } from '../orders/getOrderTimestamp';
import { format, startOfDay, endOfDay } from 'date-fns';

type ExportType = 'all' | 'karigar' | 'co' | 'daily';

export function exportOrders(orders: PersistentOrder[], type: ExportType, selectedDate?: Date): void {
  let filteredOrders = orders;
  let filename = 'orders';

  // Apply filters based on export type
  switch (type) {
    case 'co':
      filteredOrders = orders.filter(o => o.isCustomerOrder);
      filename = 'customer_orders';
      break;
    case 'daily':
      if (selectedDate) {
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        filteredOrders = orders.filter(o => {
          const orderDate = getOrderTimestamp(o);
          return orderDate >= start && orderDate <= end;
        });
        filename = `daily_sheet_${format(selectedDate, 'yyyy-MM-dd')}`;
      }
      break;
    case 'karigar':
      filename = 'orders_by_karigar';
      break;
    default:
      filename = 'all_orders';
  }

  // Generate CSV content
  const headers = [
    'Order No',
    'Type',
    'Design Code',
    'Generic Name',
    'Karigar',
    'Weight (g)',
    'Size',
    'Qty',
    'Remarks',
    'Status',
    'Date',
  ];

  const rows = filteredOrders.map(order => [
    order.orderNo,
    order.orderType,
    order.designCode,
    order.genericName,
    formatKarigarName(order.karigarId),
    formatOptionalNumberForExport(order.weight, 2),
    formatOptionalNumberForExport(order.size, 2),
    String(Number(order.qty)),
    order.remarks,
    order.status,
    format(getOrderTimestamp(order), 'yyyy-MM-dd'),
  ]);

  // Sort by karigar if karigar export
  if (type === 'karigar') {
    rows.sort((a, b) => {
      const karigarCompare = a[4].localeCompare(b[4]);
      if (karigarCompare !== 0) return karigarCompare;
      return a[2].localeCompare(b[2]); // Then by design code
    });
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

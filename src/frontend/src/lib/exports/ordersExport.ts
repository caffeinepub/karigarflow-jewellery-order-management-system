import type { Order } from '../../backend';
import { format } from 'date-fns';

export function exportOrders(orders: Order[], type: 'all' | 'karigar' | 'co' | 'daily') {
  let filteredOrders = orders;
  let filename = 'orders';

  switch (type) {
    case 'co':
      filteredOrders = orders.filter((o) => o.isCustomerOrder);
      filename = 'co-orders';
      break;
    case 'daily':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredOrders = orders.filter((o) => {
        const orderDate = new Date(Number(o.uploadDate) / 1000000);
        return orderDate >= today;
      });
      filename = `daily-orders-${format(today, 'yyyy-MM-dd')}`;
      break;
    case 'karigar':
      filename = 'karigar-wise-orders';
      break;
    default:
      filename = 'all-orders';
  }

  const csv = convertToCSV(filteredOrders);
  downloadCSV(csv, `${filename}.csv`);
}

function convertToCSV(orders: Order[]): string {
  const headers = [
    'Order No',
    'Order Type',
    'Design Code',
    'Generic Name',
    'Karigar Name',
    'Weight',
    'Size',
    'Qty',
    'Remarks',
    'Status',
    'CO',
    'Upload Date',
  ];

  const rows = orders.map((order) => [
    order.orderNo,
    order.orderType,
    order.designCode,
    order.genericName,
    order.karigarName,
    order.weight.toFixed(2),
    order.size.toFixed(2),
    Number(order.qty),
    order.remarks,
    order.status,
    order.isCustomerOrder ? 'Yes' : 'No',
    format(new Date(Number(order.uploadDate) / 1000000), 'yyyy-MM-dd'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

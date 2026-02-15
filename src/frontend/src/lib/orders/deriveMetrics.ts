import type { Order } from '../../backend';
import { formatKarigarName } from './formatKarigarName';

export interface OrderMetrics {
  totalOrders: number;
  totalWeight: number;
  totalQty: number;
  coOrders: number;
  karigarWise: Record<string, { qty: number; weight: number }>;
}

export function deriveMetrics(orders: Order[]): OrderMetrics {
  const metrics: OrderMetrics = {
    totalOrders: orders.length,
    totalWeight: 0,
    totalQty: 0,
    coOrders: 0,
    karigarWise: {},
  };

  orders.forEach((order) => {
    metrics.totalWeight += order.weight;
    metrics.totalQty += Number(order.qty);
    
    if (order.isCustomerOrder) {
      metrics.coOrders++;
    }

    // Use shared formatter to ensure consistent display
    const displayKarigar = formatKarigarName(order.karigarName);

    if (!metrics.karigarWise[displayKarigar]) {
      metrics.karigarWise[displayKarigar] = { qty: 0, weight: 0 };
    }
    
    metrics.karigarWise[displayKarigar].qty += Number(order.qty);
    metrics.karigarWise[displayKarigar].weight += order.weight;
  });

  return metrics;
}

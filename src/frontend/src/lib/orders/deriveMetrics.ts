import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from './formatKarigarName';

export interface KarigarStats {
  count: number;
  totalWeight: number;
  totalQty: number;
  customerOrdersCount: number;
}

export interface OrderMetrics {
  totalOrders: number;
  totalWeight: number;
  totalQty: number;
  customerOrdersCount: number;
  byKarigar: Record<string, KarigarStats>;
}

export function deriveMetrics(orders: PersistentOrder[]): OrderMetrics {
  const metrics: OrderMetrics = {
    totalOrders: orders.length,
    totalWeight: 0,
    totalQty: 0,
    customerOrdersCount: 0,
    byKarigar: {},
  };

  orders.forEach((order) => {
    metrics.totalWeight += order.weight;
    metrics.totalQty += Number(order.qty);
    
    if (order.isCustomerOrder) {
      metrics.customerOrdersCount++;
    }

    // Use shared formatter to ensure consistent display
    const displayKarigar = formatKarigarName(order.karigarName);

    if (!metrics.byKarigar[displayKarigar]) {
      metrics.byKarigar[displayKarigar] = { 
        count: 0, 
        totalWeight: 0, 
        totalQty: 0,
        customerOrdersCount: 0,
      };
    }
    
    metrics.byKarigar[displayKarigar].count++;
    metrics.byKarigar[displayKarigar].totalQty += Number(order.qty);
    metrics.byKarigar[displayKarigar].totalWeight += order.weight;
    
    if (order.isCustomerOrder) {
      metrics.byKarigar[displayKarigar].customerOrdersCount++;
    }
  });

  return metrics;
}

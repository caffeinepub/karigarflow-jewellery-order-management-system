import type { Order } from '../../backend';

export interface OrderMetrics {
  totalOrders: number;
  totalWeight: number;
  totalQty: number;
  coOrders: number;
  karigarWise: Record<string, { qty: number; weight: number }>;
}

const UNASSIGNED_LABEL = 'Unassigned';

/**
 * Normalize karigar name: treat empty/whitespace-only as "Unassigned"
 */
function normalizeKarigarName(karigarName: string): string {
  const trimmed = karigarName?.trim() || '';
  return trimmed === '' ? UNASSIGNED_LABEL : trimmed;
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

    // Normalize karigar name to avoid empty string keys
    const normalizedKarigar = normalizeKarigarName(order.karigarName);

    if (!metrics.karigarWise[normalizedKarigar]) {
      metrics.karigarWise[normalizedKarigar] = { qty: 0, weight: 0 };
    }
    
    metrics.karigarWise[normalizedKarigar].qty += Number(order.qty);
    metrics.karigarWise[normalizedKarigar].weight += order.weight;
  });

  return metrics;
}

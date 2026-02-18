import type { PersistentOrder } from '../../backend';
import { sanitizeOrders } from './validatePersistentOrder';
import { formatKarigarName } from './formatKarigarName';

export interface KarigarStats {
  totalOrders: number;
  totalQty: number;
  totalWeight: number;
}

export interface OrderMetrics {
  totalOrders: number;
  totalQty: number;
  totalWeight: number;
  customerOrdersCount: number;
  byKarigar: Record<string, KarigarStats>;
}

export function deriveMetrics(orders: PersistentOrder[]): OrderMetrics {
  const { validOrders } = sanitizeOrders(orders);
  
  const byKarigar: Record<string, KarigarStats> = {};
  let totalQty = 0;
  let totalWeight = 0;
  let customerOrdersCount = 0;

  for (const order of validOrders) {
    const qty = Number(order.qty) || 0;
    const weight = Number(order.weight) || 0;
    
    totalQty += qty;
    totalWeight += weight;
    
    if (order.isCustomerOrder) {
      customerOrdersCount++;
    }

    const karigarName = formatKarigarName(order.karigarId);
    if (!byKarigar[karigarName]) {
      byKarigar[karigarName] = {
        totalOrders: 0,
        totalQty: 0,
        totalWeight: 0,
      };
    }
    
    byKarigar[karigarName].totalOrders++;
    byKarigar[karigarName].totalQty += qty;
    byKarigar[karigarName].totalWeight += weight;
  }

  return {
    totalOrders: validOrders.length,
    totalQty,
    totalWeight,
    customerOrdersCount,
    byKarigar,
  };
}

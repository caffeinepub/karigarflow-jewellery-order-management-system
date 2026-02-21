import type { PersistentOrder } from '../../backend';
import { sanitizeOrders } from './validatePersistentOrder';
import { formatKarigarName } from './formatKarigarName';
import { normalizeStatus } from './normalizeStatus';
import { ORDER_STATUS } from './statusConstants';

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
  uniqueKarigars: number;
  uniqueDesigns: number;
  byKarigar: Record<string, KarigarStats>;
}

export function deriveMetrics(orders: PersistentOrder[]): OrderMetrics {
  const { validOrders } = sanitizeOrders(orders);
  
  // Filter to include only Pending and Returned from Hallmark orders
  const ordersForMetrics = validOrders.filter(order => {
    const status = normalizeStatus(order.status);
    return status === normalizeStatus(ORDER_STATUS.PENDING) || 
           status === normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK);
  });
  
  const byKarigar: Record<string, KarigarStats> = {};
  const uniqueKarigarIds = new Set<string>();
  const uniqueDesignCodes = new Set<string>();
  let totalQty = 0;
  let totalWeight = 0;
  let customerOrdersCount = 0;

  for (const order of ordersForMetrics) {
    const qty = Number(order.qty) || 0;
    const weight = Number(order.weight) || 0;
    
    totalQty += qty;
    totalWeight += weight;
    
    if (order.isCustomerOrder) {
      customerOrdersCount++;
    }

    // Track unique karigars and designs
    uniqueKarigarIds.add(order.karigarId);
    uniqueDesignCodes.add(order.designCode);

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
    totalOrders: ordersForMetrics.length,
    totalQty,
    totalWeight,
    customerOrdersCount,
    uniqueKarigars: uniqueKarigarIds.size,
    uniqueDesigns: uniqueDesignCodes.size,
    byKarigar,
  };
}

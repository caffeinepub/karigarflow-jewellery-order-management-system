import type { PersistentOrder } from '../../backend';

/**
 * Type guard to check if an order is a valid PersistentOrder with all required fields.
 */
export function isValidPersistentOrder(order: any): order is PersistentOrder {
  if (!order || typeof order !== 'object') {
    return false;
  }

  // Check required string fields
  if (typeof order.orderNo !== 'string' || order.orderNo === '') {
    return false;
  }
  if (typeof order.designCode !== 'string' || order.designCode === '') {
    return false;
  }
  if (typeof order.orderType !== 'string' || order.orderType === '') {
    return false;
  }

  // Check required numeric fields
  if (typeof order.qty !== 'bigint' && typeof order.qty !== 'number') {
    return false;
  }

  // Check other required fields exist
  if (typeof order.status !== 'string') {
    return false;
  }
  if (typeof order.genericName !== 'string') {
    return false;
  }
  if (typeof order.karigarName !== 'string') {
    return false;
  }

  return true;
}

/**
 * Sanitize an array of orders by filtering out invalid entries.
 * Returns both the valid orders and the count of skipped invalid entries.
 */
export function sanitizeOrders(orders: any[]): { validOrders: PersistentOrder[]; skippedCount: number } {
  const validOrders: PersistentOrder[] = [];
  let skippedCount = 0;

  for (const order of orders) {
    if (isValidPersistentOrder(order)) {
      validOrders.push(order);
    } else {
      skippedCount++;
      console.warn('Skipped invalid order entry:', order);
    }
  }

  return { validOrders, skippedCount };
}

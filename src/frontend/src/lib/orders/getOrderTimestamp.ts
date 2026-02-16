import type { Order } from '../../backend';

/**
 * Deterministically derives a Date from an order's uploadDate with fallback to createdAt.
 * This ensures consistent date filtering across dashboards, exports, and tables.
 */
export function getOrderTimestamp(order: Order): Date {
  const uploadTime = Number(order.uploadDate);
  
  // If uploadDate is valid (non-zero), use it
  if (uploadTime > 0) {
    return new Date(uploadTime / 1000000);
  }
  
  // Fallback to createdAt
  const createdTime = Number(order.createdAt);
  return new Date(createdTime / 1000000);
}

/**
 * Checks if an order's timestamp falls within a given date (ignoring time).
 */
export function isOrderOnDate(order: Order, date: Date): boolean {
  const orderDate = getOrderTimestamp(order);
  const targetStart = new Date(date);
  targetStart.setHours(0, 0, 0, 0);
  const targetEnd = new Date(date);
  targetEnd.setHours(23, 59, 59, 999);
  
  return orderDate >= targetStart && orderDate <= targetEnd;
}

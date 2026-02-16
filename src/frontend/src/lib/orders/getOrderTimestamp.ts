import type { PersistentOrder } from '../../backend';

/**
 * Get the timestamp for an order, preferring uploadDate over createdAt.
 * Returns a Date object for consistent date filtering across dashboards, exports, and tables.
 */
export function getOrderTimestamp(order: PersistentOrder): Date {
  // Prefer uploadDate if it's set (non-zero), otherwise fall back to createdAt
  const timestamp = order.uploadDate && order.uploadDate > 0n ? order.uploadDate : order.createdAt;
  
  // Convert nanoseconds to milliseconds
  const milliseconds = Number(timestamp / 1_000_000n);
  
  return new Date(milliseconds);
}

import type { SavedOrder, PersistentOrder } from '../../backend';

/**
 * Get the timestamp for an order, preferring lastStatusChange over uploadDate over createdAt.
 * Returns a Date object for consistent date filtering across dashboards, exports, and tables.
 * Accepts both SavedOrder and PersistentOrder types.
 */
export function getOrderTimestamp(order: SavedOrder | PersistentOrder): Date {
  // Prefer lastStatusChange if it's set (non-zero), then uploadDate, then fall back to createdAt
  let timestamp: bigint;
  
  if (order.lastStatusChange && order.lastStatusChange > 0n) {
    timestamp = order.lastStatusChange;
  } else if (order.uploadDate && order.uploadDate > 0n) {
    timestamp = order.uploadDate;
  } else {
    timestamp = order.createdAt;
  }
  
  // Convert nanoseconds to milliseconds
  const milliseconds = Number(timestamp / 1_000_000n);
  
  return new Date(milliseconds);
}

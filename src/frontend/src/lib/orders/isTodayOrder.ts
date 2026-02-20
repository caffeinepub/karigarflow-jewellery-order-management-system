import { startOfDay, endOfDay } from 'date-fns';
import type { PersistentOrder } from '../../backend';

/**
 * Checks if an order has activity today by comparing either the order's
 * creation timestamp (uploadDate/createdAt) or lastStatusChange timestamp
 * against today's date range.
 * Returns true if either timestamp falls within today.
 */
export function isTodayOrder(order: PersistentOrder): boolean {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);

  // Check creation date
  const uploadDate = order.uploadDate ? new Date(Number(order.uploadDate) / 1000000) : null;
  const createdAt = order.createdAt ? new Date(Number(order.createdAt) / 1000000) : null;
  const creationDate = uploadDate || createdAt;

  if (creationDate && creationDate >= startOfToday && creationDate <= endOfToday) {
    return true;
  }

  // Check last status change date
  const lastStatusChange = order.lastStatusChange
    ? new Date(Number(order.lastStatusChange) / 1000000)
    : null;

  if (lastStatusChange && lastStatusChange >= startOfToday && lastStatusChange <= endOfToday) {
    return true;
  }

  return false;
}

import type { PersistentOrder } from '@/backend';

/**
 * Split orders into batches of specified size
 */
export function chunkOrders(orders: PersistentOrder[], batchSize: number): PersistentOrder[][] {
  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }
  
  if (orders.length === 0) {
    return [];
  }

  const chunks: PersistentOrder[][] = [];
  for (let i = 0; i < orders.length; i += batchSize) {
    chunks.push(orders.slice(i, i + batchSize));
  }
  return chunks;
}

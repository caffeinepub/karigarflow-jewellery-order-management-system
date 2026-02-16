import type { Order } from '@/backend';

/**
 * Split orders into batches of a specified size for chunked uploads.
 * @param orders Array of orders to split
 * @param batchSize Maximum number of orders per batch (default: 50)
 * @returns Array of order batches
 */
export function chunkOrders(orders: Order[], batchSize: number = 50): Order[][] {
  if (!orders || orders.length === 0) {
    return [];
  }

  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }

  const chunks: Order[][] = [];
  for (let i = 0; i < orders.length; i += batchSize) {
    chunks.push(orders.slice(i, i + batchSize));
  }

  return chunks;
}

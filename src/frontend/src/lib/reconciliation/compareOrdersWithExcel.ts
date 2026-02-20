import type { PersistentOrder, SavedOrder, MasterDesignEntry } from '../../backend';
import { normalizeDesignCode } from '../mapping/normalizeDesignCode';
import { normalizeStatus } from '../orders/normalizeStatus';

export interface ReconciliationResult {
  matched: PersistentOrder[];
  missing: PersistentOrder[];
  unmapped: PersistentOrder[];
}

/**
 * Compare parsed Excel orders against existing orders (excluding Billed status).
 * Returns matched, missing, and unmapped orders.
 */
export function compareOrdersWithExcel(
  parsedOrders: PersistentOrder[],
  existingOrders: SavedOrder[],
  masterDesigns: Array<[string, MasterDesignEntry]>
): ReconciliationResult {
  const matched: PersistentOrder[] = [];
  const missing: PersistentOrder[] = [];
  const unmapped: PersistentOrder[] = [];

  // Filter out orders with 'billed' status
  const nonBilledOrders = existingOrders.filter(
    order => normalizeStatus(order.status) !== 'billed'
  );

  // Create a Set of existing order keys (designCode + orderNo) for fast lookup
  const existingOrderKeys = new Set(
    nonBilledOrders.map(order => 
      `${normalizeDesignCode(order.designCode)}_${order.orderNo}`
    )
  );

  // Create a Set of master design codes for fast lookup
  const masterDesignCodes = new Set(
    masterDesigns.map(([code]) => normalizeDesignCode(code))
  );

  // Compare each parsed order
  for (const parsedOrder of parsedOrders) {
    const normalizedDesignCode = normalizeDesignCode(parsedOrder.designCode);
    const orderKey = `${normalizedDesignCode}_${parsedOrder.orderNo}`;

    // Check if design code exists in master designs
    if (!masterDesignCodes.has(normalizedDesignCode)) {
      unmapped.push(parsedOrder);
      continue;
    }

    // Check if order already exists (potential duplicate)
    if (existingOrderKeys.has(orderKey)) {
      matched.push(parsedOrder);
    } else {
      missing.push(parsedOrder);
    }
  }

  return { matched, missing, unmapped };
}

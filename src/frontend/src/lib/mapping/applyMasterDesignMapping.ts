import type { Order, MasterDesignEntry } from '../../backend';
import { normalizeDesignCode } from './normalizeDesignCode';

export interface MappingResult {
  mappedOrders: Order[];
  unmappedOrders: Order[];
  unmappedDesignCodes: string[];
}

/**
 * Applies master design mapping to parsed orders.
 * Preserves PDF-derived karigarName when present (non-empty and non-whitespace).
 * Only fills karigarName from master design when incoming order has empty karigarName.
 * 
 * This function is idempotent and can be called multiple times with the same raw orders
 * as master designs are loaded or updated.
 */
export function applyMasterDesignMapping(
  rawOrders: Order[],
  masterDesigns: [string, MasterDesignEntry][]
): MappingResult {
  // Build a normalized design map
  const designMap = new Map<string, MasterDesignEntry>();
  masterDesigns.forEach(([code, entry]) => {
    const normalizedCode = normalizeDesignCode(code);
    designMap.set(normalizedCode, entry);
  });

  const mappedOrders: Order[] = [];
  const unmappedOrders: Order[] = [];
  const unmappedCodes = new Set<string>();

  rawOrders.forEach((order) => {
    const normalizedOrderCode = normalizeDesignCode(order.designCode);
    const mapping = designMap.get(normalizedOrderCode);
    
    // Check if PDF-derived karigarName is meaningful (not empty or whitespace-only)
    const hasPdfKarigarName = order.karigarName && order.karigarName.trim() !== '';
    
    if (mapping && mapping.isActive) {
      // Design code is mapped
      mappedOrders.push({
        ...order,
        genericName: mapping.genericName,
        // Preserve PDF-derived karigarName if present and meaningful, otherwise use master design karigarName
        karigarName: hasPdfKarigarName ? order.karigarName : mapping.karigarName,
      });
    } else {
      // Design code is not mapped or inactive
      unmappedCodes.add(order.designCode);
      unmappedOrders.push(order);
    }
  });

  return {
    mappedOrders,
    unmappedOrders,
    unmappedDesignCodes: Array.from(unmappedCodes),
  };
}

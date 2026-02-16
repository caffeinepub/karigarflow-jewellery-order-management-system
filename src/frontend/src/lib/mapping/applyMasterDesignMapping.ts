import type { PersistentOrder, MasterDesignEntry } from '../../backend';
import { normalizeDesignCode } from './normalizeDesignCode';

export interface MappingResult {
  mappedOrders: PersistentOrder[];
  unmappedOrders: PersistentOrder[];
  unmappedDesignCodes: string[];
  previewOrders: PersistentOrder[]; // All orders with mapping applied for preview
}

/**
 * Applies master design mapping to parsed orders.
 * Treats empty, whitespace-only, or "Unassigned" (case-insensitive) karigar names as missing.
 * Preserves meaningful PDF-derived karigar names.
 * 
 * This function is idempotent and can be called multiple times with the same raw orders
 * as master designs are loaded or updated.
 */
export function applyMasterDesignMapping(
  rawOrders: PersistentOrder[],
  masterDesigns: [string, MasterDesignEntry][]
): MappingResult {
  // Build a normalized design map
  const designMap = new Map<string, MasterDesignEntry>();
  masterDesigns.forEach(([code, entry]) => {
    const normalizedCode = normalizeDesignCode(code);
    designMap.set(normalizedCode, entry);
  });

  const mappedOrders: PersistentOrder[] = [];
  const unmappedOrders: PersistentOrder[] = [];
  const previewOrders: PersistentOrder[] = [];
  const unmappedCodes = new Set<string>();

  rawOrders.forEach((order) => {
    const normalizedOrderCode = normalizeDesignCode(order.designCode);
    const mapping = designMap.get(normalizedOrderCode);
    
    // Check if PDF-derived karigarName is meaningful
    // Treat empty, whitespace-only, or "Unassigned" (case-insensitive) as missing
    const trimmedKarigar = order.karigarName?.trim() || '';
    const isPlaceholder = trimmedKarigar === '' || trimmedKarigar.toLowerCase() === 'unassigned';
    const hasMeaningfulKarigarName = !isPlaceholder;
    
    if (mapping && mapping.isActive) {
      // Design code is mapped
      const mappedOrder: PersistentOrder = {
        ...order,
        genericName: mapping.genericName,
        // Use master design karigarName only if order's karigar is missing/placeholder
        karigarName: hasMeaningfulKarigarName ? order.karigarName : mapping.karigarName,
      };
      mappedOrders.push(mappedOrder);
      previewOrders.push(mappedOrder);
    } else {
      // Design code is not mapped or inactive
      unmappedCodes.add(order.designCode);
      unmappedOrders.push(order);
      previewOrders.push(order); // Keep unmapped orders in preview as-is
    }
  });

  return {
    mappedOrders,
    unmappedOrders,
    unmappedDesignCodes: Array.from(unmappedCodes),
    previewOrders,
  };
}

import type { PersistentOrder } from '../../backend';
import { normalizeDesignCode } from '../mapping/normalizeDesignCode';

/**
 * Sort orders design-wise (primary by normalized designCode, secondary by orderNo)
 * to ensure similar designs appear together in all order lists.
 */
export function sortOrdersDesignWise(orders: PersistentOrder[]): PersistentOrder[] {
  return [...orders].sort((a, b) => {
    const codeA = normalizeDesignCode(a.designCode);
    const codeB = normalizeDesignCode(b.designCode);
    
    const codeCompare = codeA.localeCompare(codeB);
    if (codeCompare !== 0) return codeCompare;
    
    return a.orderNo.localeCompare(b.orderNo);
  });
}

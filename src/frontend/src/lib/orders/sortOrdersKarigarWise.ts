import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from './formatKarigarName';
import { normalizeDesignCode } from '../mapping/normalizeDesignCode';
import { sanitizeOrders } from './validatePersistentOrder';

/**
 * Sort orders karigar-wise (primary by formatted karigar name, secondary by normalized design code, tertiary by orderNo)
 * to group orders by karigar with consistent design grouping within each karigar.
 */
export function sortOrdersKarigarWise(orders: PersistentOrder[]): PersistentOrder[] {
  // Sanitize orders before sorting
  const { validOrders } = sanitizeOrders(orders);
  
  return [...validOrders].sort((a, b) => {
    const karigarA = formatKarigarName(a.karigarId);
    const karigarB = formatKarigarName(b.karigarId);
    
    const karigarCompare = karigarA.localeCompare(karigarB);
    if (karigarCompare !== 0) return karigarCompare;
    
    const codeA = normalizeDesignCode(a.designCode);
    const codeB = normalizeDesignCode(b.designCode);
    
    const codeCompare = codeA.localeCompare(codeB);
    if (codeCompare !== 0) return codeCompare;
    
    return a.orderNo.localeCompare(b.orderNo);
  });
}

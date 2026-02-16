import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from './formatKarigarName';
import { normalizeDesignCode } from '../mapping/normalizeDesignCode';

/**
 * Sort orders karigar-wise (primary by formatted karigar name, secondary by normalized design code, tertiary by orderNo)
 * to group orders by karigar with consistent design grouping within each karigar.
 */
export function sortOrdersKarigarWise(orders: PersistentOrder[]): PersistentOrder[] {
  return [...orders].sort((a, b) => {
    const karigarA = formatKarigarName(a.karigarName);
    const karigarB = formatKarigarName(b.karigarName);
    
    const karigarCompare = karigarA.localeCompare(karigarB);
    if (karigarCompare !== 0) return karigarCompare;
    
    const codeA = normalizeDesignCode(a.designCode);
    const codeB = normalizeDesignCode(b.designCode);
    
    const codeCompare = codeA.localeCompare(codeB);
    if (codeCompare !== 0) return codeCompare;
    
    return a.orderNo.localeCompare(b.orderNo);
  });
}

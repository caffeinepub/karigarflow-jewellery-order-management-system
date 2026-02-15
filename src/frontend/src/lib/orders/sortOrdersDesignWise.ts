import { Order } from '../../backend';
import { normalizeDesignCode } from '../mapping/normalizeDesignCode';

/**
 * Sort orders design-wise: primary by normalized designCode, secondary by orderNo.
 * This ensures similar designs appear together in the UI.
 */
export function sortOrdersDesignWise(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const designA = normalizeDesignCode(a.designCode);
    const designB = normalizeDesignCode(b.designCode);
    
    // Primary sort: by normalized design code
    const designCompare = designA.localeCompare(designB);
    if (designCompare !== 0) return designCompare;
    
    // Secondary sort: by order number
    return a.orderNo.localeCompare(b.orderNo);
  });
}

import type { Order } from '../../../backend';
import { isCustomerOrder } from '../../orders/isCustomerOrder';

/**
 * Attempts to parse a single PDF line in the page-1 table format where each row contains:
 * Order No | Order Type | Design Code | Weight | Size | Qty | Generic Name (multi-word) | Karigar
 * 
 * Example: "6010SO26CSO BR-476895 24.11 8 1 IPL KATLI STAMPING MOMIN"
 * 
 * Returns a fully populated Order if parsing succeeds with high confidence, null otherwise.
 */
export function parseOrdersTableRowWithKarigar(
  line: string,
  uploadTimestamp: bigint,
  createdTimestamp: bigint
): Order | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Split by whitespace
  const parts = trimmed.split(/\s+/).filter(p => p.trim());
  
  // Need at least: orderNo, orderType, designCode, weight, size, qty, genericName (1+ words), karigar
  // Minimum 8 parts (if generic name is 1 word)
  if (parts.length < 8) {
    return null;
  }
  
  try {
    // Extract from the beginning (fixed positions)
    const orderNo = parts[0];
    const orderType = parts[1];
    const designCode = parts[2];
    
    // Validate order number and design code patterns
    if (!orderNo || orderNo.length < 3) return null;
    if (!designCode || designCode.length < 3) return null;
    
    // Parse numeric fields (positions 3, 4, 5)
    const weight = parseFloat(parts[3]);
    const size = parseFloat(parts[4]);
    const qty = parseInt(parts[5], 10);
    
    // Validate numeric fields
    if (isNaN(weight) || weight <= 0) return null;
    if (isNaN(size) || size <= 0) return null;
    if (isNaN(qty) || qty <= 0) return null;
    
    // Extract from the end: last token is Karigar
    const karigarName = parts[parts.length - 1];
    
    // Validate karigar name (should be mostly alphabetic, not numeric)
    if (!karigarName || karigarName.length < 2) return null;
    const karigarNumericRatio = (karigarName.match(/\d/g) || []).length / karigarName.length;
    if (karigarNumericRatio > 0.3) return null; // Too many numbers, probably not a name
    
    // Extract generic name: everything between qty (index 5) and karigar (last)
    // Generic name can be multi-word (e.g., "1 IPL KATLI STAMPING")
    const genericNameParts = parts.slice(6, parts.length - 1);
    if (genericNameParts.length === 0) return null; // Must have at least some generic name
    
    const genericName = genericNameParts.join(' ');
    
    // Additional validation: generic name should contain some alphabetic content
    if (!/[a-zA-Z]/.test(genericName)) return null;
    
    // Create order object
    const order: Order = {
      orderNo,
      orderType,
      designCode,
      genericName,
      karigarName,
      weight,
      size,
      qty: BigInt(qty),
      remarks: '',
      status: 'pending',
      isCustomerOrder: isCustomerOrder(orderType),
      uploadDate: uploadTimestamp,
      createdAt: createdTimestamp
    };
    
    return order;
  } catch (error) {
    // Parsing failed, return null to try fallback
    return null;
  }
}

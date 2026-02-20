import type { PersistentOrder } from '../../../backend';

/**
 * Focused helper that parses a single PDF line in the page-1 table format
 * (with explicit Generic Name and Karigar columns), extracting karigar name
 * from the last token and generic name from preceding tokens, returning a
 * fully populated Order when confidence checks pass or null otherwise.
 */
export function parseOrdersTableRowWithKarigar(line: string, uploadTimestamp: bigint): PersistentOrder | null {
  const tokens = line.split(/\s+/);
  
  // Need at least: orderNo, orderType, designCode, genericName, weight, size, qty, karigarName
  if (tokens.length < 8) return null;

  const orderNo = tokens[0];
  const orderType = tokens[1];
  const designCode = tokens[2];

  // Validate order number format
  if (!orderNo.match(/^\d+[A-Z]+-\d+-\d+$/i)) return null;
  
  // Validate design code format
  if (!designCode.match(/^[A-Z0-9-]+$/i)) return null;

  // Last token is karigar name
  const karigarName = tokens[tokens.length - 1];
  
  // Second-to-last, third-to-last, fourth-to-last are qty, size, weight
  const qty = parseInt(tokens[tokens.length - 2], 10);
  const size = parseFloat(tokens[tokens.length - 3]);
  const weight = parseFloat(tokens[tokens.length - 4]);

  if (isNaN(weight) || isNaN(size) || isNaN(qty)) return null;

  // Generic name is everything between designCode and weight
  const genericName = tokens.slice(3, tokens.length - 4).join(' ');
  
  // Validate karigar name (should be alphabetic, possibly with spaces if multi-word)
  if (!karigarName.match(/^[A-Za-z]+$/)) return null;

  const isCustomerOrder = orderType.toUpperCase().includes('CO');

  // Create karigarId from karigarName
  const karigarId = karigarName.trim().replace(/\s+/g, '_').toLowerCase();

  return {
    orderNo,
    orderType,
    designCode,
    genericName,
    karigarId,
    weight,
    size,
    qty: BigInt(qty),
    remarks: '',
    status: 'pending',
    isCustomerOrder,
    uploadDate: uploadTimestamp,
    createdAt: uploadTimestamp,
    lastStatusChange: uploadTimestamp,
  };
}

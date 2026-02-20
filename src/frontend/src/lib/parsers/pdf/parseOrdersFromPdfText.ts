import type { PersistentOrder } from '../../../backend';
import { parseOrdersTableRowWithKarigar } from './parseOrdersTableRowWithKarigar';

/**
 * Parses orders from extracted PDF text with dual-mode support:
 * - Attempts table-row format first (explicit Karigar column per row)
 * - Falls back to section-header format (karigar name as section header)
 * Preserves PDF-derived karigar assignments across page boundaries.
 */
export function parseOrdersFromPdfText(text: string, uploadDate: Date): PersistentOrder[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) {
    throw new Error('PDF appears to be empty');
  }

  const orders: PersistentOrder[] = [];
  let currentKarigar = '';
  let foundTableRowFormat = false;

  const uploadTimestamp = BigInt(uploadDate.getTime()) * 1_000_000n;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try table-row format first (with explicit Karigar column)
    const tableRowOrder = parseOrdersTableRowWithKarigar(line, uploadTimestamp);
    if (tableRowOrder) {
      foundTableRowFormat = true;
      orders.push(tableRowOrder);
      continue;
    }

    // If we've found table-row format, don't try section-header parsing
    if (foundTableRowFormat) continue;

    // Section-header format: Check if line is a karigar name header
    const isKarigarHeader = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/i.test(line) && 
                           line.split(/\s+/).length <= 3 &&
                           !line.match(/\d/);
    
    if (isKarigarHeader) {
      currentKarigar = line;
      continue;
    }

    // Try to parse as order line (section-header format)
    const tokens = line.split(/\s+/);
    if (tokens.length < 6) continue;

    const orderNo = tokens[0];
    const orderType = tokens[1];
    const designCode = tokens[2];

    // Basic validation
    if (!orderNo.match(/^\d+[A-Z]+-\d+-\d+$/i)) continue;
    if (!designCode.match(/^[A-Z0-9-]+$/i)) continue;

    // Extract numeric fields
    const weight = parseFloat(tokens[tokens.length - 3]);
    const size = parseFloat(tokens[tokens.length - 2]);
    const qty = parseInt(tokens[tokens.length - 1], 10);

    if (isNaN(weight) || isNaN(size) || isNaN(qty)) continue;

    // Generic name is everything between designCode and numeric fields
    const genericName = tokens.slice(3, tokens.length - 3).join(' ');

    const isCustomerOrder = orderType.toUpperCase().includes('CO');

    orders.push({
      orderNo,
      orderType,
      designCode,
      genericName,
      karigarId: currentKarigar,
      weight,
      size,
      qty: BigInt(qty),
      remarks: '',
      status: 'pending',
      isCustomerOrder,
      uploadDate: uploadTimestamp,
      createdAt: uploadTimestamp,
      lastStatusChange: uploadTimestamp,
    });
  }

  if (orders.length === 0) {
    throw new Error('No valid orders found in PDF. Please check the file format.');
  }

  return orders;
}

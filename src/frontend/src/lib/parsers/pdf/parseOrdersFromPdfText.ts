import type { Order } from '../../../backend';
import { isCustomerOrder } from '../../orders/isCustomerOrder';

/**
 * Parses orders from extracted PDF text with karigar/factory section tracking.
 * Each order inherits the most recently encountered karigar/factory name.
 * 
 * @param pageTexts - Array of pages, each page is an array of lines
 * @param uploadDate - The upload date to assign to all orders
 * @returns Array of parsed Order objects with karigarName set from PDF sections
 */
export function parseOrdersFromPdfText(pageTexts: string[][], uploadDate: Date): Order[] {
  const orders: Order[] = [];
  const uploadTimestamp = BigInt(uploadDate.getTime());
  const createdTimestamp = BigInt(Date.now());
  
  let currentKarigarName = ''; // Track the current karigar/factory section
  
  // Process all pages - karigar name persists across pages
  for (const lines of pageTexts) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Skip common table headers
      if (isTableHeader(trimmedLine)) {
        continue;
      }
      
      // Check if this line is a karigar/factory header
      const karigarMatch = detectKarigarHeader(trimmedLine);
      if (karigarMatch) {
        currentKarigarName = karigarMatch;
        continue;
      }
      
      // Try to parse this line as an order row
      const order = parseOrderLine(trimmedLine, currentKarigarName, uploadTimestamp, createdTimestamp);
      if (order) {
        orders.push(order);
      }
    }
  }
  
  if (orders.length === 0) {
    throw new Error(
      'No orders found in the PDF. Please ensure the PDF contains order data in a tabular format, ' +
      'or use an Excel file (.xlsx) for more reliable parsing.'
    );
  }
  
  return orders;
}

/**
 * Checks if a line is a table header row
 */
function isTableHeader(line: string): boolean {
  const upperLine = line.toUpperCase();
  
  // Common header patterns
  const headerKeywords = [
    'ORDER NO',
    'ORDER TYPE',
    'DESIGN CODE',
    'WEIGHT',
    'SIZE',
    'QTY',
    'QUANTITY',
    'REMARKS',
    'STATUS'
  ];
  
  // If line contains multiple header keywords, it's likely a header row
  const keywordCount = headerKeywords.filter(keyword => upperLine.includes(keyword)).length;
  return keywordCount >= 3;
}

/**
 * Detects if a line is a karigar/factory header and extracts the name.
 * Returns the karigar name if detected, null otherwise.
 */
function detectKarigarHeader(line: string): string | null {
  const upperLine = line.toUpperCase();
  
  // Pattern 1: Explicit keywords - "KARIGAR:" or "KARIGAR NAME:" followed by name
  const pattern1 = /^(?:KARIGAR|FACTORY|MANUFACTURER|VENDOR)(?:\s+NAME)?[\s:]+(.+)$/i;
  const match1 = line.match(pattern1);
  if (match1) {
    return match1[1].trim();
  }
  
  // Pattern 2: "KARIGAR - NAME" or "Factory - NAME"
  const pattern2 = /^(?:KARIGAR|FACTORY|MANUFACTURER|VENDOR)\s*[-–—]\s*(.+)$/i;
  const match2 = line.match(pattern2);
  if (match2) {
    return match2[1].trim();
  }
  
  // Pattern 3: Line contains keyword and a name (no other data)
  if (
    (upperLine.includes('KARIGAR') || 
     upperLine.includes('FACTORY') || 
     upperLine.includes('MANUFACTURER')) &&
    !containsOrderData(line)
  ) {
    // Extract the name part (everything after the keyword)
    const nameMatch = line.match(/(?:KARIGAR|FACTORY|MANUFACTURER|VENDOR)\s+(.+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
  }
  
  // Pattern 4: Heuristic detection for standalone karigar names
  // A line is likely a karigar header if:
  // - It's relatively short (not a long sentence)
  // - Contains very few or no numbers
  // - Doesn't look like order data
  // - Contains name-like text (words, possibly with spaces)
  if (looksLikeKarigarName(line)) {
    return line.trim();
  }
  
  return null;
}

/**
 * Heuristic to detect if a line looks like a karigar name header
 */
function looksLikeKarigarName(line: string): boolean {
  const trimmed = line.trim();
  
  // Too short or too long
  if (trimmed.length < 3 || trimmed.length > 80) {
    return false;
  }
  
  // Contains order data patterns - definitely not a header
  if (containsOrderData(trimmed)) {
    return false;
  }
  
  // Count numeric characters
  const numericChars = (trimmed.match(/\d/g) || []).length;
  const totalChars = trimmed.length;
  const numericRatio = numericChars / totalChars;
  
  // If more than 20% numeric, probably not a name
  if (numericRatio > 0.2) {
    return false;
  }
  
  // Count words (sequences of letters)
  const words = trimmed.match(/[a-zA-Z]+/g) || [];
  
  // Should have at least one word
  if (words.length === 0) {
    return false;
  }
  
  // Check if it looks like a name (mostly letters, possibly with spaces, dots, &, etc.)
  const namePattern = /^[A-Z][A-Za-z\s.&'-]+$/;
  if (namePattern.test(trimmed)) {
    return true;
  }
  
  // If line has 1-4 words and low numeric content, likely a name
  if (words.length >= 1 && words.length <= 4 && numericRatio < 0.1) {
    // Additional check: total word length should be significant portion of line
    const wordChars = words.join('').length;
    if (wordChars / totalChars > 0.6) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a line contains order data (numbers, design codes, etc.)
 * Used to distinguish headers from data rows
 */
function containsOrderData(line: string): boolean {
  // Check for common order data patterns
  // - Multiple numbers (weight, size, qty)
  // - Design code patterns (alphanumeric codes)
  const numberCount = (line.match(/\d+(?:\.\d+)?/g) || []).length;
  
  // If line has 3+ numbers, it's likely order data
  if (numberCount >= 3) {
    return true;
  }
  
  // Check for typical order data structure (multiple tab-separated or space-separated fields)
  const parts = line.split(/\s+/).filter(p => p.trim());
  if (parts.length >= 6) {
    // Check if we have numeric values in expected positions
    let numericFields = 0;
    for (const part of parts) {
      if (/^\d+(\.\d+)?$/.test(part)) {
        numericFields++;
      }
    }
    // If we have 2+ numeric fields in a multi-field line, likely order data
    if (numericFields >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Attempts to parse a line as an order row.
 * Returns an Order object if successful, null otherwise.
 */
function parseOrderLine(
  line: string,
  karigarName: string,
  uploadTimestamp: bigint,
  createdTimestamp: bigint
): Order | null {
  // Split line by whitespace and tabs
  const parts = line.split(/\s+/).filter(p => p.trim());
  
  if (parts.length < 6) {
    // Not enough fields for a valid order
    return null;
  }
  
  try {
    // Common PDF order format:
    // Order No | Order Type | Design Code | Weight | Size | Qty | Remarks (optional)
    // Example: "12345 CO ABC123 10.5 7.5 2 Rush order"
    
    // Try to identify fields by pattern
    let orderNo = '';
    let orderType = '';
    let designCode = '';
    let weight = 0;
    let size = 0;
    let qty = 0;
    let remarks = '';
    
    let idx = 0;
    
    // Field 1: Order No (usually numeric or alphanumeric)
    orderNo = parts[idx++];
    if (!orderNo) return null;
    
    // Field 2: Order Type (usually short text like "CO", "Regular", etc.)
    if (idx < parts.length) {
      orderType = parts[idx++];
    }
    
    // Field 3: Design Code (alphanumeric)
    if (idx < parts.length) {
      designCode = parts[idx++];
    }
    
    // Field 4: Weight (numeric)
    if (idx < parts.length) {
      weight = parseFloat(parts[idx++]);
      if (isNaN(weight)) return null;
    }
    
    // Field 5: Size (numeric)
    if (idx < parts.length) {
      size = parseFloat(parts[idx++]);
      if (isNaN(size)) return null;
    }
    
    // Field 6: Qty (integer)
    if (idx < parts.length) {
      qty = parseInt(parts[idx++], 10);
      if (isNaN(qty) || qty <= 0) return null;
    }
    
    // Remaining parts: Remarks
    if (idx < parts.length) {
      remarks = parts.slice(idx).join(' ');
    }
    
    // Validate required fields
    if (!orderNo || !orderType || !designCode) {
      return null;
    }
    
    // Create order object
    const order: Order = {
      orderNo,
      orderType,
      designCode,
      genericName: '', // Will be filled by backend mapping if design is mapped
      karigarName, // Set from PDF section header
      weight,
      size,
      qty: BigInt(qty),
      remarks,
      status: 'pending',
      isCustomerOrder: isCustomerOrder(orderType),
      uploadDate: uploadTimestamp,
      createdAt: createdTimestamp
    };
    
    return order;
  } catch (error) {
    // Failed to parse this line as an order
    return null;
  }
}

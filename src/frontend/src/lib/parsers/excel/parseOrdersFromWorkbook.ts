import type { Order } from '../../../backend';
import { isCustomerOrder } from '../../orders/isCustomerOrder';

/**
 * Gets the XLSX library from the global window object.
 * This assumes the library has been loaded via readWorkbookFromFile.
 */
function getXLSX(): any {
  if (typeof (window as any).XLSX === 'undefined') {
    throw new Error('Excel parsing library not loaded');
  }
  return (window as any).XLSX;
}

/**
 * Parses orders from a SheetJS workbook object.
 * Expected columns: Order No, Order Type, Design Code, Weight, Size, Qty, Remarks
 * @param workbook - SheetJS workbook object
 * @param uploadDate - The upload date to assign to all orders
 * @returns Array of parsed Order objects
 */
export function parseOrdersFromWorkbook(workbook: any, uploadDate: Date): Order[] {
  const XLSX = getXLSX();

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON with header row
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  if (rawData.length === 0) {
    throw new Error('The Excel sheet is empty. Please upload a file with order data.');
  }
  
  // Normalize header names (case-insensitive, trim spaces)
  const normalizeKey = (key: string): string => key.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Get the first row to check headers
  const firstRow = rawData[0];
  const headers = Object.keys(firstRow).map(normalizeKey);
  
  // Required columns (with flexible naming)
  const requiredColumns = {
    orderNo: ['order_no', 'orderno', 'order_number', 'order'],
    orderType: ['order_type', 'ordertype', 'type'],
    designCode: ['design_code', 'designcode', 'design', 'code'],
    weight: ['weight', 'wt'],
    size: ['size', 'sz'],
    qty: ['qty', 'quantity', 'pieces', 'pcs'],
    remarks: ['remarks', 'remark', 'notes', 'note', 'comments']
  };
  
  // Find matching columns
  const columnMap: Record<string, string> = {};
  
  for (const [field, aliases] of Object.entries(requiredColumns)) {
    const matchedHeader = Object.keys(firstRow).find(key => 
      aliases.includes(normalizeKey(key))
    );
    
    if (!matchedHeader) {
      const aliasesStr = aliases.join(', ');
      throw new Error(
        `Missing required column: ${field}. Expected one of: ${aliasesStr}. ` +
        `Found columns: ${Object.keys(firstRow).join(', ')}`
      );
    }
    
    columnMap[field] = matchedHeader;
  }
  
  // Parse rows into Order objects
  const orders: Order[] = [];
  const uploadTimestamp = BigInt(uploadDate.getTime());
  const createdTimestamp = BigInt(Date.now());
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    try {
      // Extract values using the column map
      const orderNo = String(row[columnMap.orderNo] || '').trim();
      const orderType = String(row[columnMap.orderType] || '').trim();
      const designCode = String(row[columnMap.designCode] || '').trim();
      const remarks = String(row[columnMap.remarks] || '').trim();
      
      // Skip completely empty rows
      if (!orderNo && !orderType && !designCode) {
        continue;
      }
      
      // Validate required fields
      if (!orderNo) {
        throw new Error(`Row ${i + 2}: Order No is required`);
      }
      if (!orderType) {
        throw new Error(`Row ${i + 2}: Order Type is required`);
      }
      if (!designCode) {
        throw new Error(`Row ${i + 2}: Design Code is required`);
      }
      
      // Parse numeric fields
      const weight = parseFloat(String(row[columnMap.weight] || '0'));
      const size = parseFloat(String(row[columnMap.size] || '0'));
      const qty = parseInt(String(row[columnMap.qty] || '0'), 10);
      
      if (isNaN(weight)) {
        throw new Error(`Row ${i + 2}: Invalid weight value`);
      }
      if (isNaN(size)) {
        throw new Error(`Row ${i + 2}: Invalid size value`);
      }
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Row ${i + 2}: Quantity must be a positive number`);
      }
      
      // Create order object
      const order: Order = {
        orderNo,
        orderType,
        designCode,
        genericName: '', // Will be filled by backend mapping
        karigarName: '', // Will be filled by backend mapping
        weight,
        size,
        qty: BigInt(qty),
        remarks,
        status: 'pending',
        isCustomerOrder: isCustomerOrder(orderType),
        uploadDate: uploadTimestamp,
        createdAt: createdTimestamp
      };
      
      orders.push(order);
    } catch (error: any) {
      // Re-throw with row context
      throw new Error(error.message || `Row ${i + 2}: Failed to parse order data`);
    }
  }
  
  if (orders.length === 0) {
    throw new Error('No valid orders found in the Excel file. Please check the data and try again.');
  }
  
  return orders;
}

import type { PersistentOrder } from '../../../backend';

/**
 * Parse orders from a SheetJS workbook with flexible column name matching,
 * numeric field validation, customer order detection, and detailed row-level error messages.
 * Weight and Size are now optional fields - empty/invalid values are treated as null with warnings.
 */
export function parseOrdersFromWorkbook(workbook: any, uploadDate: Date): { orders: PersistentOrder[]; warnings: string[] } {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = (window as any).XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawData.length === 0) {
    throw new Error('Excel file is empty');
  }

  const orders: PersistentOrder[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Flexible column name matching
  const findColumn = (row: any, possibleNames: string[]): string | undefined => {
    for (const name of possibleNames) {
      if (row[name] !== undefined) return name;
    }
    return undefined;
  };

  rawData.forEach((row, index) => {
    try {
      const orderNoCol = findColumn(row, ['Order No', 'OrderNo', 'Order_No', 'order_no', 'Order Number']);
      const orderTypeCol = findColumn(row, ['Order Type', 'OrderType', 'Type', 'order_type']);
      const designCodeCol = findColumn(row, ['Design Code', 'DesignCode', 'Design', 'design_code', 'Code']);
      const genericNameCol = findColumn(row, ['Generic Name', 'GenericName', 'Generic', 'generic_name']);
      const karigarNameCol = findColumn(row, ['Karigar Name', 'KarigarName', 'Karigar', 'karigar_name', 'Artisan']);
      const weightCol = findColumn(row, ['Weight', 'weight', 'Wt', 'wt']);
      const sizeCol = findColumn(row, ['Size', 'size']);
      const qtyCol = findColumn(row, ['Qty', 'qty', 'Quantity', 'quantity']);
      const remarksCol = findColumn(row, ['Remarks', 'remarks', 'Notes', 'notes', 'Comment']);

      if (!orderNoCol || !orderTypeCol || !designCodeCol) {
        errors.push(`Row ${index + 2}: Missing required columns (Order No, Order Type, or Design Code)`);
        return;
      }

      const orderNo = String(row[orderNoCol] || '').trim();
      const orderType = String(row[orderTypeCol] || '').trim();
      const designCode = String(row[designCodeCol] || '').trim();
      const genericName = genericNameCol ? String(row[genericNameCol] || '').trim() : '';
      const karigarId = karigarNameCol ? String(row[karigarNameCol] || '').trim() : '';
      const remarks = remarksCol ? String(row[remarksCol] || '').trim() : '';

      if (!orderNo || !orderType || !designCode) {
        errors.push(`Row ${index + 2}: Empty required fields`);
        return;
      }

      // Parse optional numeric fields (weight, size) - treat empty/invalid as null with warnings
      let weight: number | undefined = undefined;
      if (weightCol) {
        const weightStr = String(row[weightCol] || '').trim();
        if (weightStr !== '') {
          const parsedWeight = parseFloat(weightStr);
          if (!isNaN(parsedWeight) && parsedWeight >= 0) {
            weight = parsedWeight;
          } else {
            warnings.push(`Row ${index + 2}: Invalid weight value (treated as blank)`);
          }
        }
      }

      let size: number | undefined = undefined;
      if (sizeCol) {
        const sizeStr = String(row[sizeCol] || '').trim();
        if (sizeStr !== '') {
          const parsedSize = parseFloat(sizeStr);
          if (!isNaN(parsedSize) && parsedSize >= 0) {
            size = parsedSize;
          } else {
            warnings.push(`Row ${index + 2}: Invalid size value (treated as blank)`);
          }
        }
      }

      // Qty is still required
      const qty = qtyCol ? parseInt(String(row[qtyCol]), 10) : 1;
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${index + 2}: Invalid quantity value`);
        return;
      }

      // Detect customer orders
      const isCustomerOrder = orderType.toUpperCase().includes('CO');

      const uploadTimestamp = BigInt(uploadDate.getTime()) * 1_000_000n;

      orders.push({
        orderNo,
        orderType,
        designCode,
        genericName,
        karigarId,
        weight,
        size,
        qty: BigInt(qty),
        remarks,
        status: 'pending',
        isCustomerOrder,
        uploadDate: uploadTimestamp,
        createdAt: uploadTimestamp,
        lastStatusChange: uploadTimestamp,
      });
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Failed to parse ${errors.length} row(s):\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
  }

  if (orders.length === 0) {
    throw new Error('No valid orders found in Excel file');
  }

  return { orders, warnings };
}

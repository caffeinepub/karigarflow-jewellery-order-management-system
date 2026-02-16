import type { DesignCode, MasterDesignEntry } from '../../../backend';

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
 * Parses master design mappings from a SheetJS workbook object.
 * Expected columns: Design Code, Generic Name, Karigar Name (or Factory)
 * @param workbook - SheetJS workbook object
 * @returns Array of tuples [DesignCode, MasterDesignEntry]
 */
export function parseMasterDesignsFromWorkbook(workbook: any): [DesignCode, MasterDesignEntry][] {
  const XLSX = getXLSX();

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON with header row
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  if (rawData.length === 0) {
    throw new Error('The Excel sheet is empty. Please upload a file with master design data.');
  }
  
  // Normalize header names (case-insensitive, trim spaces, convert separators to underscores)
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .trim()
      // Replace common separators (spaces, hyphens, slashes, dots) with underscores
      .replace(/[\s\-\/\\.]+/g, '_')
      // Collapse multiple underscores into one
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '');
  };
  
  // Get the first row to check headers
  const firstRow = rawData[0];
  const headers = Object.keys(firstRow).map(normalizeKey);
  
  // Required and optional columns (with flexible naming)
  const columnAliases = {
    designCode: ['design_code', 'designcode', 'design', 'code', 'item_code'],
    genericName: ['generic_name', 'genericname', 'generic', 'name', 'item_name'],
    karigarName: [
      'karigar_name', 
      'karigarname', 
      'karigar', 
      'artisan', 
      'craftsman',
      'factory',
      'factory_name',
      'factoryname',
      'karigar_factory',
      'karigarfactory',
      'karigar_factory_name',
      'karigarfactoryname',
      'factory_karigar',
      'factorykarigar',
      'factory_karigar_name',
      'factorykarigarname',
      'manufacturer',
      'manufacturer_name',
      'manufacturername',
      'vendor',
      'vendor_name',
      'vendorname'
    ]
  };
  
  // Find matching columns
  const columnMap: Record<string, string | null> = {};
  
  // Design Code is required
  const designCodeHeader = Object.keys(firstRow).find(key => 
    columnAliases.designCode.includes(normalizeKey(key))
  );
  
  if (!designCodeHeader) {
    const aliasesStr = columnAliases.designCode.join(', ');
    throw new Error(
      `Missing required column: Design Code. Expected one of: ${aliasesStr}. ` +
      `Found columns: ${Object.keys(firstRow).join(', ')}`
    );
  }
  
  columnMap.designCode = designCodeHeader;
  
  // Generic Name and Karigar Name are optional but recommended
  columnMap.genericName = Object.keys(firstRow).find(key => 
    columnAliases.genericName.includes(normalizeKey(key))
  ) || null;
  
  columnMap.karigarName = Object.keys(firstRow).find(key => 
    columnAliases.karigarName.includes(normalizeKey(key))
  ) || null;
  
  // Parse rows into master design entries
  const entries: [DesignCode, MasterDesignEntry][] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    try {
      // Extract design code
      const designCode = String(row[columnMap.designCode!] || '').trim();
      
      // Skip completely empty rows
      if (!designCode) {
        continue;
      }
      
      // Extract optional fields
      const genericName = columnMap.genericName 
        ? String(row[columnMap.genericName] || '').trim() 
        : '';
      
      const karigarName = columnMap.karigarName 
        ? String(row[columnMap.karigarName] || '').trim() 
        : '';
      
      // Create master design entry
      const entry: MasterDesignEntry = {
        genericName: genericName || designCode, // Default to design code if no generic name
        karigarName: karigarName || 'Unassigned', // Default to 'Unassigned' if no karigar name
        isActive: true
      };
      
      entries.push([designCode, entry]);
    } catch (error: any) {
      // Re-throw with row context
      throw new Error(error.message || `Row ${i + 2}: Failed to parse master design data`);
    }
  }
  
  if (entries.length === 0) {
    throw new Error('No valid master design entries found in the Excel file. Please check the data and try again.');
  }
  
  return entries;
}

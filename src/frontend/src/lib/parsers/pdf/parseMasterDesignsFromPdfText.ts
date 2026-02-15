import type { DesignCode, MasterDesignEntry } from '../../../backend';

/**
 * Parse master designs from extracted PDF text
 * Expects text to contain rows with: Design Code, Generic Name, Karigar Name
 */
export function parseMasterDesignsFromPdfText(pageTexts: string[]): [DesignCode, MasterDesignEntry][] {
  const designs: [DesignCode, MasterDesignEntry][] = [];
  const seenCodes = new Set<string>();
  
  // Combine all pages
  const fullText = pageTexts.join('\n');
  
  // Split into lines
  const lines = fullText.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error(
      'No text content found in PDF. The file may contain only images or be empty. ' +
      'Please use an Excel file (.xlsx) for more reliable parsing.'
    );
  }
  
  // Try to detect header row and data rows
  // Common patterns: "Design Code", "Generic Name", "Karigar Name" or similar
  let dataStartIndex = 0;
  
  // Look for header row (case-insensitive)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('design') && (line.includes('generic') || line.includes('karigar'))) {
      dataStartIndex = i + 1;
      break;
    }
  }
  
  // Parse data rows
  // Try multiple parsing strategies
  let parsedCount = 0;
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty or very short lines
    if (line.length < 3) continue;
    
    // Try to parse as space/tab separated values
    const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      const [designCode, genericName, karigarName] = parts;
      
      // Validate design code (should not be empty and not be a header)
      if (designCode && 
          !designCode.toLowerCase().includes('design') &&
          !designCode.toLowerCase().includes('code') &&
          !seenCodes.has(designCode)) {
        
        designs.push([
          designCode,
          {
            genericName: genericName || '',
            karigarName: karigarName || '',
            isActive: true,
          }
        ]);
        
        seenCodes.add(designCode);
        parsedCount++;
      }
    } else if (parts.length === 2) {
      // Try with just design code and generic name
      const [designCode, genericName] = parts;
      
      if (designCode && 
          !designCode.toLowerCase().includes('design') &&
          !designCode.toLowerCase().includes('code') &&
          !seenCodes.has(designCode)) {
        
        designs.push([
          designCode,
          {
            genericName: genericName || '',
            karigarName: '',
            isActive: true,
          }
        ]);
        
        seenCodes.add(designCode);
        parsedCount++;
      }
    }
  }
  
  if (parsedCount === 0) {
    throw new Error(
      'Could not parse any master design entries from the PDF. ' +
      'The file format may not be supported or the text layout is not recognized. ' +
      'Please use an Excel file (.xlsx) with columns: Design Code, Generic Name, Karigar Name.'
    );
  }
  
  console.log(`[PDF Parser] Successfully parsed ${parsedCount} master design entries`);
  
  return designs;
}

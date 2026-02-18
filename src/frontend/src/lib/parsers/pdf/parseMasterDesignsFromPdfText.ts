import type { MasterDesignEntry } from '../../../backend';

/**
 * Parses master design mappings from extracted PDF text.
 * Expected format: Table with columns Design Code, Generic Name, Karigar Name
 * @param pageTexts - Array of pages, each containing an array of text lines
 * @returns Array of tuples [designCode, MasterDesignEntry]
 */
export function parseMasterDesignsFromPdfText(pageTexts: string[][]): [string, MasterDesignEntry][] {
  const entries: [string, MasterDesignEntry][] = [];
  
  // Flatten all pages into a single array of lines
  const allLines = pageTexts.flat();
  
  // Find header row (case-insensitive)
  let headerIndex = -1;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].toLowerCase();
    if (line.includes('design') && (line.includes('code') || line.includes('generic') || line.includes('karigar'))) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error('Could not find header row with Design Code, Generic Name, and Karigar Name columns');
  }
  
  // Parse data rows (skip header)
  for (let i = headerIndex + 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Try to parse the line as a table row
    const parsed = parseDesignRow(line);
    if (parsed) {
      entries.push(parsed);
    }
  }
  
  if (entries.length === 0) {
    throw new Error('No valid master design entries found in PDF. Please check the format.');
  }
  
  return entries;
}

/**
 * Attempts to parse a single line as a design row.
 * Expected format: "DESIGN_CODE GENERIC_NAME KARIGAR_NAME"
 * Tokens are separated by whitespace.
 */
function parseDesignRow(line: string): [string, MasterDesignEntry] | null {
  const tokens = line.split(/\s+/).filter(t => t.length > 0);
  
  // Need at least 3 tokens: design code, generic name, karigar name
  if (tokens.length < 3) {
    return null;
  }
  
  // First token is design code
  const designCode = tokens[0];
  
  // Last token is karigar name
  const karigarName = tokens[tokens.length - 1];
  
  // Middle tokens are generic name
  const genericName = tokens.slice(1, -1).join(' ');
  
  // Create karigarId from karigarName
  const karigarId = karigarName ? karigarName.trim().replace(/\s+/g, '_').toLowerCase() : 'unassigned';
  
  const entry: MasterDesignEntry = {
    genericName: genericName || designCode,
    karigarId: karigarId,
    isActive: true
  };
  
  return [designCode, entry];
}

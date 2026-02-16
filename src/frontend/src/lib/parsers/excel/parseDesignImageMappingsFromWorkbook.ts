import { readWorkbookFromFile } from './readWorkbookFromFile';
import { ExternalBlob } from '../../../backend';

interface ParsedRow {
  designCode: string;
  genericName: string;
  imageUrl: string;
  isValid: boolean;
  error?: string;
}

export async function parseDesignImageMappingsFromWorkbook(file: File): Promise<ParsedRow[]> {
  const workbook = await readWorkbookFromFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const XLSX = (window as any).XLSX;
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    throw new Error('Excel file must contain at least a header row and one data row');
  }

  const headerRow = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
  
  // Find column indices
  const designCodeIdx = headerRow.findIndex(h => 
    h.includes('design') && h.includes('code')
  );
  const genericNameIdx = headerRow.findIndex(h => 
    h.includes('generic') || h.includes('name')
  );
  const imageUrlIdx = headerRow.findIndex(h => 
    h.includes('image') || h.includes('url') || h.includes('link')
  );

  if (designCodeIdx === -1 || genericNameIdx === -1 || imageUrlIdx === -1) {
    throw new Error('Excel file must contain columns: Design Code, Generic Name, and Image URL');
  }

  const parsedRows: ParsedRow[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    const designCode = String(row[designCodeIdx] || '').trim();
    const genericName = String(row[genericNameIdx] || '').trim();
    const imageUrl = String(row[imageUrlIdx] || '').trim();

    let isValid = true;
    let error: string | undefined;

    if (!designCode) {
      isValid = false;
      error = 'Missing design code';
    } else if (!genericName) {
      isValid = false;
      error = 'Missing generic name';
    } else if (!imageUrl) {
      isValid = false;
      error = 'Missing image URL';
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      isValid = false;
      error = 'Image URL must start with http:// or https://';
    }

    parsedRows.push({
      designCode,
      genericName,
      imageUrl,
      isValid,
      error,
    });
  }

  return parsedRows;
}

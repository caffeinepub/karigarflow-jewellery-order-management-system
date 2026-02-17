import { readWorkbookFromFile } from './readWorkbookFromFile';
import { extractImagesFromXlsx } from './extractImagesFromXlsx';

interface ParsedRow {
  slNo: string;
  designCode: string;
  imageBytes: Uint8Array;
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
  
  // Validate exactly 3 columns
  if (headerRow.length !== 3) {
    throw new Error(`Excel file must contain exactly 3 columns (Sl no, Design code, Image). Found ${headerRow.length} columns.`);
  }
  
  // Find column indices - require exactly 3 columns
  const slNoIdx = headerRow.findIndex(h => 
    h.includes('sl') || h.includes('no') || h.includes('serial') || h === 'slno' || h === 'sno'
  );
  const designCodeIdx = headerRow.findIndex(h => 
    (h.includes('design') && h.includes('code')) || h === 'designcode' || h === 'design'
  );
  const imageIdx = headerRow.findIndex(h => 
    h.includes('image') || h.includes('picture') || h.includes('photo') || h.includes('img')
  );

  if (slNoIdx === -1) {
    throw new Error('Could not find "Sl no" column. Please ensure the first column is named "Sl no" or similar.');
  }
  if (designCodeIdx === -1) {
    throw new Error('Could not find "Design code" column. Please ensure the second column is named "Design code" or similar.');
  }
  if (imageIdx === -1) {
    throw new Error('Could not find "Image" column. Please ensure the third column is named "Image" or similar.');
  }

  // Extract images from the Excel file
  const images = await extractImagesFromXlsx(file);

  if (images.length === 0) {
    throw new Error('No embedded images found in the Excel file. Please ensure images are embedded (not linked via URLs).');
  }

  const parsedRows: ParsedRow[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    const slNo = String(row[slNoIdx] || '').trim();
    const designCode = String(row[designCodeIdx] || '').trim();

    let isValid = true;
    let error: string | undefined;
    let imageBytes: Uint8Array = new Uint8Array(0);

    if (!slNo) {
      isValid = false;
      error = 'Missing Sl no';
    } else if (!designCode) {
      isValid = false;
      error = 'Missing design code';
    } else {
      // Try to find an image for this row
      // Images in Excel are typically associated with rows by their position
      const imageForRow = images.find(img => img.row === i);
      
      if (!imageForRow) {
        isValid = false;
        error = 'No embedded image found for this row';
      } else {
        imageBytes = imageForRow.data;
      }
    }

    parsedRows.push({
      slNo,
      designCode,
      imageBytes,
      isValid,
      error,
    });
  }

  return parsedRows;
}

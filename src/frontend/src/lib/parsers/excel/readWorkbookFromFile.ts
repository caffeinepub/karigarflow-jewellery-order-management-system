/**
 * Dynamically loads the SheetJS library from CDN if not already loaded.
 * @returns Promise that resolves when the library is ready
 */
async function ensureXLSXLoaded(): Promise<any> {
  // Check if XLSX is already available
  if (typeof (window as any).XLSX !== 'undefined') {
    return (window as any).XLSX;
  }

  // Load the library from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => {
      if (typeof (window as any).XLSX !== 'undefined') {
        resolve((window as any).XLSX);
      } else {
        reject(new Error('Failed to load Excel parsing library'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Excel parsing library from CDN'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Reads an Excel file (.xlsx/.xls) and returns a SheetJS workbook object.
 * @param file - The uploaded Excel file
 * @returns A SheetJS workbook object
 * @throws Error if the file cannot be read or is invalid
 */
export async function readWorkbookFromFile(file: File): Promise<any> {
  try {
    // Ensure XLSX library is loaded
    const XLSX = await ensureXLSXLoaded();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse the workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Validate that we have at least one sheet
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The Excel file contains no sheets. Please upload a valid workbook.');
    }
    
    return workbook;
  } catch (error: any) {
    console.error('Error reading Excel workbook:', error);
    
    // Provide clear error messages
    if (error.message?.includes('Unsupported file')) {
      throw new Error('The file format is not supported. Please upload a valid .xlsx or .xls file.');
    }
    
    if (error.message?.includes('no sheets')) {
      throw error; // Re-throw our custom message
    }

    if (error.message?.includes('load Excel parsing library')) {
      throw error; // Re-throw library loading errors
    }
    
    throw new Error(
      error.message || 
      'Failed to read Excel file. Please ensure the file is a valid Excel workbook (.xlsx or .xls).'
    );
  }
}

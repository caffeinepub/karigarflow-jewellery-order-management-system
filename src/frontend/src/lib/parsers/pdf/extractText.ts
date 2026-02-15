// PDF text extraction using pdfjs-dist from CDN
// This implementation loads the library dynamically and extracts text from all pages
// with improved line-by-line structure preservation for tabular parsing

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

let pdfjsLibLoaded = false;

/**
 * Load pdfjs-dist library from CDN
 */
async function loadPdfJsLib(): Promise<any> {
  if (window.pdfjsLib && pdfjsLibLoaded) {
    return window.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    // Load the main library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
    script.type = 'module';
    
    script.onload = () => {
      // Wait a bit for the library to initialize
      setTimeout(() => {
        if (window.pdfjsLib) {
          // Set worker source
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
          pdfjsLibLoaded = true;
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js library failed to load properly'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js library from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Extract text from a PDF file with improved line structure preservation
 * Returns an array of page texts, where each page text is an array of lines
 */
export async function extractTextFromPDF(file: File): Promise<string[][]> {
  try {
    // Load the library
    const pdfjsLib = await loadPdfJsLib();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;
    
    const pageTexts: string[][] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text items by Y position to form lines
      const lineMap = new Map<number, any[]>();
      
      textContent.items.forEach((item: any) => {
        if (!item.str || item.str.trim() === '') return;
        
        // Round Y position to group items on the same line
        const y = Math.round(item.transform[5]);
        
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item);
      });
      
      // Sort lines by Y position (top to bottom)
      const sortedYPositions = Array.from(lineMap.keys()).sort((a, b) => b - a);
      
      // Build lines by sorting items within each line by X position
      const lines: string[] = [];
      sortedYPositions.forEach(y => {
        const items = lineMap.get(y)!;
        // Sort items by X position (left to right)
        items.sort((a, b) => a.transform[4] - b.transform[4]);
        
        // Join items with space
        const lineText = items.map(item => item.str).join(' ').trim();
        if (lineText) {
          lines.push(lineText);
        }
      });
      
      pageTexts.push(lines);
    }
    
    return pageTexts;
  } catch (error: any) {
    console.error('PDF text extraction error:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('Invalid PDF')) {
      throw new Error(
        'The uploaded file appears to be corrupted or is not a valid PDF. ' +
        'Please try another file or use an Excel file (.xlsx) instead.'
      );
    }
    
    if (error.message?.includes('password')) {
      throw new Error(
        'This PDF is password-protected and cannot be parsed. ' +
        'Please use an unprotected PDF or an Excel file (.xlsx) instead.'
      );
    }
    
    throw new Error(
      'Unable to extract text from this PDF. The file may be scanned images or use an unsupported format. ' +
      'For best results, please use an Excel file (.xlsx) instead.'
    );
  }
}

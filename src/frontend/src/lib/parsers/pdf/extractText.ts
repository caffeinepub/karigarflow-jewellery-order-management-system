// PDF text extraction using pdfjs-dist from CDN
// This implementation loads the library dynamically and extracts text from all pages

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
 * Extract text from a PDF file
 * Returns an array of strings, one per page
 */
export async function extractTextFromPDF(file: File): Promise<string[]> {
  try {
    // Load the library
    const pdfjsLib = await loadPdfJsLib();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;
    
    const pageTexts: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Concatenate all text items with spaces
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      pageTexts.push(pageText);
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

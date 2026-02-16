/**
 * Extracts embedded images from an Excel (.xlsx) file.
 * 
 * Note: This is a simplified implementation that works with the XLSX library's
 * internal structure. For production use with complex Excel files, consider
 * using a library like ExcelJS which has better image extraction support.
 */

interface ExtractedImage {
  row: number;
  col: number;
  data: Uint8Array;
  extension: string;
}

export async function extractImagesFromXlsx(file: File): Promise<ExtractedImage[]> {
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Use JSZip to extract the Excel file structure
    // Excel files are ZIP archives
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      // Dynamically load JSZip from CDN
      await loadJSZip();
    }
    
    const zip = await (window as any).JSZip.loadAsync(arrayBuffer);
    
    const images: ExtractedImage[] = [];
    
    // Images in Excel are stored in xl/media/ folder
    const mediaFolder = zip.folder('xl/media');
    if (!mediaFolder) {
      console.warn('No media folder found in Excel file');
      return images;
    }
    
    // Get all files in the media folder
    const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('xl/media/') && !zip.files[name].dir);
    
    if (mediaFiles.length === 0) {
      console.warn('No image files found in xl/media/ folder');
      return images;
    }
    
    // Extract each image
    for (let i = 0; i < mediaFiles.length; i++) {
      const fileName = mediaFiles[i];
      const file = zip.files[fileName];
      
      if (!file.dir) {
        const data = await file.async('uint8array');
        const extension = fileName.split('.').pop() || 'png';
        
        // Associate image with row (simplified: assume images are in order)
        // In a real implementation, you'd parse xl/drawings/drawing1.xml to get exact positions
        images.push({
          row: i + 1, // Start from row 1 (after header)
          col: 0,
          data,
          extension,
        });
      }
    }
    
    return images;
  } catch (error) {
    console.error('Failed to extract images from Excel:', error);
    throw new Error('Failed to extract images from Excel file. Please ensure images are embedded in the file (not URLs).');
  }
}

async function loadJSZip(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JSZip library'));
    document.head.appendChild(script);
  });
}

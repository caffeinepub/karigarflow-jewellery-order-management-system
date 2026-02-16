import type { MasterDesignEntry } from '../../backend';
import { parseMasterDesignsFromWorkbook } from './excel/parseMasterDesignsFromWorkbook';
import { readWorkbookFromFile } from './excel/readWorkbookFromFile';
import { extractTextFromPDF } from './pdf/extractText';
import { parseMasterDesignsFromPdfText } from './pdf/parseMasterDesignsFromPdfText';

export async function parseMasterDesignFile(file: File): Promise<[string, MasterDesignEntry][]> {
  const fileType = file.name.toLowerCase();
  
  if (fileType.endsWith('.pdf')) {
    return parsePDFMasterDesigns(file);
  } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
    return parseExcelMasterDesigns(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Excel file.');
  }
}

async function parsePDFMasterDesigns(file: File): Promise<[string, MasterDesignEntry][]> {
  try {
    console.log('[PDF Parser] Starting PDF text extraction...');
    const pageTexts = await extractTextFromPDF(file);
    console.log(`[PDF Parser] Extracted text from ${pageTexts.length} pages`);
    
    const designs = parseMasterDesignsFromPdfText(pageTexts);
    console.log(`[PDF Parser] Parsed ${designs.length} master designs`);
    
    return designs;
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    
    // Return user-friendly error message
    throw new Error(
      error.message || 
      'Failed to parse PDF file. Please ensure the PDF contains a table with Design Code, Generic Name, and Karigar Name columns, or use an Excel file (.xlsx) for more reliable parsing.'
    );
  }
}

async function parseExcelMasterDesigns(file: File): Promise<[string, MasterDesignEntry][]> {
  try {
    // Read the workbook from the file
    const workbook = await readWorkbookFromFile(file);
    
    // Parse master designs from the workbook
    return parseMasterDesignsFromWorkbook(workbook);
  } catch (error: any) {
    console.error('Excel parsing error:', error);
    throw new Error(
      error.message || 
      'Failed to parse Excel file. Please ensure the file is a valid Excel workbook with proper column headers.'
    );
  }
}

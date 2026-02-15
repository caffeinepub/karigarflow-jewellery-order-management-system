import type { Order } from '../../backend';
import { parseOrdersFromWorkbook } from './excel/parseOrdersFromWorkbook';
import { readWorkbookFromFile } from './excel/readWorkbookFromFile';
import { extractTextFromPDF } from './pdf/extractText';
import { parseOrdersFromPdfText } from './pdf/parseOrdersFromPdfText';

export async function parseOrderFile(file: File, uploadDate: Date): Promise<Order[]> {
  const fileType = file.name.toLowerCase();
  
  if (fileType.endsWith('.pdf')) {
    return parsePDFOrders(file, uploadDate);
  } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
    return parseExcelOrders(file, uploadDate);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Excel file.');
  }
}

async function parsePDFOrders(file: File, uploadDate: Date): Promise<Order[]> {
  try {
    const pageTexts = await extractTextFromPDF(file);
    return parseOrdersFromPdfText(pageTexts, uploadDate);
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    throw new Error(
      error.message || 
      'Failed to parse PDF file. Please ensure the PDF contains order data in a readable format, or use an Excel file (.xlsx) for more reliable parsing.'
    );
  }
}

async function parseExcelOrders(file: File, uploadDate: Date): Promise<Order[]> {
  try {
    // Read the workbook from the file
    const workbook = await readWorkbookFromFile(file);
    
    // Parse orders from the workbook
    return parseOrdersFromWorkbook(workbook, uploadDate);
  } catch (error: any) {
    console.error('Excel parsing error:', error);
    throw new Error(
      error.message || 
      'Failed to parse Excel file. Please ensure the file is a valid Excel workbook with proper column headers.'
    );
  }
}

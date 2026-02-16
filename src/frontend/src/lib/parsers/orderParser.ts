import type { PersistentOrder } from '../../backend';
import { extractTextFromPDF } from './pdf/extractText';
import { parseOrdersFromPdfText } from './pdf/parseOrdersFromPdfText';
import { parseOrdersFromWorkbook } from './excel/parseOrdersFromWorkbook';
import { readWorkbookFromFile } from './excel/readWorkbookFromFile';

/**
 * Main order file parser that routes to Excel or PDF parsers with proper error handling
 * and user-friendly messages for both file types.
 */
export async function parseOrderFile(file: File, uploadDate: Date): Promise<PersistentOrder[]> {
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.pdf')) {
      // PDF parsing - extractTextFromPDF returns string[][] (pages with lines)
      // Flatten to single string for parsing
      const pageTexts = await extractTextFromPDF(file);
      const text = pageTexts.map(lines => lines.join('\n')).join('\n');
      return parseOrdersFromPdfText(text, uploadDate);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel parsing
      const workbook = await readWorkbookFromFile(file);
      return parseOrdersFromWorkbook(workbook, uploadDate);
    } else {
      throw new Error('Unsupported file format. Please upload a PDF or Excel file (.pdf, .xlsx, .xls)');
    }
  } catch (error) {
    console.error('Parse error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to load')) {
        throw new Error(`Failed to load ${fileName.endsWith('.pdf') ? 'PDF' : 'Excel'} file. The file may be corrupted or in an unsupported format.`);
      }
      throw error;
    }
    
    throw new Error(`Failed to parse ${file.name}. Please check the file format and try again.`);
  }
}

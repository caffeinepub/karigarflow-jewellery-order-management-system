import type { Order } from '../../../backend';

export function parseOrdersFromPdfText(pageTexts: string[], uploadDate: Date): Order[] {
  throw new Error('PDF parsing is not yet implemented. Please use Excel files (.xlsx) for order uploads.');
}

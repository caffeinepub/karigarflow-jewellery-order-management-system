/**
 * Parse Code 128 barcode data to extract design code and order number.
 * Expected format: "DESIGNCODE ORDERNUMBER" (e.g., "CHIMN40103 1308")
 */
export function parseBarcodeData(scannedText: string): { designCode: string; orderNumber: string } | null {
  if (!scannedText || typeof scannedText !== 'string') {
    return null;
  }

  // Trim and split by whitespace
  const trimmed = scannedText.trim();
  const tokens = trimmed.split(/\s+/);

  // Expect at least 2 tokens: design code and order number
  if (tokens.length < 2) {
    return null;
  }

  const designCode = tokens[0];
  const orderNumber = tokens[1];

  // Basic validation
  if (!designCode || !orderNumber) {
    return null;
  }

  return { designCode, orderNumber };
}

/**
 * Generate a deterministic PO code for a karigar name.
 * Format: First 3 letters uppercase + "01"
 * Examples: "Momin" -> "MOM01", "Ali" -> "ALI01", "Unassigned" -> "UNA01"
 */
export function generateKarigarPOCode(karigarName: string): string {
  const trimmed = karigarName.trim();
  
  if (trimmed === '' || trimmed.toLowerCase() === 'unassigned') {
    return 'UNA01';
  }
  
  // Extract first 3 letters (or pad with 'X' if shorter)
  const prefix = trimmed
    .replace(/[^a-zA-Z]/g, '') // Remove non-letters
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, 'X');
  
  return `${prefix}01`;
}

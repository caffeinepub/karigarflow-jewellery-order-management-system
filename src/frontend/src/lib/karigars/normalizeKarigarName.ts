/**
 * Normalizes a karigar name for consistent comparison:
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces into single space
 * - Converts to lowercase
 */
export function normalizeKarigarName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

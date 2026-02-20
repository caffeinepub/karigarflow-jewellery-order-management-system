/**
 * Normalize status strings for consistent comparison.
 * Trims whitespace, converts to lowercase, and collapses repeated spaces.
 */
export function normalizeStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

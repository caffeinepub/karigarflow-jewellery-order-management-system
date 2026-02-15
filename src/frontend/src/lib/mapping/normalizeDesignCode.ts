/**
 * Normalize design code by trimming leading/trailing whitespace
 * and collapsing repeated internal whitespace to a single space.
 * This ensures consistent matching regardless of formatting differences.
 */
export function normalizeDesignCode(designCode: string): string {
  return designCode
    .trim()
    .replace(/\s+/g, ' ');
}

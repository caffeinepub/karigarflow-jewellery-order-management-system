/**
 * Shared formatting helpers for optional numeric fields (weight, size).
 * Returns empty string for null/undefined/NaN, otherwise formats with fixed decimals.
 */

export function formatOptionalNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return value.toFixed(decimals);
}

export function formatOptionalNumberForExport(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return value.toFixed(decimals);
}

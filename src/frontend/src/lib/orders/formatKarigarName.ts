/**
 * Format karigar name for display.
 * Returns "Unassigned" for empty/whitespace-only values,
 * otherwise returns the trimmed value.
 */
export function formatKarigarName(karigarName: string): string {
  const trimmed = karigarName?.trim() || '';
  return trimmed === '' ? 'Unassigned' : trimmed;
}

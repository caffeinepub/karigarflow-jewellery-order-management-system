import { normalizeStatus } from './normalizeStatus';

/**
 * Maps normalized status strings to Tailwind CSS background color classes.
 * Returns appropriate color classes for different order statuses.
 */
export function getStatusRowColor(status: string): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'delivered':
      return 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50';
    case 'returned from hallmark':
    case 'returned_from_hallmark':
      return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50';
    case 'given to hallmark':
    case 'given_to_hallmark':
      return 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50';
    case 'submitted in hallmark':
    case 'submitted_in_hallmark':
      return 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50';
    case 'pending':
      return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50';
    case 'cancel':
    case 'cancelled':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    default:
      return 'bg-card hover:bg-muted/50';
  }
}

/**
 * Constants defining all valid order status strings used throughout the application.
 * Ensures consistency between backend data and frontend filters/actions.
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  GIVEN_TO_HALLMARK: 'given_to_hallmark',
  RETURNED_FROM_HALLMARK: 'returned_from_hallmark',
  SUBMITTED_IN_HALLMARK: 'submitted_in_hallmark',
  CANCEL: 'cancel',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

/**
 * All available status options for dropdowns and filters
 */
export const ALL_STATUS_OPTIONS: string[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.GIVEN_TO_HALLMARK,
  ORDER_STATUS.RETURNED_FROM_HALLMARK,
  ORDER_STATUS.SUBMITTED_IN_HALLMARK,
  ORDER_STATUS.CANCEL,
];

/**
 * Display-friendly status labels
 */
export function getStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

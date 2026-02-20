export const STATUS_PENDING = 'pending';
export const STATUS_DELIVERED = 'delivered';
export const STATUS_GIVEN_TO_HALLMARK = 'given_to_hallmark';
export const STATUS_RETURNED_FROM_HALLMARK = 'returned_from_hallmark';
export const STATUS_BILLED = 'billed';

export const ORDER_STATUS = {
  PENDING: STATUS_PENDING,
  DELIVERED: STATUS_DELIVERED,
  GIVEN_TO_HALLMARK: STATUS_GIVEN_TO_HALLMARK,
  RETURNED_FROM_HALLMARK: STATUS_RETURNED_FROM_HALLMARK,
  BILLED: STATUS_BILLED,
} as const;

export function getStatusLabel(status: string): string {
  const normalized = status.toLowerCase().trim();
  switch (normalized) {
    case STATUS_PENDING:
      return 'Pending';
    case STATUS_DELIVERED:
      return 'Delivered';
    case STATUS_GIVEN_TO_HALLMARK:
      return 'Given to Hallmark';
    case STATUS_RETURNED_FROM_HALLMARK:
      return 'Returned from Hallmark';
    case STATUS_BILLED:
      return 'Billed';
    default:
      return status;
  }
}

export const STATUS_OPTIONS = [
  { value: STATUS_PENDING, label: 'Pending' },
  { value: STATUS_DELIVERED, label: 'Delivered' },
  { value: STATUS_GIVEN_TO_HALLMARK, label: 'Given to Hallmark' },
  { value: STATUS_RETURNED_FROM_HALLMARK, label: 'Returned from Hallmark' },
  { value: STATUS_BILLED, label: 'Billed' },
];

import { normalizeStatus } from './normalizeStatus';
import { ORDER_STATUS } from './statusConstants';

export function getStatusRowColor(status: string): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case normalizeStatus(ORDER_STATUS.PENDING):
      return 'bg-blue-50 hover:bg-blue-100';
    case normalizeStatus(ORDER_STATUS.DELIVERED):
      return 'bg-green-50 hover:bg-green-100';
    case normalizeStatus(ORDER_STATUS.GIVEN_TO_HALLMARK):
      return 'bg-purple-50 hover:bg-purple-100';
    case normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK):
      return 'bg-yellow-50 hover:bg-yellow-100';
    case normalizeStatus(ORDER_STATUS.BILLED):
      return 'bg-gray-50 hover:bg-gray-100';
    default:
      return 'bg-background hover:bg-muted';
  }
}

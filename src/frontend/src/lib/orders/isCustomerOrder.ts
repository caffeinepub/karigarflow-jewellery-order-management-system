export function isCustomerOrder(orderType: string): boolean {
  return orderType.toLowerCase().includes('co');
}

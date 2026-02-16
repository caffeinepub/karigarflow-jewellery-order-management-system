# Specification

## Summary
**Goal:** Fix hallmark bulk status updates and ensure Staff users can load and manage orders in the staff portal.

**Planned changes:**
- Add backend support for bulk order status updates so Admin/Staff “Mark as Hallmark” updates selected order lines to status `given_to_hallmark`.
- Enforce backend authorization so only Admin/Staff can bulk-update order statuses, with clear errors for unauthorized callers.
- Adjust backend order-fetch authorization so Staff users can successfully call `getOrders()` after profile creation (without being blocked by approval), while keeping Karigar users subject to approval.
- Update frontend hallmark action flow to refresh/reload orders after a successful bulk update, moving updated items out of “Total Orders” and into the “Hallmark” list; show an error toast and keep selection if the update fails.

**User-visible outcome:** Admin and Staff can mark selected orders as “Hallmark” successfully, see those orders move to the Hallmark tab, and Staff users can load orders in the Staff Dashboard without the “Failed to load orders” state (when backend is online and orders exist).

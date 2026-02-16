# Specification

## Summary
**Goal:** Ensure only Karigar users can mark orders as delivered, remove Delivered actions from Admin/Staff UIs, add a bulk “given_to_hallmark” action in Admin Delivered tab, and apply color styling to Admin dashboard cards and tab indicator.

**Planned changes:**
- Backend: enforce authorization so only users with role #Karigar can set an order’s status to `"delivered"`; reject Admin/Staff attempts (including any backend/bulk methods), while keeping existing Admin/Staff bulk updates for other statuses working.
- Frontend (Admin/Staff): remove or disable any UI controls that allow marking orders as `"delivered"`; if any control must remain visible, keep it disabled with an English explanation and no backend call.
- Frontend (Admin): in Dashboard → Delivered tab, add row selection (checkboxes) and a bulk action to update selected delivered orders to `"given_to_hallmark"` using the existing bulk update flow; keep existing filters and show success/error toasts.
- Frontend (Admin): apply distinct accent colors to the four metric cards (“Orders in View”, “Customer Orders”, “Active Karigars”, “Total Weight”) and add colored active-tab indicator/slider styling for the main Admin dashboard tabs, via page-level styling (no edits to Shadcn UI source files).

**User-visible outcome:** Karigar portal users can mark their orders as delivered, while Admin/Staff cannot; Admins can bulk move orders from Delivered to Hallmark from the Delivered tab; Admin dashboard cards and tab indicator have clearer color styling.

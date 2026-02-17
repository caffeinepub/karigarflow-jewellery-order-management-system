# Specification

## Summary
**Goal:** Let admins/staff manage a reusable Karigar directory and select Karigars for Master Design mappings so orders reflect updated assignments.

**Planned changes:**
- Add backend persistence and authenticated APIs to create and list Karigar names.
- Update backend master design editing so changing a mapping’s karigarName reassigns existing stored orders with the same designCode to the latest karigarName.
- Add an “Add Karigar” action on the Admin Portal Master Designs page to save a new Karigar name and refresh the available list.
- Replace the free-text Karigar Name field in the Master Design add/edit dialog with a selectable list populated from saved Karigars (with proper pre-select/empty state behavior).
- Add React Query hooks to fetch the Karigar list and add Karigars, including cache invalidation and basic loading/error handling in the UI.
- If state schema changes, implement a safe upgrade migration to initialize Karigar storage without affecting existing orders/master designs.

**User-visible outcome:** Admins/staff can add Karigar names in the Master Designs area, select from that list when adding/editing master design mappings, and existing orders for a design code will reflect the updated Karigar assignment after changes.

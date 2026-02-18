# Specification

## Summary
**Goal:** Resolve remaining UI overlap issues across the app, including the sidebar/mobile Sheet, calendar date-picker popovers, and Master Designs dialogs/menus.

**Planned changes:**
- Adjust global layout/sticky header + sidebar/mobile left Sheet behavior so navigation never obscures or renders content underneath across routes and viewport sizes, while keeping overflow-x controlled (no horizontal scroll).
- Update date filter calendar popovers so they render above surrounding UI without clipping, automatically close the other calendar when one opens, and close after a date is selected.
- Fix /admin/master-designs responsive layout and overlays so the “Total Karigar List” dialog fits within the viewport (internal scroll if needed), header/filter/search rows wrap without collisions on narrow screens, and row-level Actions menus/dialogs render above the table without being clipped.

**User-visible outcome:** Pages no longer have content hidden behind the sidebar/header, date-picker calendars don’t overlap or stay open together, and Master Designs dialogs/menus open cleanly and remain fully usable on all screen sizes.

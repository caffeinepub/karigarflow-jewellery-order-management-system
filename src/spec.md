# Specification

## Summary
**Goal:** Fix the “Loading profile…” hang after top-tab navigation, add Master Design PDF import parsing for design-to-(generic/karigar) mappings, and ensure orders are consistently assigned and displayed with the correct karigar/generic names when mappings exist.

**Planned changes:**
- Fix the post-navigation bootstrap/loading loop so switching tabs no longer gets stuck on “Loading profile…”, and route transitions reliably reach the target page or an error screen.
- If bootstrap (actor init, profile fetch, or admin check) fails during/after navigation, show `BootstrapErrorScreen` with Retry + Logout instead of an indefinite spinner, and log a non-sensitive diagnostic marker for where the failure occurred.
- Update dashboard/grouping logic so karigar-wise totals never show mapped orders as “Unassigned” when a matching master design exists; apply a single consistent fallback label (e.g., “Unassigned”) only when `karigarName` is truly empty/missing.
- Implement Master Design PDF parsing in the Admin “Import Master Designs” flow to extract `(design_code -> { genericName, karigarName })` mappings and show a preview list; show a clear English error for unsupported/unreadable PDFs.
- Update backend order handling so `genericName` and `karigarName` are automatically set/overwritten from the Master Designs mapping by `designCode` during upload and during unmapped-order reprocessing.

**User-visible outcome:** Users can switch between top navigation tabs without getting stuck on “Loading profile…”. Admins can import master designs from PDFs (with a parsed preview), and orders/dashboards show correct karigar-wise totals based on master design mappings instead of incorrectly appearing as “Unassigned”.

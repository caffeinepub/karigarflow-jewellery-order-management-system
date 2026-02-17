# Specification

## Summary
**Goal:** Make the “Edit Design Mapping” Karigar dropdown use the complete karigar list (including names derived from mapped Master Designs) and prevent “current karigar not found” from blocking saves.

**Planned changes:**
- Update backend karigar-name aggregation used by the frontend to include distinct, non-empty `karigarName` values from saved master design mappings (deduplicated), without loosening existing access rules.
- In the “Edit Design Mapping” dialog, populate the Karigar dropdown from the same complete backend list as “Add Design Mapping,” ensuring all mapped Excel karigars (e.g., the expected 19) are selectable.
- Fix edit-mode selection/validation so if the current karigar matches a backend-provided name, it is treated as valid, pre-selected correctly, and saving an unchanged mapping is allowed.
- Add a legacy-safe fallback in edit-mode: if the current karigar is not in the backend list, include it as an extra selectable dropdown option (labeled as legacy/unknown) and allow saving while still showing a warning.

**User-visible outcome:** Admin/Staff can open “Edit Design Mapping,” see and select from the full mapped karigar list, and save existing mappings even when the current karigar name isn’t in the standard list (via a legacy/unknown option), without being forced to change it.

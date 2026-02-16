# Specification

## Summary
**Goal:** Ensure the Master Designs Excel import correctly maps the column header "Karigar/Factory Name" (including common punctuation/spacing variants) to the karigar/factory name field so imported mappings don’t default to "Unassigned".

**Planned changes:**
- Update the Master Designs Excel import parser to recognize "Karigar/Factory Name" as the `karigarName` column.
- Extend header normalization/mapping so common variants (e.g., "Karigar / Factory Name", "Karigar-Factory Name") resolve to the same key.
- Preserve existing support for other karigar/factory headers (e.g., "Karigar Name", "Factory", "Factory Name").
- Ensure the import preview shows the parsed values under the "Karigar Name" column.

**User-visible outcome:** When importing a Master Designs Excel file that uses a "Karigar/Factory Name" header (or common variants), the preview and resulting mappings display the correct Karigar Name values instead of defaulting to "Unassigned" (unless the cell is empty).

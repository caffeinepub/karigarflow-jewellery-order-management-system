# Specification

## Summary
**Goal:** Fix karigar validation during design-mapping edits, make Admin Dashboard tabs mobile-friendly with a consistent default tab, and enable importing design images by design code from the vendor portal.

**Planned changes:**
- Fix the “Karigar name '<name>' does not exist” false error when editing a design mapping by aligning backend karigar existence checks with the UI list and applying case/whitespace-insensitive normalization (trim + collapse spaces + case-insensitive).
- Ensure duplicate-prevention for karigars continues to treat casing/whitespace-only variants as duplicates.
- Update Admin Dashboard indicator tabs layout to be mobile-responsive (no overlap/clumping on small screens).
- Set the Admin Dashboard default selected tab to “Total Orders” on open/refresh.
- Add an admin workflow to fetch a product image by design code from https://mpn.malabargroup.com/VendorDesigns.aspx and save it as the design image in the app (while keeping the existing Excel-based import flow).
- Add user-friendly error handling for vendor fetch failures without exposing vendor credentials in UI, logs, or toast messages.

**User-visible outcome:** Admins can edit design mappings without false karigar-not-found errors, use a clean mobile tab layout that defaults to “Total Orders,” and fetch/save design images directly by design code from the vendor portal when available.

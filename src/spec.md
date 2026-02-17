# Specification

## Summary
**Goal:** Ensure the Master Designs add/edit dialog uses the existing Karigar dropdown (backed by fetched karigar data) so edits reflect correctly without requiring free-text karigar entry.

**Planned changes:**
- Replace the “Karigar Name” free-text input in the Master Design add/edit dialog with a dropdown populated from the backend’s existing karigar list.
- Add explicit loading, error (with Retry), and empty states for fetching karigars, and prevent saving until a valid selection is available.
- When editing a mapping whose currently assigned karigar is not in the fetched list, show a warning and require the user to choose an existing karigar before saving.

**User-visible outcome:** Admins/staff can edit a Master Design mapping by selecting an existing Karigar from a dropdown, with clear feedback for loading/errors/no-data and a warning if the previously assigned karigar is unavailable.

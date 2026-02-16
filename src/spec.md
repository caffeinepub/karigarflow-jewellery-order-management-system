# Specification

## Summary
**Goal:** Fix the Admin Portal (/admin) runtime crash on initial load by making the dashboard and its dialogs defensively render without unsafe assumptions, and by providing a non-crashing error state for unexpected data issues.

**Planned changes:**
- Identify and resolve the crash triggered when navigating to `/admin`, ensuring AdminDashboardPage can render on a fresh load without any dialogs opened.
- Remove unsafe non-null assertions and unconditional rendering patterns in the admin dashboard (e.g., props derived from nullable state), and ensure dialogs only mount/render when their backing state is valid.
- Add a user-friendly, non-blocking error/warning state for invalid/corrupt order data (from backend or local cache), including a safe “clear local cache and reload” recovery path.

**User-visible outcome:** Admin users can open `/admin` without a white screen; the dashboard header/metrics/tabs render immediately, dialogs can be opened/closed repeatedly without crashes, and invalid data shows a clear warning with a working cache-clear recovery option.

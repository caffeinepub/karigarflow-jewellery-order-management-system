# Specification

## Summary
**Goal:** Fix the frontend bootstrap flow so authenticated users are not stuck on an infinite loading screen, and ensure routing proceeds to the correct dashboard or an actionable error state.

**Planned changes:**
- Update bootstrap/admin-check flow so role resolution always completes (admin-check reaches a resolved state such as `isFetched=true`) and does not block routing when access-control initialization is skipped or fails.
- Change bootstrap-critical admin-check logic (including `useIsCallerAdmin` and its dependencies) to use the non-blocking safe actor creation path (`useSafeActor`) so missing/empty admin token does not prevent app load.
- Harden router/layout loading guards so disabled/unrun queries cannot cause perpetual loading; show loading only when requests are actually in flight and otherwise fall back to existing error UI (BootstrapErrorScreen) with Retry that refetches in the correct order.
- Adjust service worker navigation/app-shell caching to prefer network with offline cache fallback, and bump cache version to reduce stale cached-bundle issues that can cause “stuck loading”.

**User-visible outcome:** After login (and when opening routes like `/admin` directly), the app reliably loads and navigates to the correct dashboard or shows a clear Bootstrap error with Retry—no indefinite loading spinner, including for clients without an admin token and clients affected by stale service worker cache.

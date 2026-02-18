# Specification

## Summary
**Goal:** Roll back the Malabar Partner production deployment to match Version 54 exactly (not 55/56), while preserving all existing production canister data and making the deployed version easy to verify.

**Planned changes:**
- Revert codebase and deployment process so production and any new draft build are created from the Version 54 code snapshot (with no Version 55/56 changes present).
- Ensure rollback preserves existing persisted canister state (orders, user profiles, master designs, karigars, activity logs, design images/mappings); add an upgrade-only compatible migration only if required to keep data intact.
- Add a build identifier/version label (e.g., “v54”) that is visible in the frontend UI and exposed by the backend via a status/health query.
- Fix rollback/rebuild behavior so draft expiry and caching (including service worker/client caches) do not cause the app to rebuild/serve Version 55/56 assets after selecting/deploying Version 54.

**User-visible outcome:** Users see the Version 54 UI/behavior in production without needing a hard refresh, existing production data remains available, and the app clearly shows it is running “v54” (with a backend method also reporting the same).

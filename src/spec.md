# Specification

## Summary
**Goal:** Fix order ingestion preview and orders-list filtering so karigar assignment and karigar-wise filtering remain correct and consistent, even when master designs load after a file is parsed.

**Planned changes:**
- Update `Ingest Orders` to prevent incorrect “Unmapped/Unassigned” preview states when parsing happens before `useGetMasterDesigns()` has finished loading, by either blocking parsing with an English loading message or by automatically re-mapping the already-parsed preview once master designs arrive (no re-upload required).
- Re-apply master-design mapping to parsed orders after master designs load to correctly fill `genericName` and karigar assignment while preserving any non-empty PDF-derived `karigarName`.
- Ensure preview mapped/unmapped counts and classifications update after re-mapping (no stale counts).
- Make karigar-wise filtering predictable across Staff/Admin pages using `OrdersFiltersBar`: the dropdown values must match the filtering logic, selecting a karigar must show all orders assigned to that karigar, and orders with `karigarName` populated via master-design mapping must not appear under “Unassigned.”
- Preserve the existing “All Karigars” sentinel-value behavior in `frontend/src/components/orders/OrdersFiltersBar.tsx` and avoid runtime errors.

**User-visible outcome:** Users can ingest PDF/Excel orders and reliably see correct karigar-wise assignment in the preview and after upload, and Staff/Admin can filter orders by karigar consistently without mapped orders incorrectly showing as “Unassigned.”

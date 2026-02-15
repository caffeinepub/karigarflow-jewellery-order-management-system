# Specification

## Summary
**Goal:** Enable PDF-based Daily Orders ingestion where each order row is correctly assigned to the most recently encountered karigar/factory section name in the PDF, and ensure that assignment is preserved through preview and upload.

**Planned changes:**
- Implement PDF parsing on the Staff/Admin “Ingest Orders” page to extract order rows and assign `karigarName` based on the rule: a karigar/factory name applies to all subsequent orders until the next karigar/factory name appears.
- Update ingestion preview/mapping to display and preserve PDF-derived `karigarName` values while still applying master-design mapping for `genericName` and keeping the existing “Unmapped Orders” detection/preview flow for unmapped design codes.
- Update backend upload mapping so incoming non-empty `karigarName` is not overwritten by master-design `karigarName`, while still using master designs to fill `genericName` and keeping current behavior when incoming `karigarName` is empty.

**User-visible outcome:** Staff/Admin can upload a Daily Orders PDF without the “PDF parsing is not yet implemented” error, see orders grouped/assigned to the correct karigar/factory in the preview, and upload orders where PDF-provided karigar assignments remain intact (with master designs still filling `genericName` when available).

# Specification

## Summary
**Goal:** Fix critical text visibility issues, add Excel order reconciliation with bulk import, implement barcode scanning with Fast and Batch modes for hallmark tracking, and enable day-wise hallmark status management with bulk billing.

**Planned changes:**
- Fix black-on-black text visibility across entire application by changing all text to white or light colors with proper contrast against dark backgrounds
- Create Excel Order Reconciliation page to upload customer portal Excel files and compare against existing orders (excluding 'Billed' status)
- Flag potential duplicates where design code AND order number already exist, and identify unmapped designs for review
- Display reconciliation report showing matched vs missing orders with one-click bulk import
- Build Barcode Tagging section with Fast Scanner Mode for continuous Code 128 barcode scanning via mobile camera or USB scanner
- Automatically extract design code and order number from scanned barcodes and match orders
- Mark scanned orders as 'Given for Hallmark' status with duplicate prevention in scanning session
- Add Batch Scanner Mode to scan multiple barcodes, review list, and bulk mark all as 'Given for Hallmark' at once
- Implement day-wise timestamp tracking when orders are marked 'Given for Hallmark'
- Add interface to view 'Given for Hallmark' orders grouped by date with multi-select functionality
- Provide bulk action to change selected 'Given for Hallmark' orders to 'Billed' status
- Store 'Given for Hallmark' and 'Billed' statuses in backend with timestamps and status transition validation
- Exclude 'Billed' orders from Excel reconciliation and hide from barcode scanner interface

**User-visible outcome:** Users can read all text clearly throughout the app, upload Excel files to identify missing orders and import them in bulk, scan jewelry tags continuously using their phone camera or USB scanner to mark items for hallmark processing, review scanned batches before marking, view hallmark items by date, and bulk change multiple hallmark items to billed status.

import type { PersistentOrder } from '../../backend';
import { format } from 'date-fns';
import { generateKarigarPOCode } from '../orders/generateKarigarPOCode';
import { formatOptionalNumber } from '../orders/formatOptionalNumber';

interface KarigarDownloadOptions {
  karigarName: string;
  orders: PersistentOrder[];
  selectedDate?: Date;
  dateLabel?: string;
  exportScope?: 'daily' | 'total';
}

/**
 * Detect if running on iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Generate and trigger browser print dialog for Karigar orders (PDF export)
 * iOS-compatible version with fallback
 */
export function downloadKarigarPDF({ karigarName, orders, selectedDate, dateLabel, exportScope = 'total' }: KarigarDownloadOptions): void {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const poCode = generateKarigarPOCode(karigarName);
  const dateStr = dateLabel || (selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'All Dates');
  const totalWeight = orders.reduce((sum, o) => sum + (o.weight ?? 0), 0);
  const totalQty = orders.reduce((sum, o) => sum + Number(o.qty), 0);
  const scopeLabel = exportScope === 'daily' ? 'Daily Orders' : 'Total Orders';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${today}_${poCode}_${karigarName}_${scopeLabel}</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 18px;
        }
        .header p {
          margin: 2px 0;
          font-size: 11px;
        }
        .header .po-code {
          font-weight: bold;
          font-size: 12px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
          font-size: 11px;
        }
        td {
          font-size: 10px;
        }
        .summary {
          margin-top: 15px;
          padding: 10px;
          border: 1px solid #000;
          background-color: #f9f9f9;
        }
        .summary p {
          margin: 3px 0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>KarigarFlow - Orders for ${karigarName}</h1>
        <p class="po-code">PO: ${poCode} | Date: ${today}</p>
        <p>${scopeLabel} - ${dateStr}</p>
        <p>Total Orders: ${orders.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Order No</th>
            <th>Type</th>
            <th>Design</th>
            <th>Generic</th>
            <th>Weight (g)</th>
            <th>Size</th>
            <th>Qty</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td>${order.orderNo}</td>
              <td>${order.orderType}${order.isCustomerOrder ? ' (CO)' : ''}</td>
              <td>${order.designCode}</td>
              <td>${order.genericName}</td>
              <td>${formatOptionalNumber(order.weight, 2) || '—'}</td>
              <td>${formatOptionalNumber(order.size, 2) || '—'}</td>
              <td>${Number(order.qty)}</td>
              <td>${order.remarks}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <p>Total Weight: ${totalWeight.toFixed(2)}g</p>
        <p>Total Quantity: ${totalQty}</p>
      </div>
    </body>
    </html>
  `;

  // iOS-specific handling
  if (isIOS()) {
    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      throw new Error('Failed to open print window. Please allow popups for this site.');
    }
  } else {
    // Desktop: use hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('Failed to create print document');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    };
  }
}

/**
 * Generate and download JPEG image of Karigar orders
 */
export async function downloadKarigarJPEG({ karigarName, orders, selectedDate, dateLabel, exportScope = 'total' }: KarigarDownloadOptions): Promise<void> {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const poCode = generateKarigarPOCode(karigarName);
  const dateStr = dateLabel || (selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'All Dates');
  const totalWeight = orders.reduce((sum, o) => sum + (o.weight ?? 0), 0);
  const totalQty = orders.reduce((sum, o) => sum + Number(o.qty), 0);
  const scopeLabel = exportScope === 'daily' ? 'Daily' : 'Total';

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas size
  const width = 1200;
  const rowHeight = 30;
  const headerHeight = 140;
  const summaryHeight = 80;
  const height = headerHeight + (orders.length + 1) * rowHeight + summaryHeight;
  canvas.width = width;
  canvas.height = height;

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw header
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`KarigarFlow - Orders for ${karigarName}`, width / 2, 40);
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`PO: ${poCode} | Date: ${today}`, width / 2, 70);
  ctx.font = '16px Arial';
  ctx.fillText(`${scopeLabel} Orders - ${dateStr}`, width / 2, 95);
  ctx.fillText(`Total Orders: ${orders.length}`, width / 2, 120);

  // Draw table header
  let y = headerHeight;
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, y, width, rowHeight);
  ctx.fillStyle = '#000000';
  ctx.strokeRect(0, y, width, rowHeight);
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  const columns = [
    { label: 'Order No', x: 10, width: 150 },
    { label: 'Type', x: 170, width: 80 },
    { label: 'Design', x: 260, width: 120 },
    { label: 'Generic', x: 390, width: 150 },
    { label: 'Weight', x: 550, width: 80 },
    { label: 'Size', x: 640, width: 70 },
    { label: 'Qty', x: 720, width: 60 },
    { label: 'Remarks', x: 790, width: 400 },
  ];
  columns.forEach(col => {
    ctx.fillText(col.label, col.x, y + 20);
  });

  // Draw table rows
  y += rowHeight;
  ctx.font = '12px Arial';
  orders.forEach((order, idx) => {
    if (idx % 2 === 0) {
      ctx.fillStyle = '#f9f9f9';
      ctx.fillRect(0, y, width, rowHeight);
    }
    ctx.fillStyle = '#000000';
    ctx.strokeRect(0, y, width, rowHeight);
    
    ctx.fillText(order.orderNo, 10, y + 20);
    ctx.fillText(`${order.orderType}${order.isCustomerOrder ? ' (CO)' : ''}`, 170, y + 20);
    ctx.fillText(order.designCode, 260, y + 20);
    ctx.fillText(order.genericName, 390, y + 20);
    ctx.fillText(formatOptionalNumber(order.weight, 2) || '—', 550, y + 20);
    ctx.fillText(formatOptionalNumber(order.size, 2) || '—', 640, y + 20);
    ctx.fillText(String(Number(order.qty)), 720, y + 20);
    ctx.fillText(order.remarks.substring(0, 50), 790, y + 20);
    
    y += rowHeight;
  });

  // Draw summary
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, y, width, summaryHeight);
  ctx.fillStyle = '#000000';
  ctx.strokeRect(0, y, width, summaryHeight);
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`Total Weight: ${totalWeight.toFixed(2)}g`, 20, y + 30);
  ctx.fillText(`Total Quantity: ${totalQty}`, 20, y + 55);

  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (!blob) {
      throw new Error('Failed to create image blob');
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${today}_${poCode}_${karigarName}_${scopeLabel}_Orders.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}

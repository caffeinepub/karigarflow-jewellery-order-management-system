import type { Order } from '../../backend';
import { format } from 'date-fns';

interface KarigarDownloadOptions {
  karigarName: string;
  orders: Order[];
  selectedDate?: Date;
  dateLabel?: string;
}

/**
 * Generate and trigger browser print dialog for Karigar orders (PDF export)
 */
export function downloadKarigarPDF({ karigarName, orders, selectedDate, dateLabel }: KarigarDownloadOptions): void {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  // Create a hidden iframe for printing
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

  // Build HTML content
  const dateStr = dateLabel || (selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'All Dates');
  const totalWeight = orders.reduce((sum, o) => sum + o.weight, 0);
  const totalQty = orders.reduce((sum, o) => sum + Number(o.qty), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${karigarName} Orders - ${dateStr}</title>
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
        <p>Date: ${dateStr}</p>
        <p>Total Orders: ${orders.length}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Order No</th>
            <th>Type</th>
            <th>Design</th>
            <th>Generic Name</th>
            <th>Weight (g)</th>
            <th>Size</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td>${order.orderNo}</td>
              <td>${order.orderType}</td>
              <td>${order.designCode}</td>
              <td>${order.genericName}</td>
              <td>${order.weight.toFixed(2)}</td>
              <td>${order.size.toFixed(2)}</td>
              <td>${order.qty}</td>
              <td>${order.status}</td>
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

/**
 * Generate and download Karigar orders as JPEG image
 */
export async function downloadKarigarJPEG({ karigarName, orders, selectedDate, dateLabel }: KarigarDownloadOptions): Promise<void> {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  const dateStr = dateLabel || (selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'All Dates');
  const totalWeight = orders.reduce((sum, o) => sum + o.weight, 0);
  const totalQty = orders.reduce((sum, o) => sum + Number(o.qty), 0);

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Canvas dimensions
  const width = 1200;
  const rowHeight = 30;
  const headerHeight = 120;
  const summaryHeight = 80;
  const padding = 20;
  const height = headerHeight + (orders.length + 1) * rowHeight + summaryHeight + padding * 2;

  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`KarigarFlow - Orders for ${karigarName}`, width / 2, padding + 30);
  
  ctx.font = '16px Arial';
  ctx.fillText(`Date: ${dateStr}`, width / 2, padding + 55);
  ctx.fillText(`Total Orders: ${orders.length}`, width / 2, padding + 80);

  // Draw line under header
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight);
  ctx.lineTo(width - padding, headerHeight);
  ctx.stroke();

  // Table headers
  const tableTop = headerHeight + 10;
  const colWidths = [120, 60, 100, 200, 80, 60, 60, 80, 200];
  const headers = ['Order No', 'Type', 'Design', 'Generic Name', 'Weight', 'Size', 'Qty', 'Status', 'Remarks'];
  
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(padding, tableTop, width - padding * 2, rowHeight);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  
  let xPos = padding + 5;
  headers.forEach((header, i) => {
    ctx.fillText(header, xPos, tableTop + 20);
    xPos += colWidths[i];
  });

  // Table rows
  ctx.font = '11px Arial';
  orders.forEach((order, rowIndex) => {
    const yPos = tableTop + (rowIndex + 1) * rowHeight;
    
    // Alternate row background
    if (rowIndex % 2 === 1) {
      ctx.fillStyle = '#f9f9f9';
      ctx.fillRect(padding, yPos, width - padding * 2, rowHeight);
    }
    
    ctx.fillStyle = '#000000';
    xPos = padding + 5;
    
    const values = [
      order.orderNo,
      order.orderType,
      order.designCode,
      order.genericName,
      order.weight.toFixed(2),
      order.size.toFixed(2),
      order.qty.toString(),
      order.status,
      order.remarks
    ];
    
    values.forEach((value, i) => {
      const maxWidth = colWidths[i] - 10;
      const text = value.length > 20 ? value.substring(0, 18) + '...' : value;
      ctx.fillText(text, xPos, yPos + 20, maxWidth);
      xPos += colWidths[i];
    });
  });

  // Draw table borders
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, tableTop, width - padding * 2, (orders.length + 1) * rowHeight);

  // Summary box
  const summaryTop = tableTop + (orders.length + 1) * rowHeight + 20;
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(padding, summaryTop, width - padding * 2, summaryHeight - 20);
  ctx.strokeRect(padding, summaryTop, width - padding * 2, summaryHeight - 20);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Total Weight: ${totalWeight.toFixed(2)}g`, padding + 10, summaryTop + 25);
  ctx.fillText(`Total Quantity: ${totalQty}`, padding + 10, summaryTop + 50);

  // Convert to blob and download
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create image'));
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${karigarName}_orders_${dateStr.replace(/[^a-z0-9]/gi, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/jpeg', 0.95);
  });
}

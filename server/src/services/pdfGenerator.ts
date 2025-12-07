import puppeteer from 'puppeteer';
import type { Invoice } from '../db/schema';

interface InvoiceData extends Invoice {
  clientName: string;
  clientEmail?: string;
  matterTitle: string;
  timeEntries?: Array<{
    description: string;
    aiNarrative?: string;
    durationMinutes: number;
    hourlyRate: number;
    entryDate: Date;
  }>;
  lawyerName: string;
  lawyerEmail?: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    const html = generateInvoiceHTML(invoiceData);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const timeEntriesHTML = data.timeEntries?.map(entry => {
    const hours = entry.durationMinutes / 60;
    const amount = (hours * entry.hourlyRate);
    return `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">
          ${formatDate(entry.entryDate)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">
          ${entry.aiNarrative || entry.description}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${hours.toFixed(2)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${formatCurrency(entry.hourlyRate)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
          ${formatCurrency(amount)}
        </td>
      </tr>
    `;
  }).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1f2937;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        
        .company-info h1 {
          font-size: 28px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
        }
        
        .company-info p {
          color: #6b7280;
          font-size: 13px;
        }
        
        .invoice-meta {
          text-align: right;
        }
        
        .invoice-meta h2 {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .invoice-meta p {
          color: #6b7280;
          font-size: 13px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 8px;
        }
        
        .status-draft {
          background-color: #f3f4f6;
          color: #6b7280;
        }
        
        .status-sent {
          background-color: #dbeafe;
          color: #2563eb;
        }
        
        .status-paid {
          background-color: #d1fae5;
          color: #059669;
        }
        
        .status-overdue {
          background-color: #fee2e2;
          color: #dc2626;
        }
        
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .party {
          flex: 1;
        }
        
        .party h3 {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 12px;
          letter-spacing: 0.05em;
        }
        
        .party p {
          margin-bottom: 4px;
          color: #1f2937;
        }
        
        .party .name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
        }
        
        .invoice-details {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .invoice-details table {
          width: 100%;
        }
        
        .invoice-details td {
          padding: 8px 0;
        }
        
        .invoice-details td:first-child {
          color: #6b7280;
          font-weight: 500;
        }
        
        .invoice-details td:last-child {
          text-align: right;
          font-weight: 600;
        }
        
        .line-items {
          margin-bottom: 30px;
        }
        
        .line-items h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1f2937;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          text-align: left;
          padding: 12px 8px;
          background-color: #f9fafb;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
        }
        
        th:nth-child(3),
        th:nth-child(4),
        th:nth-child(5) {
          text-align: right;
        }
        
        .totals {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        
        .totals table {
          margin-left: auto;
          width: 300px;
        }
        
        .totals td {
          padding: 8px 0;
        }
        
        .totals td:first-child {
          color: #6b7280;
          font-weight: 500;
        }
        
        .totals td:last-child {
          text-align: right;
          font-weight: 600;
        }
        
        .total-row {
          font-size: 18px;
          padding-top: 12px !important;
          border-top: 2px solid #e5e7eb;
        }
        
        .total-row td {
          padding-top: 12px !important;
          color: #1f2937 !important;
        }
        
        .notes {
          margin-top: 40px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        
        .notes h4 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1f2937;
        }
        
        .notes p {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>CounselFlow</h1>
            <p>${data.lawyerName}</p>
            ${data.lawyerEmail ? `<p>${data.lawyerEmail}</p>` : ''}
          </div>
          <div class="invoice-meta">
            <h2>INVOICE</h2>
            <p><strong>${data.invoiceNumber}</strong></p>
            <span class="status-badge status-${data.status}">${data.status.toUpperCase()}</span>
          </div>
        </div>
        
        <!-- Parties -->
        <div class="parties">
          <div class="party">
            <h3>Bill To</h3>
            <p class="name">${data.clientName}</p>
            ${data.clientEmail ? `<p>${data.clientEmail}</p>` : ''}
          </div>
          <div class="party" style="text-align: right;">
            <h3>Invoice Details</h3>
            <p><strong>Matter:</strong> ${data.matterTitle}</p>
            <p><strong>Date:</strong> ${formatDate(data.createdAt)}</p>
            ${data.dueDate ? `<p><strong>Due:</strong> ${formatDate(data.dueDate)}</p>` : ''}
            ${data.paidDate ? `<p><strong>Paid:</strong> ${formatDate(data.paidDate)}</p>` : ''}
          </div>
        </div>
        
        <!-- Line Items -->
        ${data.timeEntries && data.timeEntries.length > 0 ? `
        <div class="line-items">
          <h3>Time Entries</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${timeEntriesHTML}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <!-- Totals -->
        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td>${formatCurrency(data.totalAmount || 0)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Due:</strong></td>
              <td><strong>${formatCurrency(data.totalAmount || 0)}</strong></td>
            </tr>
          </table>
        </div>
        
        <!-- Notes -->
        ${data.notes ? `
        <div class="notes">
          <h4>Notes</h4>
          <p>${data.notes}</p>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated by CounselFlow on ${formatDate(new Date())}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============ Legal Document PDF Generation ============

interface DocumentData {
  title: string;
  content: string;
  status: string;
  version: number;
  matterTitle?: string;
  clientName?: string;
  lawyerName: string;
  createdAt: Date;
}

export async function generateDocumentPDF(documentData: DocumentData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    const html = generateDocumentHTML(documentData);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      margin: {
        top: '25mm',
        right: '25mm',
        bottom: '25mm',
        left: '25mm',
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateDocumentHTML(data: DocumentData): string {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Convert markdown-style content to basic HTML
  const formatContent = (content: string) => {
    return content
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Line breaks - double newlines become paragraphs
      .split(/\n\n+/)
      .map(para => para.trim())
      .filter(para => para.length > 0)
      .map(para => {
        // If it starts with a header tag, don't wrap in <p>
        if (para.startsWith('<h')) {
          return para;
        }
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.8;
          color: #000;
        }

        .document-container {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #000;
        }

        .header h1 {
          font-size: 18pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }

        .header .document-info {
          font-size: 10pt;
          color: #666;
        }

        .meta-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 4px;
          font-size: 10pt;
        }

        .meta-info .left,
        .meta-info .right {
          line-height: 1.6;
        }

        .meta-info .label {
          font-weight: bold;
          color: #333;
        }

        .content {
          text-align: justify;
        }

        .content h1 {
          font-size: 16pt;
          margin: 30px 0 15px 0;
          text-align: center;
          text-transform: uppercase;
        }

        .content h2 {
          font-size: 14pt;
          margin: 25px 0 12px 0;
          font-weight: bold;
        }

        .content h3 {
          font-size: 12pt;
          margin: 20px 0 10px 0;
          font-weight: bold;
        }

        .content p {
          margin-bottom: 12px;
          text-indent: 0.5in;
        }

        .content p:first-of-type {
          text-indent: 0;
        }

        .signature-block {
          margin-top: 60px;
          page-break-inside: avoid;
        }

        .signature-line {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }

        .signature-area {
          width: 45%;
        }

        .signature-area .line {
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
          height: 30px;
        }

        .signature-area .label {
          font-size: 10pt;
          color: #333;
        }

        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 9pt;
          color: #666;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 9pt;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-draft {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-final {
          background-color: #d4edda;
          color: #155724;
        }

        .status-archived {
          background-color: #e2e3e5;
          color: #383d41;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- Header -->
        <div class="header">
          <h1>${data.title}</h1>
          <div class="document-info">
            <span class="status-badge status-${data.status}">${data.status.toUpperCase()}</span>
            &nbsp;&bull;&nbsp; Version ${data.version}
          </div>
        </div>

        <!-- Meta Information -->
        <div class="meta-info">
          <div class="left">
            ${data.matterTitle ? `<div><span class="label">Matter:</span> ${data.matterTitle}</div>` : ''}
            ${data.clientName ? `<div><span class="label">Client:</span> ${data.clientName}</div>` : ''}
          </div>
          <div class="right">
            <div><span class="label">Prepared by:</span> ${data.lawyerName}</div>
            <div><span class="label">Date:</span> ${formatDate(data.createdAt)}</div>
          </div>
        </div>

        <!-- Document Content -->
        <div class="content">
          ${formatContent(data.content)}
        </div>

        <!-- Signature Block -->
        <div class="signature-block">
          <div class="signature-line">
            <div class="signature-area">
              <div class="line"></div>
              <div class="label">Signature</div>
            </div>
            <div class="signature-area">
              <div class="line"></div>
              <div class="label">Date</div>
            </div>
          </div>
          <div class="signature-line">
            <div class="signature-area">
              <div class="line"></div>
              <div class="label">Printed Name</div>
            </div>
            <div class="signature-area">
              <div class="line"></div>
              <div class="label">Title</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Generated by CounselFlow on ${formatDate(new Date())}</p>
          <p>This document was prepared using AI-assisted drafting technology.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

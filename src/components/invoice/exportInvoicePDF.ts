import { Invoice } from '../../types';
import { authFetch } from '../../utils/authFetch';
import templateHtml from '../../../template/invoice.html?raw';

function fmtVND(v: number) {
  return Math.round(v).toLocaleString('en-US') + ' đ';
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildPreviewHtml(invoice: Invoice): string {
  const invoiceNo = `INV-${invoice.id.slice(0, 5).toUpperCase()}-${invoice.datetime.split('T')[0].replace(/-/g, '')}`;

  const qrUrl =
    `https://img.vietqr.io/image/970436-0181003627857-compact2.png` +
    `?amount=${Math.round(invoice.total)}` +
    `&addInfo=${encodeURIComponent(invoiceNo)}` +
    `&accountName=${encodeURIComponent('VU MINH BACH')}`;

  const MIN_ROWS = 6;
  const itemRows = invoice.items.map(item => `
    <tr>
      <td>${esc(item.description)}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmtVND(item.price)}</td>
      <td class="right">${fmtVND(item.price * item.quantity)}</td>
    </tr>`).join('');

  const emptyRows = Array.from({ length: Math.max(0, MIN_ROWS - invoice.items.length) })
    .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`).join('');

  const note = invoice.description ? esc(invoice.description) : '';

  return templateHtml
    .replaceAll('{{INVOICE_NO}}', esc(invoiceNo))
    .replaceAll('{{DOMAIN}}',     esc(invoice.domain))
    .replaceAll('{{DATE}}',       fmtDate(invoice.datetime))
    .replace('{{ITEMS_ROWS}}',    itemRows + emptyRows)
    .replace('{{NOTE}}',          note)
    .replace('{{TOTAL}}',         fmtVND(invoice.total))
    .replace('{{QR_URL}}',        qrUrl);
}

/** Open invoice as HTML in a new browser tab (with Save-as-PDF toolbar button) */
export function previewInvoice(invoice: Invoice) {
  const html = buildPreviewHtml(invoice);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/** Download invoice as a real PDF file via server-side Puppeteer rendering */
export async function exportInvoicePDF(invoice: Invoice): Promise<void> {
  const invoiceNo = `INV-${invoice.id.slice(0, 5).toUpperCase()}-1`;

  const res = await authFetch('/api/pdf/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });

  if (!res.ok) throw new Error('Failed to generate PDF');

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${invoiceNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

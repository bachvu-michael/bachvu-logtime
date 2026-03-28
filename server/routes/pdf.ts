import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Invoice } from '../../src/types/index.js';

const router = Router();

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

function buildHtml(invoice: Invoice): string {
  const templatePath = path.join(process.cwd(), 'template', 'invoice.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const invoiceNo = `INV-${invoice.id.slice(0, 5).toUpperCase()}-1`;

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

  // Remove toolbar from printed PDF — it's screen-only
  return template
    .replaceAll('{{INVOICE_NO}}', esc(invoiceNo))
    .replaceAll('{{DOMAIN}}',     esc(invoice.domain))
    .replaceAll('{{DATE}}',       fmtDate(invoice.datetime))
    .replace('{{ITEMS_ROWS}}',    itemRows + emptyRows)
    .replace('{{NOTE}}',          note)
    .replace('{{TOTAL}}',         fmtVND(invoice.total))
    .replace('{{QR_URL}}',        qrUrl);
}

// POST /api/pdf/invoice
router.post('/invoice', async (req: Request, res: Response) => {
  const invoice = req.body as Invoice;
  const invoiceNo = `INV-${invoice.id.slice(0, 5).toUpperCase()}`;

  let browser;
  try {
    const html = buildHtml(invoice);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.pdf"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    await browser?.close();
  }
});

export default router;

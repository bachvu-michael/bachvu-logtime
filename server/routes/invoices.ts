import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Invoice, InvoiceInput } from '../../src/types/index.js';

const router = Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Invoice[] {
  if (!fs.existsSync(INVOICES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf-8')) as Invoice[];
  } catch {
    return [];
  }
}

function writeAll(invoices: Invoice[]) {
  ensureDataDir();
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf-8');
}

// GET /api/invoices
router.get('/', (_req: Request, res: Response) => {
  const all = readAll();
  all.sort((a, b) => b.createdAt - a.createdAt);
  res.json(all);
});

// GET /api/invoices/domains  — unique domains for autocomplete
router.get('/domains', (_req: Request, res: Response) => {
  const domains = [...new Set(readAll().map(i => i.domain).filter(Boolean))].sort();
  res.json(domains);
});

// POST /api/invoices
router.post('/', (req: Request, res: Response) => {
  const body = req.body as InvoiceInput;
  const invoice: Invoice = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const all = readAll();
  all.push(invoice);
  writeAll(all);
  res.status(201).json(invoice);
});

// PUT /api/invoices/:id
router.put('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as Partial<InvoiceInput>;
  const all = readAll();
  const index = all.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  all[index] = { ...all[index], ...body, id };
  writeAll(all);
  res.json(all[index]);
});

// DELETE /api/invoices/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const all = readAll();
  const index = all.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  all.splice(index, 1);
  writeAll(all);
  res.json({ ok: true });
});

export default router;

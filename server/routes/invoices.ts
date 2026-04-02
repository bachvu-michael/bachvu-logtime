import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { Invoice, InvoiceInput } from '../../src/types/index.js';

const router = Router();

type PrismaInvoice = Awaited<ReturnType<typeof prisma.invoice.findFirst>> & {
  items: Awaited<ReturnType<typeof prisma.invoiceItem.findMany>>;
};

function toInvoice(r: NonNullable<PrismaInvoice>): Invoice {
  return {
    id:          r.id,
    invoiceType: r.invoiceType as Invoice['invoiceType'],
    domain:      r.domain,
    total:       Number(r.total),
    items:       r.items.map(i => ({
      description: i.description,
      price:       Number(i.price),
      quantity:    Number(i.quantity),
    })),
    datetime:    r.datetime.toISOString().split('T')[0],
    description: r.description ?? undefined,
    status:      r.status as Invoice['status'],
    createdAt:   Number(r.createdAt),
  };
}

const withItems = { items: { orderBy: { id: 'asc' as const } } };

// GET /api/invoices
router.get('/', async (_req: Request, res: Response) => {
  const rows = await prisma.invoice.findMany({
    include: withItems,
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(toInvoice));
});

// GET /api/invoices/domains
router.get('/domains', async (_req: Request, res: Response) => {
  const rows = await prisma.invoice.findMany({
    distinct: ['domain'],
    where:    { domain: { not: '' } },
    select:   { domain: true },
    orderBy:  { domain: 'asc' },
  });
  res.json(rows.map(r => r.domain));
});

// POST /api/invoices
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as InvoiceInput;
  const id        = crypto.randomUUID();
  const createdAt = Date.now();

  const created = await prisma.invoice.create({
    data: {
      id,
      invoiceType: body.invoiceType,
      domain:      body.domain,
      total:       body.total,
      datetime:    new Date(body.datetime + 'T00:00:00.000Z'),
      description: body.description ?? null,
      status:      body.status,
      createdAt,
      items: { create: body.items.map(i => ({
        description: i.description,
        price:       i.price,
        quantity:    i.quantity,
      })) },
    },
    include: withItems,
  });
  res.status(201).json(toInvoice(created));
});

// PUT /api/invoices/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id   = String(req.params.id);
  const body = req.body as Partial<InvoiceInput>;

  const existing = await prisma.invoice.findUnique({ where: { id }, include: withItems });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.$transaction(async tx => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        invoiceType: body.invoiceType ?? existing.invoiceType,
        domain:      body.domain      ?? existing.domain,
        total:       body.total       ?? existing.total,
        datetime:    body.datetime
          ? new Date(body.datetime + 'T00:00:00.000Z')
          : existing.datetime,
        description: body.description !== undefined ? (body.description || null) : existing.description,
        status:      body.status ?? existing.status,
        items: { create: (body.items ?? existing.items).map(i => ({
          description: i.description,
          price:       i.price,
          quantity:    i.quantity,
        })) },
      },
      include: withItems,
    });
  });
  res.json(toInvoice(updated));
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.invoice.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

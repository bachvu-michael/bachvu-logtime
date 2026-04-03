import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { Bill, BillInput } from '../../src/types/index.js';

const router = Router();

type PrismaBill = Awaited<ReturnType<typeof prisma.bill.findFirst>>;

function toBill(r: NonNullable<PrismaBill>): Bill {
  return {
    id:        r.id,
    billType:  r.billType  as Bill['billType'],
    location:  r.location  as Bill['location'],
    name:      r.name ?? undefined,
    amount:    Number(r.amount),
    billMonth: r.billMonth,
    paidDate:  r.paidDate instanceof Date
      ? r.paidDate.toISOString().split('T')[0]
      : String(r.paidDate),
    note:      r.note ?? undefined,
    createdAt: Number(r.createdAt),
  };
}

// GET /api/bills/export
router.get('/export', async (req: Request, res: Response) => {
  const { location, year, name } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (location) where.location = location;
  if (year)     where.billMonth = { startsWith: year + '-' };
  if (name)     where.name = name;
  const rows = await prisma.bill.findMany({ where, orderBy: [{ billMonth: 'desc' }] });
  const bills = rows.map(toBill);
  res.setHeader('Content-Disposition', 'attachment; filename="bills.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(bills);
});

// GET /api/bills?location=home&year=2026&name=điện+Bạch
router.get('/', async (req: Request, res: Response) => {
  const { location, year, name } = req.query as Record<string, string | undefined>;

  const where: Record<string, unknown> = {};
  if (location) where.location = location;
  if (year)     where.billMonth = { startsWith: year + '-' };
  if (name)     where.name = name;

  const rows = await prisma.bill.findMany({
    where,
    orderBy: [{ billMonth: 'desc' }, { billType: 'asc' }],
  });
  res.json(rows.map(toBill));
});

// POST /api/bills
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as BillInput;
  const created = await prisma.bill.create({
    data: {
      id:        crypto.randomUUID(),
      billType:  body.billType,
      location:  body.location,
      name:      body.name ?? null,
      amount:    body.amount,
      billMonth: body.billMonth,
      paidDate:  new Date(body.paidDate + 'T00:00:00.000Z'),
      note:      body.note ?? null,
      createdAt: Date.now(),
    },
  });
  res.status(201).json(toBill(created));
});

// PUT /api/bills/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id   = String(req.params.id);
  const body = req.body as Partial<BillInput>;

  const existing = await prisma.bill.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      billType:  body.billType  ?? existing.billType,
      location:  body.location  ?? existing.location,
      name:      body.name !== undefined ? (body.name || null) : existing.name,
      amount:    body.amount    ?? existing.amount,
      billMonth: body.billMonth ?? existing.billMonth,
      paidDate:  body.paidDate
        ? new Date(body.paidDate + 'T00:00:00.000Z')
        : existing.paidDate,
      note: body.note !== undefined ? (body.note || null) : existing.note,
    },
  });
  res.json(toBill(updated));
});

// DELETE /api/bills/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.bill.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.bill.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { CycleEntry, CycleEntryInput } from '../../src/types/index.js';

const router = Router();

type PrismaCycle = Awaited<ReturnType<typeof prisma.cycleEntry.findFirst>>;

function toCycle(r: NonNullable<PrismaCycle>): CycleEntry {
  return {
    id:        r.id,
    date:      r.date,
    bleeding:  r.bleeding  as CycleEntry['bleeding'],
    mucus:     r.mucus     as CycleEntry['mucus'],
    sensation: r.sensation as CycleEntry['sensation'],
    isPeakDay: r.isPeakDay,
    note:      r.note ?? undefined,
    createdAt: Number(r.createdAt),
  };
}

// GET /api/cycles/export?year=YYYY
router.get('/export', async (req: Request, res: Response) => {
  const { year, month } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (year)  where.date = { startsWith: year + '-' };
  if (month) where.date = { startsWith: month + '-' };
  const rows = await prisma.cycleEntry.findMany({ where, orderBy: { date: 'asc' } });
  res.setHeader('Content-Disposition', `attachment; filename="cycles.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(rows.map(toCycle));
});

// GET /api/cycles?year=YYYY&month=YYYY-MM
router.get('/', async (req: Request, res: Response) => {
  const { year, month } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (month) where.date = { startsWith: month };
  else if (year) where.date = { startsWith: year + '-' };
  const rows = await prisma.cycleEntry.findMany({ where, orderBy: { date: 'asc' } });
  res.json(rows.map(toCycle));
});

// POST /api/cycles — upsert by date
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as CycleEntryInput;
  const existing = await prisma.cycleEntry.findUnique({ where: { date: body.date } });

  if (existing) {
    const updated = await prisma.cycleEntry.update({
      where: { date: body.date },
      data: {
        bleeding:  body.bleeding,
        mucus:     body.mucus,
        sensation: body.sensation,
        isPeakDay: body.isPeakDay ?? false,
        note:      body.note ?? null,
      },
    });
    return res.json(toCycle(updated));
  }

  const created = await prisma.cycleEntry.create({
    data: {
      id:        crypto.randomUUID(),
      date:      body.date,
      bleeding:  body.bleeding,
      mucus:     body.mucus,
      sensation: body.sensation,
      isPeakDay: body.isPeakDay ?? false,
      note:      body.note ?? null,
      createdAt: Date.now(),
    },
  });
  res.status(201).json(toCycle(created));
});

// DELETE /api/cycles/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.cycleEntry.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.cycleEntry.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { PersonalEvent, PersonalEventInput } from '../../src/types/index.js';

const router = Router();

type PrismaEvent = Awaited<ReturnType<typeof prisma.personalEvent.findFirst>>;

function toEvent(r: NonNullable<PrismaEvent>): PersonalEvent {
  return {
    id:          r.id,
    title:       r.title,
    date:        r.date,
    time:        r.time ?? undefined,
    eventType:   r.eventType,
    description: r.description ?? undefined,
    reminder:    r.reminder as PersonalEvent['reminder'],
    completed:   r.completed,
    createdAt:   Number(r.createdAt),
  };
}

// GET /api/events?month=YYYY-MM&year=YYYY&upcoming=true
router.get('/', async (req: Request, res: Response) => {
  const { month, year, upcoming } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (month)    where.date = { startsWith: month };
  else if (year) where.date = { startsWith: year + '-' };
  if (upcoming === 'true') {
    const today = new Date().toISOString().split('T')[0];
    where.date = { gte: today };
    where.completed = false;
  }
  const rows = await prisma.personalEvent.findMany({ where, orderBy: { date: 'asc' } });
  res.json(rows.map(toEvent));
});

// GET /api/events/reminders — events with active or upcoming reminders
router.get('/reminders', async (_req: Request, res: Response) => {
  const rows = await prisma.personalEvent.findMany({
    where: { completed: false, reminder: { not: 'none' } },
    orderBy: { date: 'asc' },
  });
  res.json(rows.map(toEvent));
});

// POST /api/events
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as PersonalEventInput;
  const created = await prisma.personalEvent.create({
    data: {
      id:          crypto.randomUUID(),
      title:       body.title,
      date:        body.date,
      time:        body.time ?? null,
      eventType:   body.eventType,
      description: body.description ?? null,
      reminder:    body.reminder,
      completed:   body.completed ?? false,
      createdAt:   Date.now(),
    },
  });
  res.status(201).json(toEvent(created));
});

// PUT /api/events/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id   = String(req.params.id);
  const body = req.body as Partial<PersonalEventInput>;
  const existing = await prisma.personalEvent.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.personalEvent.update({
    where: { id },
    data: {
      title:       body.title       ?? existing.title,
      date:        body.date        ?? existing.date,
      time:        body.time !== undefined ? (body.time || null) : existing.time,
      eventType:   body.eventType   ?? existing.eventType,
      description: body.description !== undefined ? (body.description || null) : existing.description,
      reminder:    body.reminder    ?? existing.reminder,
      completed:   body.completed   !== undefined ? body.completed : existing.completed,
    },
  });
  res.json(toEvent(updated));
});

// DELETE /api/events/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.personalEvent.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.personalEvent.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

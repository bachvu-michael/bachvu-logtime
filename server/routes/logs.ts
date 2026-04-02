import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { LogEntry, LogEntryInput } from '../../src/types/index.js';
import { upsertTask } from './tasks.js';

const router = Router();

type PrismaLogEntry = Awaited<ReturnType<typeof prisma.logEntry.findFirst>>;

function toEntry(r: NonNullable<PrismaLogEntry>): LogEntry {
  return {
    id:            r.id,
    taskType:      r.taskType as LogEntry['taskType'],
    ticketKey:     r.ticketKey,
    title:         r.title,
    hours:         r.hours,
    minutes:       r.minutes,
    timeSpent:     Number(r.timeSpent),
    date:          r.date.toISOString().split('T')[0],
    teamworkType:  (r.teamworkType ?? undefined) as LogEntry['teamworkType'],
    takeoffPeriod: (r.takeoffPeriod ?? undefined) as LogEntry['takeoffPeriod'],
    createdAt:     Number(r.createdAt),
  };
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(y, m - 1, 1)),
    lt:  new Date(Date.UTC(y, m, 1)),
  };
}

// GET /api/logs?month=YYYY-MM
router.get('/', async (req: Request, res: Response) => {
  const month = req.query.month as string | undefined;
  const rows = await prisma.logEntry.findMany({
    where: month ? { date: monthRange(month) } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(toEntry));
});

// GET /api/logs/months
router.get('/months', async (_req: Request, res: Response) => {
  const rows = await prisma.$queryRaw<{ month: string }[]>`
    SELECT DISTINCT DATE_FORMAT(date, '%Y-%m') AS month
    FROM log_entries
    ORDER BY month DESC
  `;
  res.json(rows.map(r => r.month));
});

// POST /api/logs
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as LogEntryInput;
  const entry: LogEntry = {
    ...body,
    id:        crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await prisma.logEntry.create({
    data: {
      id:            entry.id,
      taskType:      entry.taskType,
      ticketKey:     entry.ticketKey,
      title:         entry.title,
      hours:         entry.hours,
      minutes:       entry.minutes,
      timeSpent:     entry.timeSpent,
      date:          new Date(entry.date + 'T00:00:00.000Z'),
      teamworkType:  entry.teamworkType ?? null,
      takeoffPeriod: entry.takeoffPeriod ?? null,
      createdAt:     entry.createdAt,
    },
  });
  await upsertTask(entry.taskType, entry.ticketKey, entry.title, entry.teamworkType);
  res.status(201).json(entry);
});

// PUT /api/logs/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as Partial<LogEntryInput>;

  const existing = await prisma.logEntry.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated: LogEntry = { ...toEntry(existing), ...body, id };
  await prisma.logEntry.update({
    where: { id },
    data: {
      taskType:      updated.taskType,
      ticketKey:     updated.ticketKey,
      title:         updated.title,
      hours:         updated.hours,
      minutes:       updated.minutes,
      timeSpent:     updated.timeSpent,
      date:          new Date(updated.date + 'T00:00:00.000Z'),
      teamworkType:  updated.teamworkType ?? null,
      takeoffPeriod: updated.takeoffPeriod ?? null,
    },
  });
  await upsertTask(updated.taskType, updated.ticketKey, updated.title, updated.teamworkType);
  res.json(updated);
});

// DELETE /api/logs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.logEntry.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.logEntry.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

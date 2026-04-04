import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { EventType, DEFAULT_EVENT_TYPES } from '../../src/types/index.js';

const router = Router();

type PrismaType = Awaited<ReturnType<typeof prisma.eventType.findFirst>>;

function toType(r: NonNullable<PrismaType>): EventType {
  return { id: r.id, name: r.name, color: r.color, createdAt: Number(r.createdAt) };
}

// Seed default types if none exist
async function seedIfEmpty() {
  const count = await prisma.eventType.count();
  if (count === 0) {
    await prisma.eventType.createMany({
      data: DEFAULT_EVENT_TYPES.map(t => ({
        id: crypto.randomUUID(),
        name: t.name,
        color: t.color,
        createdAt: Date.now(),
      })),
    });
  }
}

// GET /api/event-types
router.get('/', async (_req: Request, res: Response) => {
  await seedIfEmpty();
  const rows = await prisma.eventType.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(rows.map(toType));
});

// POST /api/event-types
router.post('/', async (req: Request, res: Response) => {
  const { name, color } = req.body as { name: string; color: string };
  const created = await prisma.eventType.create({
    data: { id: crypto.randomUUID(), name, color, createdAt: Date.now() },
  });
  res.status(201).json(toType(created));
});

// PUT /api/event-types/:id (update color)
router.put('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { color } = req.body as { color: string };
  const updated = await prisma.eventType.update({ where: { id }, data: { color } });
  res.json(toType(updated));
});

// DELETE /api/event-types/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await prisma.eventType.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

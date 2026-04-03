import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /api/bill-names
router.get('/', async (_req: Request, res: Response) => {
  const rows = await prisma.billName.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map(r => ({ id: r.id, name: r.name, createdAt: Number(r.createdAt) })));
});

// POST /api/bill-names
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const existing = await prisma.billName.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(409).json({ error: 'Name already exists' });
  const created = await prisma.billName.create({
    data: { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() },
  });
  res.status(201).json({ id: created.id, name: created.name, createdAt: Number(created.createdAt) });
});

// DELETE /api/bill-names/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.billName.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.billName.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;

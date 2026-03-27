import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { LogEntry, LogEntryInput } from '../../src/types/index.js';
import { upsertTask } from './tasks.js';

const router = Router();
const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function monthKey(date: string) {
  return date.slice(0, 7); // YYYY-MM
}

function filePath(month: string) {
  return path.join(DATA_DIR, `${month}.json`);
}

function readMonth(month: string): LogEntry[] {
  const fp = filePath(month);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as LogEntry[];
  } catch {
    return [];
  }
}

function writeMonth(month: string, entries: LogEntry[]) {
  ensureDataDir();
  fs.writeFileSync(filePath(month), JSON.stringify(entries, null, 2), 'utf-8');
}

function getAllMonths(): string[] {
  ensureDataDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter(f => /^\d{4}-\d{2}\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));
}

function findEntry(id: string): { month: string; index: number; entries: LogEntry[] } | null {
  for (const month of getAllMonths()) {
    const entries = readMonth(month);
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) return { month, index, entries };
  }
  return null;
}

// GET /api/logs?month=YYYY-MM  (optional filter)
router.get('/', (_req: Request, res: Response) => {
  const month = _req.query.month as string | undefined;
  if (month) {
    return res.json(readMonth(month));
  }
  const all: LogEntry[] = [];
  for (const m of getAllMonths()) {
    all.push(...readMonth(m));
  }
  all.sort((a, b) => b.createdAt - a.createdAt);
  res.json(all);
});

// GET /api/logs/months
router.get('/months', (_req: Request, res: Response) => {
  res.json(getAllMonths());
});

// POST /api/logs
router.post('/', (req: Request, res: Response) => {
  const body = req.body as LogEntryInput;
  const entry: LogEntry = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const month = monthKey(entry.date);
  const entries = readMonth(month);
  entries.push(entry);
  writeMonth(month, entries);
  upsertTask(entry.taskType, entry.ticketKey, entry.title, entry.teamworkType);
  res.status(201).json(entry);
});

// PUT /api/logs/:id
router.put('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as Partial<LogEntryInput>;
  const found = findEntry(id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const updated: LogEntry = { ...found.entries[found.index], ...body, id };
  const newMonth = monthKey(updated.date);

  if (newMonth !== found.month) {
    found.entries.splice(found.index, 1);
    writeMonth(found.month, found.entries);
    const newEntries = readMonth(newMonth);
    newEntries.push(updated);
    writeMonth(newMonth, newEntries);
  } else {
    found.entries[found.index] = updated;
    writeMonth(found.month, found.entries);
  }

  upsertTask(updated.taskType, updated.ticketKey, updated.title, updated.teamworkType);
  res.json(updated);
});

// DELETE /api/logs/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const found = findEntry(id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  found.entries.splice(found.index, 1);
  writeMonth(found.month, found.entries);
  res.json({ ok: true });
});

export default router;

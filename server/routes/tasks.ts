import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DATA_DIR   = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

export interface TasksStore {
  jira: Record<string, string>;                    // ticketKey -> title
  teamwork: Record<string, string[]>;              // teamworkType -> unique names
}

const EMPTY_STORE = (): TasksStore => ({ jira: {}, teamwork: {} });

export function readTasks(): TasksStore {
  if (!fs.existsSync(TASKS_FILE)) return EMPTY_STORE();
  try {
    const raw = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    // Backward-compat: old format had teamwork as a flat string[]
    if (Array.isArray(raw.teamwork)) {
      return { jira: raw.jira ?? {}, teamwork: {} };
    }
    return raw as TasksStore;
  } catch {
    return EMPTY_STORE();
  }
}

function writeTasks(store: TasksStore) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/** Call after creating or updating a log entry. */
export function upsertTask(taskType: string, ticketKey: string, title: string, teamworkType?: string) {
  const store = readTasks();

  if (taskType === 'jira' && ticketKey && title) {
    store.jira[ticketKey] = title;
  } else if (taskType === 'teamwork' && teamworkType && title) {
    if (!store.teamwork[teamworkType]) store.teamwork[teamworkType] = [];
    if (!store.teamwork[teamworkType].includes(title)) {
      store.teamwork[teamworkType].push(title);
      store.teamwork[teamworkType].sort();
    }
  }

  writeTasks(store);
}

// GET /api/tasks
router.get('/', (_req: Request, res: Response) => {
  res.json(readTasks());
});

export default router;

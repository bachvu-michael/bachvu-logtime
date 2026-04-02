import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

export interface TasksStore {
  jira: Record<string, string>;       // ticketKey -> title
  teamwork: Record<string, string[]>; // teamworkType -> unique names
}

export async function upsertTask(
  taskType: string,
  ticketKey: string,
  title: string,
  teamworkType?: string,
) {
  if (taskType === 'jira' && ticketKey && title) {
    await prisma.jiraTask.upsert({
      where:  { ticketKey },
      update: { title },
      create: { ticketKey, title },
    });
  } else if (taskType === 'teamwork' && teamworkType && title) {
    await prisma.teamworkTask.upsert({
      where:  { uq_type_name: { teamworkType, name: title } },
      update: {},
      create: { teamworkType, name: title },
    });
  }
}

// GET /api/tasks
router.get('/', async (_req: Request, res: Response) => {
  const [jiraRows, teamworkRows] = await Promise.all([
    prisma.jiraTask.findMany(),
    prisma.teamworkTask.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const jira: Record<string, string> = {};
  for (const r of jiraRows) jira[r.ticketKey] = r.title;

  const teamwork: Record<string, string[]> = {};
  for (const r of teamworkRows) {
    if (!teamwork[r.teamworkType]) teamwork[r.teamworkType] = [];
    teamwork[r.teamworkType].push(r.name);
  }

  res.json({ jira, teamwork });
});

export default router;

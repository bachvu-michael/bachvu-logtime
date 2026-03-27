import { authFetch } from '../utils/authFetch';

export interface TasksStore {
  jira: Record<string, string>;      // ticketKey -> title
  teamwork: Record<string, string[]>; // teamworkType -> unique names
}

export async function fetchTasks(): Promise<TasksStore> {
  try {
    const res = await authFetch('/api/tasks');
    if (!res.ok) return { jira: {}, teamwork: {} };
    return res.json();
  } catch {
    return { jira: {}, teamwork: {} };
  }
}

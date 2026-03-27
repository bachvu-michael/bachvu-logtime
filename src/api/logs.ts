import { LogEntry, LogEntryInput } from '../types';
import { authFetch } from '../utils/authFetch';

const BASE = '/api/logs';

export async function fetchLogs(month?: string): Promise<LogEntry[]> {
  const url = month ? `${BASE}?month=${month}` : BASE;
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchMonths(): Promise<string[]> {
  const res = await authFetch(`${BASE}/months`);
  if (!res.ok) throw new Error('Failed to fetch months');
  return res.json();
}

export async function createLog(entry: LogEntryInput): Promise<LogEntry> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to create log');
  return res.json();
}

export async function updateLog(id: string, entry: Partial<LogEntryInput>): Promise<LogEntry> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to update log');
  return res.json();
}

export async function deleteLog(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete log');
}

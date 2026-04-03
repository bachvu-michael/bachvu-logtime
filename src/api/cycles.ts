import { authFetch } from '../utils/authFetch';
import type { CycleEntry, CycleEntryInput } from '../types';

export async function fetchCycles(params?: { year?: string; month?: string }): Promise<CycleEntry[]> {
  const qs = new URLSearchParams();
  if (params?.year)  qs.set('year', params.year);
  if (params?.month) qs.set('month', params.month);
  const query = qs.toString() ? '?' + qs.toString() : '';
  const res = await authFetch('/api/cycles' + query);
  return res.json();
}

export async function upsertCycle(input: CycleEntryInput): Promise<CycleEntry> {
  const res = await authFetch('/api/cycles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteCycle(id: string): Promise<void> {
  await authFetch(`/api/cycles/${id}`, { method: 'DELETE' });
}

export async function exportCycles(params?: { year?: string }): Promise<void> {
  const qs = new URLSearchParams();
  if (params?.year) qs.set('year', params.year);
  const query = qs.toString() ? '?' + qs.toString() : '';
  const res = await authFetch('/api/cycles/export' + query);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cycles-${params?.year ?? 'all'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

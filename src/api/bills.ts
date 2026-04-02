import { authFetch } from '../utils/authFetch';
import type { Bill, BillInput } from '../types';

export async function fetchBills(params?: { location?: string; year?: string }): Promise<Bill[]> {
  const qs = new URLSearchParams();
  if (params?.location) qs.set('location', params.location);
  if (params?.year)     qs.set('year', params.year);
  const query = qs.toString() ? '?' + qs.toString() : '';
  const res = await authFetch('/api/bills' + query);
  return res.json();
}

export async function createBill(input: BillInput): Promise<Bill> {
  const res = await authFetch('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateBill(id: string, input: Partial<BillInput>): Promise<Bill> {
  const res = await authFetch(`/api/bills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteBill(id: string): Promise<void> {
  await authFetch(`/api/bills/${id}`, { method: 'DELETE' });
}

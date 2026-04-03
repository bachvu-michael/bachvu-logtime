import { authFetch } from '../utils/authFetch';
import type { Bill, BillInput, BillName } from '../types';

export async function fetchBills(params?: { location?: string; year?: string; name?: string }): Promise<Bill[]> {
  const qs = new URLSearchParams();
  if (params?.location) qs.set('location', params.location);
  if (params?.year)     qs.set('year', params.year);
  if (params?.name)     qs.set('name', params.name);
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

export async function fetchBillNames(): Promise<BillName[]> {
  const res = await authFetch('/api/bill-names');
  return res.json();
}

export async function createBillName(name: string): Promise<BillName> {
  const res = await authFetch('/api/bill-names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteBillName(id: string): Promise<void> {
  await authFetch(`/api/bill-names/${id}`, { method: 'DELETE' });
}

export async function exportBills(params?: { location?: string; year?: string; name?: string }): Promise<void> {
  const qs = new URLSearchParams();
  if (params?.location) qs.set('location', params.location);
  if (params?.year)     qs.set('year', params.year);
  if (params?.name)     qs.set('name', params.name);
  const query = qs.toString() ? '?' + qs.toString() : '';
  const res = await authFetch('/api/bills/export' + query);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bills.json';
  a.click();
  URL.revokeObjectURL(url);
}

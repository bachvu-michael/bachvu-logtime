import { Invoice, InvoiceInput } from '../types';
import { authFetch } from '../utils/authFetch';

const BASE = '/api/invoices';

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await authFetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function fetchDomains(): Promise<string[]> {
  const res = await authFetch(`${BASE}/domains`);
  if (!res.ok) throw new Error('Failed to fetch domains');
  return res.json();
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create invoice');
  return res.json();
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput>): Promise<Invoice> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update invoice');
  return res.json();
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete invoice');
}

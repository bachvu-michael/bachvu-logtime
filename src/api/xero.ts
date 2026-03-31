import { authFetch } from '../utils/authFetch';

const BASE = '/api/xero';

export interface XeroStatus {
  connected: boolean;
  tenantId?: string;
  tenantName?: string;
  expiresAt?: number;
  missingConfig?: boolean;
  redirectUri?: string;
}

export interface XeroOrganisation {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

export async function fetchXeroStatus(): Promise<XeroStatus> {
  const res = await authFetch(`${BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch Xero status');
  return res.json();
}

export async function fetchXeroAuthUrl(): Promise<string> {
  const res = await authFetch(`${BASE}/auth-url`);
  if (!res.ok) throw new Error('Failed to get Xero auth URL');
  const data = await res.json();
  return data.url;
}

export async function disconnectXero(): Promise<void> {
  const res = await authFetch(`${BASE}/disconnect`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to disconnect Xero');
}

export async function fetchXeroOrganisations(): Promise<XeroOrganisation[]> {
  const res = await authFetch(`${BASE}/organisations`);
  if (!res.ok) throw new Error('Failed to fetch Xero organisations');
  return res.json();
}

export async function setXeroTenant(tenantId: string, tenantName: string): Promise<void> {
  const res = await authFetch(`${BASE}/set-tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, tenantName }),
  });
  if (!res.ok) throw new Error('Failed to set Xero organisation');
}

export async function syncXeroInvoices(invoiceIds: string[]): Promise<{ synced: number }> {
  const res = await authFetch(`${BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sync failed' }));
    throw new Error(err.error || 'Sync failed');
  }
  return res.json();
}

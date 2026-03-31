import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { Invoice } from '../../src/types/index.js';

const router = Router();

// Public router — only the OAuth callback (no auth middleware, browser redirect has no Bearer token)
export const xeroCallbackRouter = Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const XERO_CONFIG_FILE = path.join(DATA_DIR, 'xero-config.json');

interface XeroConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tenantId?: string;
  tenantName?: string;
}

interface XeroTenant {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readConfig(): XeroConfig | null {
  if (!fs.existsSync(XERO_CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(XERO_CONFIG_FILE, 'utf-8')) as XeroConfig;
  } catch {
    return null;
  }
}

function writeConfig(config: XeroConfig) {
  ensureDataDir();
  fs.writeFileSync(XERO_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function clearConfig() {
  if (fs.existsSync(XERO_CONFIG_FILE)) fs.unlinkSync(XERO_CONFIG_FILE);
}

function getClientId() { return process.env.XERO_CLIENT_ID || ''; }
function getClientSecret() { return process.env.XERO_CLIENT_SECRET || ''; }
function getRedirectUri() {
  return process.env.XERO_REDIRECT_URI || 'http://localhost:3001/api/xero/callback';
}

async function refreshTokenIfNeeded(config: XeroConfig): Promise<XeroConfig> {
  if (Date.now() < config.expiresAt - 60_000) return config;

  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refreshToken }).toString(),
  });

  if (!res.ok) {
    clearConfig();
    throw new Error('Xero token refresh failed — please reconnect');
  }

  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  const updated: XeroConfig = {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  writeConfig(updated);
  return updated;
}

// GET /api/xero/status
router.get('/status', (_req: Request, res: Response) => {
  const clientId = getClientId();
  if (!clientId) return res.json({ connected: false, missingConfig: true, redirectUri: getRedirectUri() });

  const config = readConfig();
  if (!config) return res.json({ connected: false, redirectUri: getRedirectUri() });

  res.json({
    connected: true,
    tenantId: config.tenantId,
    tenantName: config.tenantName,
    expiresAt: config.expiresAt,
    redirectUri: getRedirectUri(),
  });
});

// GET /api/xero/auth-url
router.get('/auth-url', (_req: Request, res: Response) => {
  const clientId = getClientId();
  if (!clientId) return res.status(400).json({ error: 'XERO_CLIENT_ID not configured' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: 'openid profile email accounting.invoices accounting.contacts',
    state: crypto.randomUUID(),
  });

  res.json({ url: `https://login.xero.com/identity/connect/authorize?${params.toString()}` });
});

// GET /api/xero/callback — Xero redirects here after OAuth (registered on public router)
xeroCallbackRouter.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const frontendBase = process.env.NODE_ENV === 'production'
    ? ''
    : (process.env.XERO_FRONTEND_URL || 'http://localhost:5173');

  if (error || !code) {
    return res.redirect(`${frontendBase}/?xero=error&reason=${encodeURIComponent(String(error || 'no_code'))}`);
  }

  try {
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: getRedirectUri(),
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.redirect(`${frontendBase}/?xero=error&reason=${encodeURIComponent(err)}`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Fetch connected organisations
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    let tenantId: string | undefined;
    let tenantName: string | undefined;
    if (connectionsRes.ok) {
      const connections = await connectionsRes.json() as XeroTenant[];
      if (connections.length > 0) {
        tenantId = connections[0].tenantId;
        tenantName = connections[0].tenantName;
      }
    }

    writeConfig({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      tenantId,
      tenantName,
    });

    res.redirect(`${frontendBase}/?xero=success`);
  } catch (e) {
    res.redirect(`${frontendBase}/?xero=error&reason=${encodeURIComponent(String(e))}`);
  }
});

// POST /api/xero/disconnect
router.post('/disconnect', (_req: Request, res: Response) => {
  clearConfig();
  res.json({ ok: true });
});

// GET /api/xero/organisations
router.get('/organisations', async (_req: Request, res: Response) => {
  let config = readConfig();
  if (!config) return res.status(401).json({ error: 'Not connected to Xero' });

  try {
    config = await refreshTokenIfNeeded(config);
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${config.accessToken}` },
    });

    if (!connectionsRes.ok) return res.status(400).json({ error: 'Failed to fetch organisations' });

    res.json(await connectionsRes.json());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/xero/set-tenant
router.post('/set-tenant', (req: Request, res: Response) => {
  const { tenantId, tenantName } = req.body as { tenantId: string; tenantName: string };
  const config = readConfig();
  if (!config) return res.status(401).json({ error: 'Not connected to Xero' });
  writeConfig({ ...config, tenantId, tenantName });
  res.json({ ok: true });
});

// POST /api/xero/sync
router.post('/sync', async (req: Request, res: Response) => {
  const { invoiceIds } = req.body as { invoiceIds: string[] };

  let config = readConfig();
  if (!config) return res.status(401).json({ error: 'Not connected to Xero' });
  if (!config.tenantId) return res.status(400).json({ error: 'No Xero organisation selected' });

  try {
    config = await refreshTokenIfNeeded(config);

    const invoicesFile = path.join(DATA_DIR, 'invoices.json');
    const allInvoices: Invoice[] = fs.existsSync(invoicesFile)
      ? JSON.parse(fs.readFileSync(invoicesFile, 'utf-8'))
      : [];

    const toSync = invoiceIds.length > 0
      ? allInvoices.filter(inv => invoiceIds.includes(inv.id))
      : allInvoices;

    if (toSync.length === 0) return res.status(400).json({ error: 'No invoices to sync' });

    const xeroInvoices = toSync.map(inv => ({
      Type: inv.invoiceType === 'credit_note' ? 'ACCRECCREDIT' : 'ACCREC',
      Contact: { Name: inv.domain || 'Unknown' },
      Date: inv.datetime,
      DueDate: inv.datetime,
      Status: 'AUTHORISED',
      Reference: inv.id.slice(0, 8),
      LineAmountTypes: 'EXCLUSIVE',
      LineItems: inv.items.map(item => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.price,
        AccountCode: '200',
      })),
    }));

    const syncRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Xero-Tenant-Id': config.tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ Invoices: xeroInvoices }),
    });

    if (!syncRes.ok) {
      const errText = await syncRes.text();
      return res.status(400).json({ error: `Xero API error: ${errText}` });
    }

    const result = await syncRes.json() as { Invoices?: unknown[] };
    res.json({ ok: true, synced: result.Invoices?.length ?? 0 });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;

import { useEffect, useState, useCallback } from 'react';
import {
  Alert, Button, Card, Checkbox, Divider, Select, Space,
  Spin, Table, Tag, Typography, Tooltip, message,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, CopyOutlined,
  DisconnectOutlined, LinkOutlined, SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Invoice } from '../types';
import { fetchInvoices } from '../api/invoices';
import {
  fetchXeroStatus, fetchXeroAuthUrl, disconnectXero,
  fetchXeroOrganisations, setXeroTenant, syncXeroInvoices,
  type XeroStatus, type XeroOrganisation,
} from '../api/xero';

const { Text, Title } = Typography;

function RedirectUriRow({ uri }: { uri?: string }) {
  const value = uri || 'http://localhost:3001/api/xero/callback';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <Text code style={{ flex: 1, wordBreak: 'break-all' }}>{value}</Text>
      <Tooltip title="Copy">
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => {
            navigator.clipboard.writeText(value);
            message.success('Copied!');
          }}
        />
      </Tooltip>
    </div>
  );
}

export function XeroPage() {
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [orgs, setOrgs] = useState<XeroOrganisation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const [st, invs] = await Promise.all([fetchXeroStatus(), fetchInvoices()]);
      setStatus(st);
      setInvoices(invs);
      if (st.connected) {
        setOrgs(await fetchXeroOrganisations());
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xeroParam = params.get('xero');
    if (xeroParam === 'success') {
      message.success('Connected to Xero successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (xeroParam === 'error') {
      message.error(`Xero connection failed: ${params.get('reason') || 'Unknown error'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    load();
  }, [load]);

  async function handleConnect() {
    try {
      const url = await fetchXeroAuthUrl();
      window.location.href = url;
    } catch (e) {
      message.error(String(e));
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectXero();
      setStatus({ connected: false });
      setOrgs([]);
      message.success('Disconnected from Xero');
    } catch (e) {
      message.error(String(e));
    }
  }

  async function handleSetTenant(tenantId: string) {
    const org = orgs.find(o => o.tenantId === tenantId);
    if (!org) return;
    try {
      await setXeroTenant(org.tenantId, org.tenantName);
      setStatus(prev => prev ? { ...prev, tenantId: org.tenantId, tenantName: org.tenantName } : prev);
    } catch (e) {
      message.error(String(e));
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await syncXeroInvoices(selectedIds);
      message.success(`Synced ${result.synced} invoice${result.synced !== 1 ? 's' : ''} to Xero`);
      setSelectedIds([]);
    } catch (e) {
      message.error(String(e));
    } finally {
      setSyncing(false);
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  }

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const indeterminate = selectedIds.length > 0 && !allSelected;

  const columns: ColumnsType<Invoice> = [
    {
      title: (
        <Checkbox
          indeterminate={indeterminate}
          checked={allSelected}
          onChange={e => setSelectedIds(e.target.checked ? invoices.map(i => i.id) : [])}
        />
      ),
      dataIndex: 'id',
      width: 44,
      render: (id: string) => (
        <Checkbox
          checked={selectedIds.includes(id)}
          onChange={e => toggleSelect(id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Client',
      dataIndex: 'domain',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'datetime',
      width: 110,
    },
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      width: 110,
      render: (v: string) => (
        <Tag color={v === 'credit_note' ? 'orange' : 'blue'}>
          {v === 'credit_note' ? 'Credit Note' : 'Invoice'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'paid' ? 'green' : v === 'overtime' ? 'red' : 'orange'}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => `${Math.round(v).toLocaleString('en-US')} đ`,
    },
  ];

  if (loading) return <Spin style={{ display: 'block', textAlign: 'center', padding: 80 }} />;

  return (
    <div className="page-content page-content--wide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Xero</h1>
          <p className="page-subtitle">Push invoices to your Xero accounting system</p>
        </div>
      </div>

      {error && <Alert type="error" description={error} showIcon style={{ borderRadius: 10 }} />}

      {status?.missingConfig && (
        <Alert
          type="warning"
          showIcon
          message="Xero credentials not configured"
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>
                Add <Text code>XERO_CLIENT_ID</Text> and <Text code>XERO_CLIENT_SECRET</Text> to your{' '}
                <Text code>.env</Text> file, then restart the server.
              </span>
              <span>
                Register your app at{' '}
                <a href="https://developer.xero.com/app/manage" target="_blank" rel="noreferrer">
                  developer.xero.com
                </a>{' '}
                and set the redirect URI to exactly:
              </span>
              <RedirectUriRow uri={status.redirectUri} />
            </div>
          }
          style={{ borderRadius: 10 }}
        />
      )}

      {/* Redirect URI reminder when connected or disconnected */}
      {status && !status.missingConfig && !status.connected && (
        <Alert
          type="info"
          showIcon
          message="Redirect URI — must be registered in your Xero app"
          description={<RedirectUriRow uri={status.redirectUri} />}
          style={{ borderRadius: 10 }}
        />
      )}

      {/* Connection status card */}
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {status?.connected
              ? <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              : <CloseCircleOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
            }
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {status?.connected ? 'Connected to Xero' : 'Not connected'}
              </Title>
              {status?.connected && status.tenantName && (
                <Text type="secondary">{status.tenantName}</Text>
              )}
            </div>
          </div>
          {status?.connected ? (
            <Button icon={<DisconnectOutlined />} danger onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={handleConnect}
              disabled={!!status?.missingConfig}
            >
              Connect to Xero
            </Button>
          )}
        </div>

        {status?.connected && orgs.length > 1 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text>Organisation:</Text>
              <Select
                style={{ minWidth: 220 }}
                value={status.tenantId}
                onChange={handleSetTenant}
                options={orgs.map(o => ({ value: o.tenantId, label: o.tenantName }))}
              />
            </div>
          </>
        )}
      </Card>

      {/* Invoice sync table */}
      {status?.connected && (
        <Card
          style={{ borderRadius: 12 }}
          title={
            <span>
              Invoices
              <Text type="secondary" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                ({invoices.length})
              </Text>
            </span>
          }
          extra={
            <Space>
              {selectedIds.length > 0 && (
                <Text type="secondary">{selectedIds.length} selected</Text>
              )}
              <Button
                type="primary"
                icon={<SyncOutlined spin={syncing} />}
                loading={syncing}
                disabled={invoices.length === 0 || !status.tenantId}
                onClick={handleSync}
              >
                {selectedIds.length > 0 ? `Sync ${selectedIds.length}` : 'Sync all'}
              </Button>
            </Space>
          }
        >
          {invoices.length === 0 ? (
            <Text type="secondary">No invoices found. Create invoices on the Invoices page first.</Text>
          ) : (
            <Table
              dataSource={invoices}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: false }}
            />
          )}
        </Card>
      )}

      {/* Empty state when not connected */}
      {status && !status.connected && !status.missingConfig && (
        <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: 12 }}>
          <div style={{ marginBottom: 16, color: '#64748B' }}>
            Connect your Xero account to push invoices directly from LogTime
          </div>
          <Button type="primary" size="large" icon={<LinkOutlined />} onClick={handleConnect}>
            Connect to Xero
          </Button>
        </Card>
      )}
    </div>
  );
}

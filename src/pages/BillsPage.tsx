import { useState, useEffect, useCallback } from 'react';
import { Button, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { Bill, BillInput, BillName, BILL_LOCATION_LABELS, BILL_LOCATIONS } from '../types';
import {
  fetchBills, createBill, updateBill, deleteBill,
  fetchBillNames, createBillName, exportBills,
} from '../api/bills';
import { BillSummary } from '../components/bills/BillSummary';
import { BillChart } from '../components/bills/BillChart';
import { BillTable } from '../components/bills/BillTable';
import { BillFormModal } from '../components/bills/BillFormModal';

const { Text } = Typography;

function currentYear() {
  return String(new Date().getFullYear());
}

function yearOptions() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2].map(yr => ({ value: String(yr), label: String(yr) }));
}

function IconBills() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}


export function BillsPage() {
  const [bills,      setBills]      = useState<Bill[]>([]);
  const [billNames,  setBillNames]  = useState<BillName[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [year,       setYear]       = useState(currentYear());
  const [location,   setLocation]   = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [modal, setModal] = useState<{ open: boolean; editing: Bill | null }>({
    open: false, editing: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBills({
        year,
        location:  location   || undefined,
        name:      nameFilter  || undefined,
      });
      setBills(data);
    } catch {
      message.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [year, location, nameFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchBillNames()
      .then(setBillNames)
      .catch(() => message.error('Failed to load bill names'));
  }, []);

  async function handleSave(input: BillInput) {
    if (modal.editing) {
      const updated = await updateBill(modal.editing.id, input);
      setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
      message.success('Bill updated');
    } else {
      const created = await createBill(input);
      setBills(prev => [created, ...prev]);
      message.success('Bill added');
    }
  }

  async function handleDelete(id: string) {
    await deleteBill(id);
    setBills(prev => prev.filter(b => b.id !== id));
    message.success('Bill deleted');
  }

  async function handleCreateName(name: string): Promise<BillName> {
    const created = await createBillName(name);
    setBillNames(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }

  async function handleExport() {
    try {
      await exportBills({
        year,
        location:  location   || undefined,
        name:      nameFilter  || undefined,
      });
    } catch {
      message.error('Failed to export bills');
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24, gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #4361EE 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(67,97,238,0.35)',
          }}>
            <IconBills />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
              Bills Analytics
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              Track and analyse electricity &amp; water spending
            </div>
          </div>
        </div>

        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ cursor: 'pointer' }}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModal({ open: true, editing: null })}
            style={{ cursor: 'pointer' }}
          >
            Add Bill
          </Button>
        </Space>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: '1px solid #F1F5F9',
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Year
          </Text>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: 90 }}
            options={yearOptions()}
          />
        </div>

        <div style={{ width: 1, height: 24, background: '#F1F5F9' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Name
          </Text>
          <Select
            value={nameFilter || 'all'}
            onChange={v => setNameFilter(v === 'all' ? '' : v)}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'All Names' },
              ...billNames.map(n => ({ value: n.name, label: n.name })),
            ]}
          />
        </div>

        <div style={{ width: 1, height: 24, background: '#F1F5F9' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Location
          </Text>
          <Select
            value={location || 'all'}
            onChange={v => setLocation(v === 'all' ? '' : v)}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'All Locations' },
              ...BILL_LOCATIONS.map(l => ({ value: l, label: BILL_LOCATION_LABELS[l] })),
            ]}
          />
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 12, color: '#94A3B8' }}>
            {loading ? 'Loading…' : `${bills.length} record${bills.length !== 1 ? 's' : ''} found`}
          </Text>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <BillSummary bills={bills} />

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <BillChart bills={bills} />

      {/* ── Data Table ──────────────────────────────────────────────────── */}
      <BillTable
        bills={bills}
        loading={loading}
        onEdit={bill => setModal({ open: true, editing: bill })}
        onDelete={handleDelete}
      />

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <BillFormModal
        open={modal.open}
        editing={modal.editing}
        billNames={billNames}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
        onCreateName={handleCreateName}
      />
    </div>
  );
}

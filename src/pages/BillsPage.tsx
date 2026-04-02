import { useState, useEffect, useCallback } from 'react';
import { Button, Select, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Bill, BillInput, BILL_LOCATION_LABELS, BILL_LOCATIONS } from '../types';
import { fetchBills, createBill, updateBill, deleteBill } from '../api/bills';
import { BillSummary } from '../components/bills/BillSummary';
import { BillChart } from '../components/bills/BillChart';
import { BillTable } from '../components/bills/BillTable';
import { BillFormModal } from '../components/bills/BillFormModal';

const { Title } = Typography;

function currentYear() {
  return String(new Date().getFullYear());
}

function yearOptions() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2].map(yr => ({ value: String(yr), label: String(yr) }));
}

export function BillsPage() {
  const [bills,    setBills]    = useState<Bill[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [year,     setYear]     = useState(currentYear());
  const [location, setLocation] = useState<string>('');
  const [modal,    setModal]    = useState<{ open: boolean; editing: Bill | null }>({
    open: false, editing: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBills({
        year,
        location: location || undefined,
      });
      setBills(data);
    } catch {
      message.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [year, location]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Bills</Title>
        <Space>
          <Select
            value={location || 'all'}
            onChange={v => setLocation(v === 'all' ? '' : v)}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'All Locations' },
              ...BILL_LOCATIONS.map(l => ({ value: l, label: BILL_LOCATION_LABELS[l] })),
            ]}
          />
          <Select
            value={year}
            onChange={setYear}
            style={{ width: 90 }}
            options={yearOptions()}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModal({ open: true, editing: null })}
          >
            Add Bill
          </Button>
        </Space>
      </div>

      {/* Summary cards */}
      <BillSummary bills={bills} />

      {/* Chart */}
      <BillChart bills={bills} />

      {/* Table */}
      <BillTable
        bills={bills}
        loading={loading}
        onEdit={bill => setModal({ open: true, editing: bill })}
        onDelete={handleDelete}
      />

      {/* Create / Edit modal */}
      <BillFormModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}

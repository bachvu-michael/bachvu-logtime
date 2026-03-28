import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Spin, Empty, Typography, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Invoice, InvoiceInput } from '../types';
import { fetchInvoices, fetchDomains, createInvoice, updateInvoice, deleteInvoice } from '../api/invoices';
import { InvoiceSummary } from '../components/invoice/InvoiceSummary';
import { InvoiceChart } from '../components/invoice/InvoiceChart';
import { InvoiceTable } from '../components/invoice/InvoiceTable';
import { InvoiceFormModal } from '../components/invoice/InvoiceFormModal';
import { InvoiceViewModal } from '../components/invoice/InvoiceViewModal';

export function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const [data, domainList] = await Promise.all([fetchInvoices(), fetchDomains()]);
      setInvoices(data);
      setDomains(domainList);
    } catch {
      setError('Cannot connect to server. Make sure the server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(input: InvoiceInput) {
    if (editing) {
      await updateInvoice(editing.id, input);
    } else {
      await createInvoice(input);
    }
    await load();
  }

  async function handleDelete(id: string) {
    await deleteInvoice(id);
    await load();
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setFormOpen(true);
  }

  const totalRevenue = invoices
    .filter(inv => (inv.invoiceType ?? 'invoice') === 'invoice')
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="page-content page-content--wide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            {invoices.length > 0
              ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} · Total ${Math.round(totalRevenue).toLocaleString('en-US')} đ`
              : 'Manage and export your invoices'}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Invoice
        </Button>
      </div>

      {error && (
        <Alert type="error" description={error} showIcon style={{ borderRadius: 10 }} />
      )}

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 80 }} />
      ) : invoices.length === 0 ? (
        <Empty
          description="No invoices yet — create your first invoice"
          style={{ padding: '100px 0', color: '#64748B' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Invoice
          </Button>
        </Empty>
      ) : (
        <>
          <InvoiceSummary invoices={invoices} />
          <InvoiceChart invoices={invoices} />
          <InvoiceTable
            invoices={invoices}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
            onView={inv => setViewing(inv)}
          />
        </>
      )}

      <InvoiceFormModal
        open={formOpen}
        editing={editing}
        domains={domains}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <InvoiceViewModal
        invoice={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

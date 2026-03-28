import { Modal, Table, Typography, Divider, Space, Button, Tag } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Invoice, InvoiceItem, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../../types';
import { useState } from 'react';
import { exportInvoicePDF } from './exportInvoicePDF';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

const columns: ColumnsType<InvoiceItem> = [
  { title: 'Description', dataIndex: 'description', ellipsis: true },
  {
    title: 'Price (đ)',
    dataIndex: 'price',
    width: 140,
    align: 'right',
    render: (v: number) => Math.round(v).toLocaleString('en-US'),
  },
  { title: 'Qty', dataIndex: 'quantity', width: 70, align: 'center' },
  {
    title: 'Amount (đ)',
    width: 140,
    align: 'right',
    render: (_, r) => (
      <Typography.Text strong>{Math.round(r.price * r.quantity).toLocaleString('en-US')}</Typography.Text>
    ),
  },
];

export function InvoiceViewModal({ invoice, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!invoice) return;
    setDownloading(true);
    try { await exportInvoicePDF(invoice); } finally { setDownloading(false); }
  }

  if (!invoice) return null;
  return (
    <Modal
      open={!!invoice}
      title={
        <Space>
          <span>Invoice</span>
          <Tag color="blue">{invoice.domain}</Tag>
          <Tag color={INVOICE_STATUS_COLORS[invoice.status ?? 'pending']}>{INVOICE_STATUS_LABELS[invoice.status ?? 'pending']}</Tag>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{invoice.datetime}</Typography.Text>
        </Space>
      }
      onCancel={onClose}
      footer={
        <Space>
          <Button icon={<FilePdfOutlined />} type="primary" loading={downloading} onClick={handleDownload}>
            Download PDF
          </Button>
          <Button onClick={onClose}>Close</Button>
        </Space>
      }
      width={620}
    >
      <Table
        dataSource={invoice.items}
        columns={columns}
        rowKey={(_, i) => String(i)}
        pagination={false}
        size="small"
        style={{ marginTop: 16 }}
      />
      <Divider style={{ margin: '16px 0 8px' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space direction="vertical" align="end">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>TOTAL DUE</Typography.Text>
          <Typography.Text strong style={{ fontSize: 24, color: '#4361EE' }}>
            {Math.round(invoice.total).toLocaleString('en-US')} đ
          </Typography.Text>
        </Space>
      </div>
    </Modal>
  );
}

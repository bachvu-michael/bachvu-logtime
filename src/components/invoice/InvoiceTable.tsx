import { Table, Button, Space, Popconfirm, Tag, Typography, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { Invoice, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../../types';

import { exportInvoicePDF, previewInvoice } from './exportInvoicePDF';

interface Props {
  invoices: Invoice[];
  loading: boolean;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onView: (invoice: Invoice) => void;
}

function getDateColor(dateStr: string, status: Invoice['status']): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);

  if (d.getFullYear() !== today.getFullYear() && status === 'paid') return '#94a3b8'; // grey — paid, another year

  if (d < today) return '#dc2626'; // red — any past date

  const sameMonth = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  if (sameMonth) return '#d97706'; // yellow — this month, future day

  return '#16a34a'; // green — future date, not this month
}

export function InvoiceTable({ invoices, loading, onEdit, onDelete, onView }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(record: Invoice) {
    setDownloading(record.id);
    try {
      await exportInvoicePDF(record);
    } finally {
      setDownloading(null);
    }
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Date',
      dataIndex: 'datetime',
      width: 120,
      sorter: (a, b) => a.datetime.localeCompare(b.datetime),
      defaultSortOrder: 'descend',
      render: (date: string, record) => (
        <Typography.Text strong style={{ color: getDateColor(date, record.status) }}>
          {date}
        </Typography.Text>
      ),
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      render: (domain: string, record) => (
        <Space size={4}>
          <Tag color="blue">{domain}</Tag>
          {(record.invoiceType ?? 'invoice') === 'credit_note' && (
            <Tag color="default">Credit Note</Tag>
          )}
        </Space>
      ),
      sorter: (a, b) => a.domain.localeCompare(b.domain),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (status: Invoice['status']) => {
        const s = status ?? 'pending';
        return <Tag color={INVOICE_STATUS_COLORS[s]}>{INVOICE_STATUS_LABELS[s]}</Tag>;
      },
      filters: [
        { text: 'Pending',  value: 'pending' },
        { text: 'Paid',     value: 'paid' },
        { text: 'Overtime', value: 'overtime' },
      ],
      onFilter: (value, record) => (record.status ?? 'pending') === value,
    },
    {
      title: 'Items',
      dataIndex: 'items',
      width: 100,
      render: (_, record) => (
        <Typography.Text type="secondary">
          {record.items.length} item{record.items.length !== 1 ? 's' : ''}
        </Typography.Text>
      ),
    },
    {
      title: 'Days Left',
      dataIndex: 'datetime',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.datetime.localeCompare(b.datetime),
      render: (date: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
        if (diff < 0) return null;
        if (diff === 0) return <Tag color="green">Today</Tag>;
        return <Typography.Text type="secondary">{diff}d</Typography.Text>;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.total - b.total,
      render: (total: number) => (
        <Typography.Text strong style={{ color: '#4361EE', fontSize: 15 }}>
          {Math.round(total).toLocaleString('en-US')} đ
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Preview in browser">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => previewInvoice(record)} />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text" size="small" icon={<FilePdfOutlined />}
              loading={downloading === record.id}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete this invoice?"
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={invoices}
      columns={columns}
      rowKey="id"
      loading={loading}
      size="middle"
      pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
    />
  );
}

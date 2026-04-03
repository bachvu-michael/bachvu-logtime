import { Table, Tag, Button, Popconfirm, Space, Typography } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Bill,
  BILL_TYPE_LABELS, BILL_TYPE_COLORS,
  BILL_LOCATION_LABELS,
} from '../../types';

const { Text } = Typography;

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

interface Props {
  bills:    Bill[];
  loading:  boolean;
  onEdit:   (bill: Bill) => void;
  onDelete: (id: string) => void;
}

export function BillTable({ bills, loading, onEdit, onDelete }: Props) {
  const maxAmount = Math.max(...bills.map(b => b.amount), 1);

  const columns: ColumnsType<Bill> = [
    {
      title:     'Bill Month',
      dataIndex: 'billMonth',
      key:       'billMonth',
      sorter:    (a, b) => a.billMonth.localeCompare(b.billMonth),
      defaultSortOrder: 'descend',
      width: 120,
    },
    {
      title:  'Type',
      key:    'billType',
      width:  100,
      render: (_, r) => (
        <Tag color={BILL_TYPE_COLORS[r.billType]}>{BILL_TYPE_LABELS[r.billType]}</Tag>
      ),
      filters: [
        { text: 'Electric', value: 'electric' },
        { text: 'Water',    value: 'water' },
      ],
      onFilter: (v, r) => r.billType === v,
    },
    {
      title:  'Name',
      key:    'name',
      width:  140,
      render: (_, r) => r.name
        ? <Text style={{ fontWeight: 500 }}>{r.name}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title:  'Location',
      key:    'location',
      width:  120,
      render: (_, r) => BILL_LOCATION_LABELS[r.location],
      filters: [
        { text: 'Home',        value: 'home' },
        { text: 'Rental Room', value: 'room' },
        { text: 'Other',       value: 'other' },
      ],
      onFilter: (v, r) => r.location === v,
    },
    {
      title:  'Amount',
      key:    'amount',
      width:  180,
      align:  'right' as const,
      render: (_, r) => {
        const pct = Math.round((r.amount / maxAmount) * 100);
        return (
          <div>
            <Text strong style={{ display: 'block', textAlign: 'right', marginBottom: 4 }}>
              {fmtVnd(r.amount)}
            </Text>
            <div style={{
              height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 2,
                background: r.billType === 'electric'
                  ? 'linear-gradient(90deg, #F97316, #EF4444)'
                  : 'linear-gradient(90deg, #0EA5E9, #3B82F6)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        );
      },
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title:     'Paid Date',
      dataIndex: 'paidDate',
      key:       'paidDate',
      width:     120,
    },
    {
      title:     'Note',
      dataIndex: 'note',
      key:       'note',
      ellipsis:  true,
      render:    (v: string | undefined) => v
        ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title:  'Actions',
      key:    'actions',
      width:  90,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(r)}
            style={{ cursor: 'pointer' }}
          />
          <Popconfirm
            title="Delete this bill?"
            onConfirm={() => onDelete(r.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ cursor: 'pointer' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={bills}
      loading={loading}
      pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} records` }}
      size="small"
    />
  );
}

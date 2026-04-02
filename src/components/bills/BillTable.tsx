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
      title:  'Location',
      key:    'location',
      width:  120,
      render: (_, r) => BILL_LOCATION_LABELS[r.location],
      filters: [
        { text: 'Home',        value: 'home' },
        { text: 'Office',      value: 'office' },
        { text: 'Rental Room', value: 'room' },
        { text: 'Other',       value: 'other' },
      ],
      onFilter: (v, r) => r.location === v,
    },
    {
      title:  'Amount',
      key:    'amount',
      width:  140,
      align:  'right',
      render: (_, r) => <Text strong>{fmtVnd(r.amount)}</Text>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title:     'Paid Date',
      dataIndex: 'paidDate',
      key:       'paidDate',
      width:     120,
    },
    {
      title:  'Note',
      dataIndex: 'note',
      key:    'note',
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title:  'Actions',
      key:    'actions',
      width:  90,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
          <Popconfirm
            title="Delete this bill?"
            onConfirm={() => onDelete(r.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
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
      pagination={{ pageSize: 20, showSizeChanger: false }}
      size="small"
    />
  );
}

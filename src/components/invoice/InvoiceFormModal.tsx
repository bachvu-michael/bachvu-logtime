import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, InputNumber, DatePicker, Button, Select, Segmented, Space, Divider, AutoComplete, Typography,
  Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Invoice, InvoiceInput, InvoiceItem, InvoiceType, InvoiceStatus, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../../types';

interface Props {
  open: boolean;
  editing: Invoice | null;
  domains: string[];
  onClose: () => void;
  onSave: (input: InvoiceInput) => Promise<void>;
}

const emptyItem = (): InvoiceItem => ({ description: '', price: 0, quantity: 1 });

const DEFAULT_ITEMS: InvoiceItem[] = [
  { description: 'tên miền', price: 1_200_000, quantity: 1 },
  { description: 'hosting', price: 1_200_000, quantity: 1 },
];

function fmtVND(v: number | string | undefined) {
  if (v === undefined || v === '') return '';
  return Math.round(Number(v)).toLocaleString('en-US');
}

function parseVND(v: string | undefined) {
  if (!v) return 0;
  return Number(v.replace(/,/g, '')) || 0;
}

export function InvoiceFormModal({ open, editing, domains, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [description, setDescription] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('invoice');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({ domain: editing.domain, datetime: dayjs(editing.datetime), status: editing.status ?? 'pending' });
        setInvoiceType(editing.invoiceType ?? 'invoice');
        setDescription(editing.description ?? '');
        setItems(editing.items.length > 0 ? editing.items : [emptyItem()]);
      } else {
        form.setFieldsValue({ domain: '', datetime: dayjs(), status: 'pending' });
        setInvoiceType('invoice');
        setDescription('');
        setItems(DEFAULT_ITEMS.map(i => ({ ...i })));
      }
    }
  }, [open, editing, form]);

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);

  async function handleOk() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await onSave({
        domain: values.domain,
        datetime: (values.datetime as dayjs.Dayjs).format('YYYY-MM-DD'),
        invoiceType,
        description,
        status: values.status as InvoiceStatus,
        items,
        total: Math.round(total),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit Invoice' : 'New Invoice'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={editing ? 'Save' : 'Create'}
      width={640}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, marginTop: 8 }}>
        <Segmented
          value={invoiceType}
          onChange={v => setInvoiceType(v as InvoiceType)}
          options={[
            { label: 'Invoice', value: 'invoice' },
            { label: 'Credit Note', value: 'credit_note' },
          ]}
          block
        />
      </div>

      <Form form={form} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px', gap: 12 }}>
          <Form.Item name="domain" label="Domain / Client" rules={[{ required: true, message: 'Required' }]}>
            <AutoComplete
              options={domains.map(d => ({ value: d }))}
              filterOption={(input, option) =>
                (option?.value as string).toLowerCase().includes(input.toLowerCase())
              }
              placeholder="e.g. acme.com"
            />
          </Form.Item>
          <Form.Item name="datetime" label="Date" rules={[{ required: true, message: 'Required' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(s => (
                <Select.Option key={s} value={s}>
                  <Tag color={INVOICE_STATUS_COLORS[s]} style={{ margin: 0 }}>{INVOICE_STATUS_LABELS[s]}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      </Form>

      <Divider orientation="left" plain style={{ margin: '8px 0 12px' }}>Items</Divider>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 32px', gap: 8, padding: '0 0 4px' }}>
          {['Description', 'Price (đ)', 'Qty', ''].map(h => (
            <Typography.Text key={h} type="secondary" style={{ fontSize: 12 }}>{h}</Typography.Text>
          ))}
        </div>

        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 32px', gap: 8 }}>
            <Input
              value={item.description}
              onChange={e => updateItem(i, 'description', e.target.value)}
              placeholder="Description"
            />
            <InputNumber
              value={item.price}
              onChange={v => updateItem(i, 'price', v ?? 0)}
              min={0}
              precision={0}
              formatter={fmtVND}
              parser={parseVND}
              style={{ width: '100%' }}
            />
            <InputNumber
              value={item.quantity}
              onChange={v => updateItem(i, 'quantity', v ?? 1)}
              min={0}
              precision={0}
              style={{ width: '100%' }}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              style={{ padding: 0 }}
            />
          </div>
        ))}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} style={{ marginTop: 4 }}>
          Add Item
        </Button>
      </div>

      <Divider orientation="left" plain style={{ margin: '16px 0 12px' }}>Note</Divider>
      <Input.TextArea
        rows={3}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="e.g. Gia hạn website từ tháng 05/2026 đến tháng 05/2027"
        style={{ resize: 'none' }}
      />

      <Divider style={{ margin: '16px 0 8px' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Typography.Text type="secondary">Total:</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>
            {Math.round(total).toLocaleString('en-US')} đ
          </Typography.Text>
        </Space>
      </div>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, Input, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Bill, BillInput, BillName,
  BILL_TYPE_LABELS, BILL_LOCATION_LABELS, BILL_LOCATIONS,
} from '../../types';

interface Props {
  open:          boolean;
  editing:       Bill | null;
  billNames:     BillName[];
  onClose:       () => void;
  onSave:        (input: BillInput) => Promise<void>;
  onCreateName:  (name: string) => Promise<BillName>;
}

export function BillFormModal({ open, editing, billNames, onClose, onSave, onCreateName }: Props) {
  const [form] = Form.useForm<BillInput & { paidDateDayjs: dayjs.Dayjs; billMonthDayjs: dayjs.Dayjs }>();
  const [newNameInput, setNewNameInput] = useState('');
  const [addingName, setAddingName]     = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        billType:       editing.billType,
        location:       editing.location,
        name:           editing.name,
        amount:         editing.amount,
        billMonthDayjs: dayjs(editing.billMonth + '-01'),
        paidDateDayjs:  dayjs(editing.paidDate),
        note:           editing.note ?? '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        billType:       'electric',
        location:       'home',
        paidDateDayjs:  dayjs(),
        billMonthDayjs: dayjs(),
      });
    }
    setNewNameInput('');
  }, [open, editing, form]);

  async function handleAddName() {
    if (!newNameInput.trim()) return;
    setAddingName(true);
    try {
      const created = await onCreateName(newNameInput.trim());
      form.setFieldValue('name', created.name);
      setNewNameInput('');
    } finally {
      setAddingName(false);
    }
  }

  async function handleOk() {
    const values = await form.validateFields();
    await onSave({
      billType:  values.billType,
      location:  values.location,
      name:      values.name || undefined,
      amount:    values.amount,
      billMonth: values.billMonthDayjs.format('YYYY-MM'),
      paidDate:  values.paidDateDayjs.format('YYYY-MM-DD'),
      note:      values.note || undefined,
    });
    onClose();
  }

  return (
    <Modal
      title={editing ? 'Edit Bill' : 'Add Bill'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={editing ? 'Save' : 'Add'}
      width={460}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="billType" label="Type" rules={[{ required: true }]}>
          <Select options={
            (['electric', 'water'] as const).map(v => ({ value: v, label: BILL_TYPE_LABELS[v] }))
          } />
        </Form.Item>

        <Form.Item name="location" label="Location" rules={[{ required: true }]}>
          <Select options={
            BILL_LOCATIONS.map(v => ({ value: v, label: BILL_LOCATION_LABELS[v] }))
          } />
        </Form.Item>

        <Form.Item name="name" label="Name">
          <Select
            allowClear
            showSearch
            placeholder="Select or add a name"
            options={billNames.map(n => ({ value: n.name, label: n.name }))}
            dropdownRender={menu => (
              <>
                {menu}
                <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="New name..."
                      value={newNameInput}
                      onChange={e => setNewNameInput(e.target.value)}
                      onPressEnter={handleAddName}
                      size="small"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddName}
                      loading={addingName}
                      size="small"
                    >
                      Add
                    </Button>
                  </Space.Compact>
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="amount" label="Amount (₫)" rules={[{ required: true, type: 'number', min: 0 }]}>
          <InputNumber
            style={{ width: '100%' }}
            formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
            parser={v => Number(v?.replace(/[^\d]/g, '') ?? 0)}
            min={0}
            step={1000}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="billMonthDayjs" label="Bill Month" style={{ flex: 1 }} rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: '100%' }} format="YYYY-MM" />
          </Form.Item>

          <Form.Item name="paidDateDayjs" label="Paid Date" style={{ flex: 1 }} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Note">
          <Input.TextArea rows={2} placeholder="Optional note..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

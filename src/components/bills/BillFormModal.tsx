import { useEffect } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import {
  Bill, BillInput,
  BILL_TYPE_LABELS, BILL_LOCATION_LABELS, BILL_LOCATIONS,
} from '../../types';

interface Props {
  open:     boolean;
  editing:  Bill | null;
  onClose:  () => void;
  onSave:   (input: BillInput) => Promise<void>;
}

export function BillFormModal({ open, editing, onClose, onSave }: Props) {
  const [form] = Form.useForm<BillInput & { paidDateDayjs: dayjs.Dayjs; billMonthDayjs: dayjs.Dayjs }>();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        billType:       editing.billType,
        location:       editing.location,
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
  }, [open, editing, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onSave({
      billType:  values.billType,
      location:  values.location,
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

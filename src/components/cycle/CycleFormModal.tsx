import { useEffect } from 'react';
import { Modal, Form, Select, Switch, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  CycleEntry, CycleEntryInput,
  CYCLE_BLEEDING_LABELS, CYCLE_BLEEDING_OPTIONS,
  CYCLE_MUCUS_LABELS, CYCLE_MUCUS_OPTIONS,
  CYCLE_SENSATION_LABELS, CYCLE_SENSATION_OPTIONS,
} from '../../types';

interface Props {
  open:    boolean;
  date?:   string;         // pre-filled date (YYYY-MM-DD)
  editing: CycleEntry | null;
  onClose: () => void;
  onSave:  (input: CycleEntryInput) => Promise<void>;
}

export function CycleFormModal({ open, date, editing, onClose, onSave }: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        date:      dayjs(editing.date),
        bleeding:  editing.bleeding,
        mucus:     editing.mucus,
        sensation: editing.sensation,
        isPeakDay: editing.isPeakDay,
        note:      editing.note ?? '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        date:      date ? dayjs(date) : dayjs(),
        bleeding:  'none',
        mucus:     'none',
        sensation: 'dry',
        isPeakDay: false,
      });
    }
  }, [open, editing, date, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onSave({
      date:      values.date.format('YYYY-MM-DD'),
      bleeding:  values.bleeding,
      mucus:     values.mucus,
      sensation: values.sensation,
      isPeakDay: values.isPeakDay ?? false,
      note:      values.note || undefined,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Chỉnh sửa ngày' : 'Ghi lại ngày'}
      onOk={handleOk}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Huỷ"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item name="bleeding" label="Kinh nguyệt / Ra máu">
          <Select options={CYCLE_BLEEDING_OPTIONS.map(v => ({ value: v, label: CYCLE_BLEEDING_LABELS[v] }))} />
        </Form.Item>

        <Form.Item name="mucus" label="Chất nhầy (Billings)">
          <Select options={CYCLE_MUCUS_OPTIONS.map(v => ({ value: v, label: CYCLE_MUCUS_LABELS[v] }))} />
        </Form.Item>

        <Form.Item name="sensation" label="Cảm giác">
          <Select options={CYCLE_SENSATION_OPTIONS.map(v => ({ value: v, label: CYCLE_SENSATION_LABELS[v] }))} />
        </Form.Item>

        <Form.Item name="isPeakDay" label="Ngày đỉnh (Peak day)" valuePropName="checked">
          <Switch checkedChildren="Có" unCheckedChildren="Không" />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Thêm ghi chú..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

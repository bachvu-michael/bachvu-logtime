import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, TimePicker,
  Button, Space, Popconfirm, ColorPicker, Divider, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  PersonalEvent, PersonalEventInput, EventType,
  EVENT_REMINDER_LABELS, EVENT_TYPE_PALETTE,
} from '../../types';
import { createEventType, deleteEventType } from '../../api/events';

interface Props {
  open:      boolean;
  date?:     string;
  editing:   PersonalEvent | null;
  types:     EventType[];
  onClose:   () => void;
  onSave:    (input: PersonalEventInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onTypesChange: (types: EventType[]) => void;
}

const REMINDER_OPTIONS = (Object.keys(EVENT_REMINDER_LABELS) as (keyof typeof EVENT_REMINDER_LABELS)[])
  .map(k => ({ value: k, label: EVENT_REMINDER_LABELS[k] }));

export function EventFormModal({ open, date, editing, types, onClose, onSave, onDelete, onTypesChange }: Props) {
  const [form] = Form.useForm();
  const [newTypeName,  setNewTypeName]  = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3B82F6');
  const [addingType, setAddingType] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        title:       editing.title,
        date:        dayjs(editing.date),
        time:        editing.time ? dayjs(editing.time, 'HH:mm') : null,
        eventType:   editing.eventType,
        description: editing.description ?? '',
        reminder:    editing.reminder,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        date:     date ? dayjs(date) : dayjs(),
        reminder: 'none',
        eventType: types[0]?.name ?? undefined,
      });
    }
  }, [open, editing, date, types, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onSave({
      title:       values.title.trim(),
      date:        values.date.format('YYYY-MM-DD'),
      time:        values.time ? values.time.format('HH:mm') : undefined,
      eventType:   values.eventType,
      description: values.description?.trim() || undefined,
      reminder:    values.reminder,
      completed:   editing?.completed ?? false,
    });
    onClose();
  }

  async function handleAddType() {
    if (!newTypeName.trim()) return;
    try {
      const created = await createEventType(newTypeName.trim(), newTypeColor);
      onTypesChange([...types, created]);
      form.setFieldValue('eventType', created.name);
      setNewTypeName('');
      setNewTypeColor('#3B82F6');
      setAddingType(false);
    } catch {
      message.error('Không thể thêm loại sự kiện');
    }
  }

  async function handleDeleteType(type: EventType) {
    try {
      await deleteEventType(type.id);
      onTypesChange(types.filter(t => t.id !== type.id));
    } catch {
      message.error('Không thể xoá loại sự kiện');
    }
  }

  const typeDropdown = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '6px 0' }} />
      {addingType ? (
        <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input
              size="small"
              placeholder="Tên loại mới"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              onPressEnter={handleAddType}
              style={{ flex: 1 }}
            />
            <ColorPicker
              size="small"
              value={newTypeColor}
              onChange={c => setNewTypeColor(c.toHexString())}
              presets={[{ label: 'Màu gợi ý', colors: EVENT_TYPE_PALETTE }]}
            />
          </div>
          <Space>
            <Button size="small" type="primary" onClick={handleAddType}>Thêm</Button>
            <Button size="small" onClick={() => setAddingType(false)}>Huỷ</Button>
          </Space>
        </div>
      ) : (
        <div
          style={{ padding: '6px 10px', cursor: 'pointer', color: '#4361EE', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setAddingType(true)}
        >
          <PlusOutlined /> Thêm loại mới
        </div>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      title={editing ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện'}
      onOk={handleOk}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Huỷ"
      destroyOnClose
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editing && onDelete ? (
            <Popconfirm title="Xoá sự kiện này?" onConfirm={() => { onDelete(editing.id); onClose(); }} okText="Xoá" cancelText="Huỷ">
              <Button danger size="small" icon={<DeleteOutlined />}>Xoá</Button>
            </Popconfirm>
          ) : <span />}
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
          <Input placeholder="Tên sự kiện" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="time" label="Giờ (tuỳ chọn)" style={{ flex: 1 }}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={15} />
          </Form.Item>
        </div>

        <Form.Item name="eventType" label="Loại sự kiện" rules={[{ required: true }]}>
          <Select
            dropdownRender={typeDropdown}
            options={types.map(t => ({
              value: t.name,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                  {t.name}
                  {types.length > 1 && (
                    <span
                      style={{ marginLeft: 'auto', color: '#CBD5E1', cursor: 'pointer', fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); handleDeleteType(t); }}
                    >✕</span>
                  )}
                </div>
              ),
            }))}
          />
        </Form.Item>

        <Form.Item name="reminder" label="Nhắc nhở">
          <Select options={REMINDER_OPTIONS} />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

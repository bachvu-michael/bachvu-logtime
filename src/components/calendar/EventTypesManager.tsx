import { useState } from 'react';
import {
  Button, Input, ColorPicker, Popconfirm, Typography, message, Empty,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { EventType, EVENT_TYPE_PALETTE } from '../../types';
import { createEventType, updateEventType, deleteEventType } from '../../api/events';

const { Text } = Typography;

interface Props {
  types: EventType[];
  onChange: (types: EventType[]) => void;
}

export function EventTypesManager({ types, onChange }: Props) {
  const [adding,    setAdding]    = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newColor,  setNewColor]  = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('');

  // ── Add ──────────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      const created = await createEventType(newName.trim(), newColor);
      onChange([...types, created]);
      setNewName('');
      setNewColor('#3B82F6');
      setAdding(false);
      message.success('Đã thêm loại sự kiện');
    } catch {
      message.error('Không thể thêm loại sự kiện');
    }
  }

  // ── Edit color ───────────────────────────────────────────────────────────
  function startEdit(type: EventType) {
    setEditingId(type.id);
    setEditColor(type.color);
  }

  async function confirmEdit(type: EventType) {
    try {
      const updated = await updateEventType(type.id, editColor);
      onChange(types.map(t => t.id === updated.id ? updated : t));
      setEditingId(null);
      message.success('Đã cập nhật màu');
    } catch {
      message.error('Không thể cập nhật');
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      await deleteEventType(id);
      onChange(types.filter(t => t.id !== id));
      message.success('Đã xoá');
    } catch {
      message.error('Không thể xoá loại sự kiện');
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {/* ── List ── */}
      {types.length === 0 ? (
        <Empty description="Chưa có loại sự kiện" style={{ padding: '40px 0' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {types.map(t => {
            const isEditing = editingId === t.id;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', border: '1px solid #F1F5F9',
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}
              >
                {/* Color swatch / picker */}
                {isEditing ? (
                  <ColorPicker
                    value={editColor}
                    onChange={c => setEditColor(c.toHexString())}
                    presets={[{ label: 'Màu gợi ý', colors: EVENT_TYPE_PALETTE }]}
                    size="small"
                  />
                ) : (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: t.color, flexShrink: 0,
                    boxShadow: `0 0 0 2px ${t.color}33`,
                  }} />
                )}

                <Text style={{ flex: 1, fontWeight: 500 }}>{t.name}</Text>

                {/* Actions */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => confirmEdit(t)}>
                      Lưu
                    </Button>
                    <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingId(null)}>
                      Huỷ
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      size="small" type="text" icon={<EditOutlined />}
                      onClick={() => startEdit(t)}
                      style={{ color: '#64748B' }}
                    />
                    <Popconfirm
                      title="Xoá loại sự kiện này?"
                      description="Các sự kiện thuộc loại này sẽ không bị xoá."
                      onConfirm={() => handleDelete(t.id)}
                      okText="Xoá" cancelText="Huỷ"
                      disabled={types.length <= 1}
                    >
                      <Button
                        size="small" type="text" danger icon={<DeleteOutlined />}
                        disabled={types.length <= 1}
                      />
                    </Popconfirm>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add form ── */}
      {adding ? (
        <div style={{
          background: '#F8FAFC', border: '1px dashed #CBD5E1',
          borderRadius: 10, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ColorPicker
              value={newColor}
              onChange={c => setNewColor(c.toHexString())}
              presets={[{ label: 'Màu gợi ý', colors: EVENT_TYPE_PALETTE }]}
              size="small"
            />
            <Input
              placeholder="Tên loại sự kiện"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onPressEnter={handleAdd}
              style={{ flex: 1 }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" size="small" onClick={handleAdd} disabled={!newName.trim()}>
              Thêm
            </Button>
            <Button size="small" onClick={() => { setAdding(false); setNewName(''); }}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <Button
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
          style={{ borderStyle: 'dashed' }}
          block
        >
          Thêm loại mới
        </Button>
      )}
    </div>
  );
}

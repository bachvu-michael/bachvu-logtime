import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { PersonalEvent, EventType, isActiveReminder, EVENT_REMINDER_LABELS } from '../../types';
import { fetchReminderEvents, completeEvent, fetchEventTypes } from '../../api/events';

const { Text } = Typography;

function typeColor(types: EventType[], typeName: string) {
  return types.find(t => t.name === typeName)?.color ?? '#64748B';
}

export function ReminderBanner() {
  const [events, setEvents]     = useState<PersonalEvent[]>([]);
  const [types,  setTypes]      = useState<EventType[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const [evs, tps] = await Promise.all([fetchReminderEvents(), fetchEventTypes()]);
      setEvents(evs);
      setTypes(tps);
    } catch {
      // silent — don't break other pages
    }
  }, []);

  useEffect(() => {
    load();
    // re-check every 10 minutes
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const active = events.filter(e => isActiveReminder(e, today) && !dismissed.has(e.id));

  if (active.length === 0) return null;

  async function handleComplete(event: PersonalEvent) {
    try {
      await completeEvent(event.id);
      setEvents(prev => prev.filter(e => e.id !== event.id));
    } catch {
      setDismissed(prev => new Set([...prev, event.id]));
    }
  }

  function handleDismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {active.map(ev => {
        const isMissed = ev.reminder === 'on_miss';
        const color    = typeColor(types, ev.eventType);
        return (
          <Alert
            key={ev.id}
            type={isMissed ? 'error' : 'warning'}
            showIcon
            icon={<BellOutlined style={{ color: isMissed ? '#EF4444' : '#F59E0B' }} />}
            message={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space size={8} wrap>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: color, flexShrink: 0,
                  }} />
                  <Text strong style={{ fontSize: 13 }}>{ev.title}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {ev.eventType} · {ev.date}{ev.time ? ` ${ev.time}` : ''}
                  </Text>
                  <Text style={{ fontSize: 11, color: isMissed ? '#EF4444' : '#D97706' }}>
                    {isMissed ? '⚠ Đã bỏ lỡ' : EVENT_REMINDER_LABELS[ev.reminder]}
                  </Text>
                </Space>
                <Space size={6}>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => handleComplete(ev)}
                    style={{ fontSize: 11 }}
                  >
                    Hoàn tất
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleDismiss(ev.id)}
                    style={{ fontSize: 11, color: '#94A3B8' }}
                  >
                    Bỏ qua
                  </Button>
                </Space>
              </div>
            }
            description={ev.description && (
              <Text style={{ fontSize: 11, color: '#64748B' }}>{ev.description}</Text>
            )}
            style={{ borderRadius: 10 }}
          />
        );
      })}
    </div>
  );
}

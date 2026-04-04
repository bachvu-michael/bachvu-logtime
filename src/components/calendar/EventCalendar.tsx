import { useMemo } from 'react';
import { Tooltip, Badge } from 'antd';
import { CheckCircleOutlined, BellOutlined } from '@ant-design/icons';
import { PersonalEvent, EventType, EVENT_REMINDER_LABELS, isActiveReminder } from '../../types';

interface Props {
  year:       number;
  month:      number;
  events:     PersonalEvent[];
  types:      EventType[];
  onDayClick: (date: string) => void;
  onEventClick: (event: PersonalEvent) => void;
}

const WEEKDAYS   = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function typeColor(types: EventType[], name: string): string {
  return types.find(t => t.name === name)?.color ?? '#64748B';
}

function EventTooltip({ event, color }: { event: PersonalEvent; color: string }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>{event.title}</span>
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>📅 {event.date}{event.time ? ` · ${event.time}` : ''}</span>
        <span>🏷 {event.eventType}</span>
        {event.reminder !== 'none' && <span>🔔 {EVENT_REMINDER_LABELS[event.reminder]}</span>}
        {event.completed && <span style={{ color: '#10B981' }}>✓ Đã hoàn tất</span>}
        {event.description && <span>📝 {event.description}</span>}
      </div>
    </div>
  );
}

export function EventCalendar({ year, month, events, types, onDayClick, onEventClick }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const eventsByDate = useMemo(() => {
    const map: Record<string, PersonalEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay    = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0 … Sun=6
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 10, textAlign: 'center' }}>
        {MONTH_NAMES[month - 1]} {year}
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 600,
            color: d === 'CN' || d === 'T7' ? '#EF4444' : '#94A3B8', padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((date, i) => {
          if (!date) return <div key={i} style={{ minHeight: 80 }} />;
          const dayNum    = parseInt(date.split('-')[2]);
          const dayEvents = eventsByDate[date] ?? [];
          const isToday   = date === today;
          const isPast    = date < today;
          const isSat     = i % 7 === 5;
          const isSunday  = i % 7 === 6;
          const hasActiveReminder = dayEvents.some(e => isActiveReminder(e, today));

          return (
            <div
              key={date}
              onClick={() => onDayClick(date)}
              style={{
                minHeight: 80,
                borderRadius: 8,
                border: isToday ? '2px solid #4361EE' : (isSat || isSunday) ? '1px solid #FEE2E2' : '1px solid #F1F5F9',
                background: isToday ? '#F0F4FF' : (isSat || isSunday) ? (isPast ? '#FFF5F5' : '#FFF8F8') : isPast ? '#FAFAFA' : '#fff',
                padding: '4px 6px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(67,97,238,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              {/* Day number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#4361EE' : isSunday || isSat ? '#EF4444' : isPast ? '#94A3B8' : '#0F172A',
                  width: 22, height: 22,
                  background: isToday ? '#4361EE' : 'transparent',
                  color: isToday ? '#fff' : undefined,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                } as React.CSSProperties}>
                  {dayNum}
                </span>
                {hasActiveReminder && (
                  <BellOutlined style={{ fontSize: 10, color: '#F59E0B' }} />
                )}
              </div>

              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.slice(0, 3).map(ev => {
                  const color = typeColor(types, ev.eventType);
                  return (
                    <Tooltip
                      key={ev.id}
                      title={<EventTooltip event={ev} color={color} />}
                      placement="right"
                    >
                      <div
                        onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                        style={{
                          fontSize: 10, lineHeight: '16px',
                          background: ev.completed ? '#F1F5F9' : color + '22',
                          borderLeft: `2.5px solid ${ev.completed ? '#CBD5E1' : color}`,
                          color: ev.completed ? '#94A3B8' : '#0F172A',
                          borderRadius: 3, padding: '0 4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          textDecoration: ev.completed ? 'line-through' : 'none',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        {ev.completed && <CheckCircleOutlined style={{ fontSize: 9, color: '#10B981', flexShrink: 0 }} />}
                        {ev.time && <span style={{ fontWeight: 600, color: ev.completed ? '#CBD5E1' : color }}>{ev.time}</span>}
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                      </div>
                    </Tooltip>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 10, color: '#94A3B8', paddingLeft: 4 }}>
                    +{dayEvents.length - 3} khác
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

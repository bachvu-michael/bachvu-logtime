import { useState, useMemo } from 'react';
import { Calendar, Card, Tag, Button, Radio, Space, Typography, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  ThunderboltOutlined, TeamOutlined, CoffeeOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import { LogEntry, TEAMWORK_TYPE_LABELS, TAKEOFF_LABELS } from '../../types';
import { minutesToDisplay } from '../../utils/dateHelpers';

type ViewMode = 'month' | 'week';

function entryMinutes(log: LogEntry): number {
  return (log.hours ?? 0) * 60 + (log.minutes ?? 0);
}

function eventColors(log: LogEntry): { bg: string; border: string; color: string } {
  if (log.taskType === 'takeoff')  return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08' };
  if (log.taskType === 'teamwork') return { bg: '#f9f0ff', border: '#d3adf7', color: '#531dab' };
  return { bg: '#e6f4ff', border: '#91caff', color: '#0958d9' };
}

function eventIcon(log: LogEntry) {
  if (log.taskType === 'takeoff')  return <CoffeeOutlined />;
  if (log.taskType === 'teamwork') return <TeamOutlined />;
  return <ThunderboltOutlined />;
}

function eventLabel(log: LogEntry): string {
  if (log.taskType === 'takeoff')  return TAKEOFF_LABELS[log.takeoffPeriod ?? 'full'];
  if (log.taskType === 'teamwork') return log.teamworkType ? TEAMWORK_TYPE_LABELS[log.teamworkType] : 'Teamwork';
  return log.ticketKey || log.title || '—';
}

/** Compact chip for month calendar cells */
function EventChip({ log }: { log: LogEntry }) {
  const { bg, border, color } = eventColors(log);
  const label = eventLabel(log);
  const mins  = entryMinutes(log);
  const tooltipText = `${label}${log.title && log.taskType !== 'takeoff' ? ' · ' + log.title : ''} — ${minutesToDisplay(mins)}`;
  return (
    <Tooltip title={tooltipText}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        background: bg, border: `1px solid ${border}`, borderRadius: 4,
        padding: '1px 5px', marginBottom: 2, fontSize: 11, cursor: 'default',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}>
        <span style={{ color, flexShrink: 0 }}>{eventIcon(log)}</span>
        <span style={{ color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 72 }}>
          {label}
        </span>
        <span style={{ color, marginLeft: 'auto', fontSize: 10, flexShrink: 0 }}>
          {minutesToDisplay(mins)}
        </span>
      </div>
    </Tooltip>
  );
}

/** Full event card for week view */
function EventCard({ log }: { log: LogEntry }) {
  const { bg, border, color } = eventColors(log);
  const label = eventLabel(log);
  const mins  = entryMinutes(log);
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 6,
      padding: '5px 7px', marginBottom: 4, fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color, flexShrink: 0 }}>{eventIcon(log)}</span>
        <span style={{
          color, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {label}
        </span>
        <span style={{ color, fontWeight: 600, fontSize: 11, flexShrink: 0 }}>
          {minutesToDisplay(mins)}
        </span>
      </div>
      {log.title && log.taskType !== 'takeoff' && (
        <div style={{
          color: '#595959', fontSize: 11, paddingLeft: 18, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {log.title}
        </div>
      )}
    </div>
  );
}

/** Monday of the week containing `date` */
function weekMonday(date: Dayjs): Dayjs {
  const d = date.day(); // 0 = Sunday
  return date.subtract(d === 0 ? 6 : d - 1, 'day');
}

interface Props { logs: LogEntry[] }

export function CalendarView({ logs }: Props) {
  const [mode, setMode]       = useState<ViewMode>('month');
  const [current, setCurrent] = useState<Dayjs>(dayjs());
  const todayStr = dayjs().format('YYYY-MM-DD');

  const logsByDate = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs) {
      const arr = map.get(log.date) ?? [];
      arr.push(log);
      map.set(log.date, arr);
    }
    return map;
  }, [logs]);

  // Month cell renderer for AntD Calendar
  const cellRender = (date: Dayjs, info: { type: string; originNode: React.ReactNode }) => {
    if (info.type !== 'date') return info.originNode;
    const dateStr = date.format('YYYY-MM-DD');
    const entries = logsByDate.get(dateStr) ?? [];
    if (!entries.length) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {entries.slice(0, 3).map(log => (
          <li key={log.id}><EventChip log={log} /></li>
        ))}
        {entries.length > 3 && (
          <li style={{ fontSize: 10, color: '#8c8c8c', paddingLeft: 4 }}>
            +{entries.length - 3} more
          </li>
        )}
      </ul>
    );
  };

  const nav = (delta: number) => {
    if (mode === 'month') setCurrent(c => c.add(delta, 'month'));
    else                  setCurrent(c => c.add(delta * 7, 'day'));
  };

  const wkStart   = weekMonday(current);
  const weekDays  = Array.from({ length: 7 }, (_, i) => wkStart.add(i, 'day'));

  const headerTitle = mode === 'month'
    ? current.format('MMMM YYYY')
    : `${wkStart.format('MMM D')} – ${wkStart.add(6, 'day').format('MMM D, YYYY')}`;

  return (
    <Card
      title={
        <Space size={8}>
          <Button icon={<LeftOutlined />}  size="small" onClick={() => nav(-1)} />
          <Typography.Text strong style={{ minWidth: 190, textAlign: 'center', display: 'inline-block' }}>
            {headerTitle}
          </Typography.Text>
          <Button icon={<RightOutlined />} size="small" onClick={() => nav(1)} />
          <Button size="small" onClick={() => setCurrent(dayjs())}>Today</Button>
        </Space>
      }
      extra={
        <Radio.Group size="small" value={mode} onChange={e => setMode(e.target.value as ViewMode)}>
          <Radio.Button value="month">Month</Radio.Button>
          <Radio.Button value="week">Week</Radio.Button>
        </Radio.Group>
      }
      styles={{ header: { fontWeight: 600 } }}
    >
      {mode === 'month' ? (
        <Calendar
          value={current}
          cellRender={cellRender}
          headerRender={() => null}
          onPanelChange={date => setCurrent(date)}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          background: '#e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {weekDays.map(day => {
            const dateStr   = day.format('YYYY-MM-DD');
            const entries   = logsByDate.get(dateStr) ?? [];
            const isToday   = dateStr === todayStr;
            const totalMins = entries.reduce((s, l) => s + entryMinutes(l), 0);
            return (
              <div key={dateStr} style={{ background: isToday ? '#f0f4ff' : '#fff', padding: '8px 6px', minHeight: 160 }}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {day.format('ddd')}
                  </Typography.Text>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isToday ? '#4361EE' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '2px auto 4px',
                  }}>
                    <Typography.Text strong style={{ fontSize: 14, color: isToday ? '#fff' : undefined }}>
                      {day.format('D')}
                    </Typography.Text>
                  </div>
                  {totalMins > 0 && (
                    <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                      {minutesToDisplay(totalMins)}
                    </Tag>
                  )}
                </div>
                {entries.map(log => <EventCard key={log.id} log={log} />)}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { Card, Empty, Space, Segmented, DatePicker } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Dayjs } from 'dayjs';
import { LogEntry } from '../../types';
import { toTimePerDay, TaskSeries } from '../../utils/chartDataTransformers';

type FilterMode = '30d' | '60d' | '90d' | 'all' | 'custom';

const FILTER_OPTIONS = [
  { value: '30d',    label: '30 days' },
  { value: '60d',    label: '60 days' },
  { value: '90d',    label: '90 days' },
  { value: 'all',    label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

interface TooltipPayloadItem { name: string; value: number; color: string }
interface TooltipProps { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(p => p.value > 0);
  if (!visible.length) return null;
  const total = visible.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)', minWidth: 160 }}>
      <p style={{ margin: '0 0 6px', color: '#8c8c8c', fontSize: 12 }}>{label}</p>
      {visible.map(p => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontSize: 12 }}>
          <span style={{ fontWeight: 600 }}>{p.name}</span>
          <span style={{ float: 'right', marginLeft: 16 }}>{p.value}h</span>
        </p>
      ))}
      {visible.length > 1 && (
        <p style={{ margin: '6px 0 0', borderTop: '1px solid #f0f0f0', paddingTop: 4, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
          Total<span style={{ float: 'right' }}>{Math.round(total * 100) / 100}h</span>
        </p>
      )}
    </div>
  );
}

function renderLegend(series: TaskSeries[]) {
  if (!series.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8, fontSize: 12 }}>
      {series.map(s => (
        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

export function TimePerDayChart({ logs }: { logs: LogEntry[] }) {
  const [filterMode, setFilterMode] = useState<FilterMode>('30d');
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const filterParam = useMemo(() => {
    if (filterMode === 'all') return 'all' as const;
    if (filterMode === 'custom') {
      if (customRange[0] && customRange[1]) {
        return { start: customRange[0].format('YYYY-MM-DD'), end: customRange[1].format('YYYY-MM-DD') };
      }
      return 'all' as const;
    }
    return { days: filterMode === '30d' ? 30 : filterMode === '60d' ? 60 : 90 };
  }, [filterMode, customRange]);

  const { rows, series } = useMemo(() => toTimePerDay(logs, filterParam), [logs, filterParam]);

  return (
    <Card
      title="Time / Day"
      styles={{ header: { fontWeight: 600 } }}
      extra={
        logs.length > 0 && (
          <Space wrap size={8}>
            <Segmented
              size="small"
              value={filterMode}
              options={FILTER_OPTIONS}
              onChange={v => { setFilterMode(v as FilterMode); setCustomRange([null, null]); }}
            />
            {filterMode === 'custom' && (
              <DatePicker.RangePicker
                size="small"
                value={customRange}
                onChange={range => setCustomRange(range ? [range[0], range[1]] : [null, null])}
                format="MMM D, YYYY"
                style={{ width: 240 }}
              />
            )}
          </Space>
        )
      }
    >
      {logs.length === 0 ? (
        <Empty description="No data yet" style={{ padding: '40px 0' }} />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} maxBarSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="h" width={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend content={() => null} />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  stackId="day"
                  fill={s.color}
                  radius={i === series.length - 1 ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          {renderLegend(series)}
        </>
      )}
    </Card>
  );
}

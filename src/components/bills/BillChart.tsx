import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, Empty, Row, Col } from 'antd';
import { Bill, BILL_NAME_COLORS, getBillNameColor } from '../../types';

interface Props {
  bills: Bill[];
}

function buildChartData(bills: Bill[]) {
  const nameSet = new Set<string>();
  for (const b of bills) nameSet.add(b.name ?? b.billType);
  const allNames = [...nameSet].sort();

  const monthMap: Record<string, Record<string, number>> = {};
  for (const b of bills) {
    const key = b.name ?? b.billType;
    if (!monthMap[b.billMonth]) monthMap[b.billMonth] = {};
    monthMap[b.billMonth][key] = (monthMap[b.billMonth][key] ?? 0) + b.amount;
  }

  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));

  return { data, allNames };
}

function buildTrendData(bills: Bill[]) {
  const monthMap: Record<string, number> = {};
  for (const b of bills) {
    monthMap[b.billMonth] = (monthMap[b.billMonth] ?? 0) + b.amount;
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

function fmtVnd(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.92)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#E2E8F0',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function StackedTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff', fontSize: 13 }}>{label}</div>
      {[...payload].reverse().map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, display: 'inline-block' }} />
            {p.name}
          </span>
          <span style={{ fontWeight: 600, color: '#fff' }}>{p.value?.toLocaleString('vi-VN')}₫</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 8, paddingTop: 8, fontWeight: 700, color: '#60A5FA', display: 'flex', justifyContent: 'space-between' }}>
        <span>Total</span>
        <span>{total.toLocaleString('vi-VN')}₫</span>
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff', fontSize: 13 }}>{label}</div>
      <div style={{ color: '#60A5FA', fontWeight: 600, fontSize: 14 }}>
        {payload[0]?.value?.toLocaleString('vi-VN')}₫
      </div>
    </div>
  );
}

export function BillChart({ bills }: Props) {
  const { data, allNames } = buildChartData(bills);
  const trendData = buildTrendData(bills);
  const avg = trendData.length
    ? Math.round(trendData.reduce((s, d) => s + d.total, 0) / trendData.length)
    : 0;

  if (!data.length) {
    return (
      <Card
        title={<span style={{ fontWeight: 600 }}>Monthly Bills</span>}
        style={{ marginBottom: 16 }}
      >
        <Empty description="No data" />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {/* Stacked breakdown */}
      <Col xs={24} lg={16}>
        <Card
          style={{ height: '100%' }}
          title={
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Bill Breakdown</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400, marginTop: 2 }}>
                Monthly spending by name
              </div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtVnd}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(67,97,238,0.05)' }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="square"
                iconSize={8}
              />
              {allNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="stack"
                  fill={getBillNameColor(allNames, name)}
                  radius={i === allNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Monthly trend */}
      <Col xs={24} lg={8}>
        <Card
          style={{ height: '100%' }}
          title={
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Monthly Trend</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400, marginTop: 2 }}>
                Total per month vs avg
              </div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4361EE" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4361EE" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtVnd}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#4361EE', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{ value: `Avg: ${fmtVnd(avg)}`, position: 'right', fontSize: 10, fill: '#94A3B8' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#4361EE"
                strokeWidth={2.5}
                fill="url(#trendGradient)"
                dot={{ r: 3, fill: '#4361EE', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5, fill: '#4361EE', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

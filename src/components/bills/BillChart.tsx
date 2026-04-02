import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card, Empty } from 'antd';
import { Bill, BILL_TYPE_HEX } from '../../types';

interface Props {
  bills: Bill[];
}

function buildChartData(bills: Bill[]) {
  const monthMap: Record<string, { electric: number; water: number }> = {};
  for (const b of bills) {
    if (!monthMap[b.billMonth]) monthMap[b.billMonth] = { electric: 0, water: 0 };
    monthMap[b.billMonth][b.billType] += b.amount;
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));
}

function fmtVnd(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

export function BillChart({ bills }: Props) {
  const data = buildChartData(bills);

  if (!data.length) {
    return (
      <Card title="Monthly Bills" style={{ marginBottom: 16 }}>
        <Empty description="No data" />
      </Card>
    );
  }

  return (
    <Card title="Monthly Bills" style={{ marginBottom: 16 }}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={fmtVnd} tick={{ fontSize: 12 }} width={52} />
          <Tooltip
            formatter={(val: number, name: string) => [
              val.toLocaleString('vi-VN') + '₫',
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          <Legend />
          <Bar dataKey="electric" name="Electric" fill={BILL_TYPE_HEX.electric} radius={[3, 3, 0, 0]} />
          <Bar dataKey="water"    name="Water"    fill={BILL_TYPE_HEX.water}    radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

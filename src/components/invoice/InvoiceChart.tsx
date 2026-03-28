import { useMemo } from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Invoice } from '../../types';

interface Props {
  invoices: Invoice[];
}

function fmtVND(v: number) {
  return Math.round(v).toLocaleString('en-US') + ' đ';
}

const ITEM_COLORS = [
  '#4361EE', '#7C3AED', '#0EA5E9', '#F97316', '#10B981',
  '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#EC4899',
];

export function InvoiceChart({ invoices }: Props) {
  const billable = invoices.filter(inv => (inv.invoiceType ?? 'invoice') === 'invoice');

  // Stacked bar: year × item description
  const { yearlyData, itemKeys } = useMemo(() => {
    // Collect all unique item descriptions
    const keySet = new Set<string>();
    for (const inv of billable) {
      for (const item of inv.items) {
        if (item.description) keySet.add(item.description);
      }
    }
    const keys = [...keySet].sort();

    // Aggregate: year → { [description]: total }
    const map = new Map<string, Record<string, number>>();
    for (const inv of billable) {
      const year = inv.datetime.slice(0, 4);
      if (!map.has(year)) map.set(year, {});
      const entry = map.get(year)!;
      for (const item of inv.items) {
        const desc = item.description || '(other)';
        entry[desc] = (entry[desc] ?? 0) + item.price * item.quantity;
      }
    }

    const data = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, totals]) => ({
        year,
        ...Object.fromEntries(
          Object.entries(totals).map(([k, v]) => [k, Math.round(v)])
        ),
      }));

    return { yearlyData: data, itemKeys: keys };
  }, [billable]);

  const domainData = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of billable) {
      map.set(inv.domain, (map.get(inv.domain) ?? 0) + inv.total);
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, total]) => ({ domain, total: Math.round(total) }));
  }, [billable]);

  if (billable.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Revenue by Year" size="small" style={{ borderRadius: 10 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={yearlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} width={70} tickFormatter={v => (v / 1_000_000).toFixed(0) + 'M'} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtVND(v), name]}
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {itemKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="year"
                fill={ITEM_COLORS[i % ITEM_COLORS.length]}
                radius={i === itemKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Revenue by Domain" size="small" style={{ borderRadius: 10 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={domainData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => (v / 1_000_000).toFixed(0) + 'M'} />
            <YAxis dataKey="domain" type="category" tick={{ fontSize: 12, fill: '#64748B' }} width={120} />
            <Tooltip
              formatter={(v: number) => [fmtVND(v), 'Total']}
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
            />
            <Bar dataKey="total" fill="#7C3AED" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

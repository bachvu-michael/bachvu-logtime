import { Card, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TicketData } from '../../utils/chartDataTransformers';

const KIND_COLOR: Record<string, string> = {
  jira:     '#1677ff',
  teamwork: '#722ed1',
  takeoff:  '#fa8c16',
};

interface TooltipProps { active?: boolean; payload?: Array<{ value: number; payload: TicketData }> }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{item.ticketId}</p>
      {item.kind === 'jira' && item.title && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>{item.title}</p>
      )}
      <p style={{ margin: '4px 0 0', color: KIND_COLOR[item.kind] }}>{payload[0].value}h</p>
    </div>
  );
}

export function TimePerTicketChart({ data }: { data: TicketData[] }) {
  return (
    <Card title="Time / Ticket" styles={{ header: { fontWeight: 600 } }}>
      {data.length === 0 ? (
        <Empty description="No data yet" style={{ padding: '40px 0' }} />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(data.length * 36 + 40, 200)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f5" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="h" />
            <YAxis type="category" dataKey="ticketId" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry) => <Cell key={entry.ticketId} fill={KIND_COLOR[entry.kind]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

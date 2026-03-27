import { Card, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProjectData } from '../../utils/chartDataTransformers';

const COLORS = ['#1677ff', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#fadb14', '#f5222d'];

interface TooltipProps { active?: boolean; payload?: Array<{ name: string; value: number; payload: ProjectData }> }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{d.name}</p>
      <p style={{ margin: 0, color: '#1677ff' }}>{d.value}h · {d.payload.percent}%</p>
    </div>
  );
}

export function TimePerProjectChart({ data }: { data: ProjectData[] }) {
  return (
    <Card title="Time per Project" styles={{ header: { fontWeight: 600 } }}>
      {data.length === 0 ? (
        <Empty description="No data yet" style={{ padding: '40px 0' }} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="hours" nameKey="category" cx="50%" cy="44%" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {data.map((entry, i) => <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12, color: '#595959' }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

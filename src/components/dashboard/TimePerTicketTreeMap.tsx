import { Card, Empty } from 'antd';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { TicketData } from '../../utils/chartDataTransformers';

const KIND_COLOR: Record<string, string> = {
  jira: '#1677ff',
  teamwork: '#722ed1',
  takeoff: '#fa8c16',
};

const KIND_COLOR_LIGHT: Record<string, string> = {
  jira: '#e6f4ff',
  teamwork: '#f9f0ff',
  takeoff: '#fff7e6',
};

interface TooltipProps { active?: boolean; payload?: Array<{ payload: TicketData & { value: number } }> }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{item.ticketId}</p>
      {item.kind === 'jira' && item.title && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666', maxWidth: 240 }}>{item.title}</p>
      )}
      <p style={{ margin: '4px 0 0', color: KIND_COLOR[item.kind] }}>{item.hours}h</p>
    </div>
  );
}

interface CustomContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  kind?: string;
  hours?: number;
}

function CustomContent({ x = 0, y = 0, width = 0, height = 0, name, kind = 'jira', hours }: CustomContentProps) {
  const color = KIND_COLOR[kind] ?? KIND_COLOR.jira;
  const bg = KIND_COLOR_LIGHT[kind] ?? KIND_COLOR_LIGHT.jira;
  const showLabel = width > 40 && height > 28;
  const showHours = width > 55 && height > 44;

  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={6} ry={6}
        fill={bg} stroke={color} strokeWidth={1.5} />
      {showLabel && (
        <text x={x + width / 2} y={y + height / 2 - (showHours ? 8 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.min(13, Math.max(9, width / 8))}
          fontWeight={600} fill={color}>
          {name}
        </text>
      )}
      {showHours && (
        <text x={x + width / 2} y={y + height / 2 + 10}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.min(11, Math.max(8, width / 10))}
          fill={color} opacity={0.8}>
          {hours}h
        </text>
      )}
    </g>
  );
}

export function TimePerTicketTreeMap({ data }: { data: TicketData[] }) {
  console.log('TimePerTicketTreeMap data:', data);
  const treeData = data.map(d => ({
    name: d.ticketId,
    value: d.hours,
    hours: d.hours,
    kind: d.kind,
    title: d.title,
    ticketId: d.ticketId,
  }));

  return (
    <Card title="Time / Ticket (TreeMap)" styles={{ header: { fontWeight: 600 } }}>
      {data.length === 0 ? (
        <Empty description="No data yet" style={{ padding: '40px 0' }} />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <Treemap
            data={treeData}
            dataKey="value"
            aspectRatio={4 / 3}
            fill="#8884d8"
            content={<CustomContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

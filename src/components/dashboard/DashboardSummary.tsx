import { Row, Col, Card } from 'antd';
import { ClockCircleOutlined, TagsOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { LogEntry } from '../../types';
import { formatHoursMinutes } from '../../utils/dateHelpers';

interface StatProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  variant: 'blue' | 'purple' | 'teal' | 'orange';
}

function StatCard({ label, value, sub, icon, variant }: StatProps) {
  return (
    <Card className={`stat-card stat-card--${variant}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__sub">{sub}</div>
    </Card>
  );
}

export function DashboardSummary({ logs }: { logs: LogEntry[] }) {
  const totalHours     = logs.reduce((s, l) => s + (l.timeSpent ?? (l.hours + l.minutes / 60)), 0);
  const jiraTickets    = new Set(logs.filter(l => l.ticketKey).map(l => l.ticketKey)).size;
  const teamworkTasks  = logs.filter(l => !l.ticketKey).length;
  const uniqueDays     = new Set(logs.map(l => l.date)).size;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard
          label="Total Hours"
          value={formatHoursMinutes(totalHours)}
          sub={`${totalHours.toFixed(1)} hours logged`}
          icon={<ClockCircleOutlined />}
          variant="blue"
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Jira Tickets"
          value={jiraTickets}
          sub="unique tickets"
          icon={<TagsOutlined />}
          variant="purple"
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Days Worked"
          value={uniqueDays}
          sub="days with entries"
          icon={<CalendarOutlined />}
          variant="teal"
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Teamwork"
          value={teamworkTasks}
          sub="task entries"
          icon={<TeamOutlined />}
          variant="orange"
        />
      </Col>
    </Row>
  );
}

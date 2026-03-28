import { Row, Col, Card } from 'antd';
import { FileTextOutlined, GlobalOutlined, DollarOutlined } from '@ant-design/icons';
import { Invoice } from '../../types';

interface StatProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  variant: 'blue' | 'purple' | 'teal';
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

export function InvoiceSummary({ invoices }: { invoices: Invoice[] }) {
  const billable      = invoices.filter(inv => (inv.invoiceType ?? 'invoice') === 'invoice');
  const totalRevenue  = billable.reduce((s, inv) => s + inv.total, 0);
  const uniqueClients = new Set(billable.map(inv => inv.domain)).size;
  const thisYear      = new Date().getFullYear().toString();
  const yearRevenue   = billable
    .filter(inv => inv.datetime.startsWith(thisYear))
    .reduce((s, inv) => s + inv.total, 0);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <StatCard
          label="Total Revenue"
          value={`${Math.round(totalRevenue).toLocaleString('en-US')} đ`}
          sub={`${billable.length} invoice${billable.length !== 1 ? 's' : ''} total`}
          icon={<DollarOutlined />}
          variant="blue"
        />
      </Col>
      <Col xs={24} md={8}>
        <StatCard
          label={`Revenue ${thisYear}`}
          value={`${Math.round(yearRevenue).toLocaleString('en-US')} đ`}
          sub={`invoices in ${thisYear}`}
          icon={<FileTextOutlined />}
          variant="purple"
        />
      </Col>
      <Col xs={24} md={8}>
        <StatCard
          label="Clients"
          value={uniqueClients}
          sub="unique domains"
          icon={<GlobalOutlined />}
          variant="teal"
        />
      </Col>
    </Row>
  );
}

import { Row, Col, Card } from 'antd';
import { Bill } from '../../types';

interface Props {
  bills: Bill[];
}

function fmtVnd(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M₫';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K₫';
  return n.toLocaleString('vi-VN') + '₫';
}

function IconTotal() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconDrop() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function BillSummary({ bills }: Props) {
  const total    = bills.reduce((s, b) => s + b.amount, 0);
  const electric = bills.filter(b => b.billType === 'electric').reduce((s, b) => s + b.amount, 0);
  const water    = bills.filter(b => b.billType === 'water').reduce((s, b) => s + b.amount, 0);
  const months   = [...new Set(bills.map(b => b.billMonth))];
  const avgMonth = months.length ? Math.round(total / months.length) : 0;

  const electricPct = total ? Math.round((electric / total) * 100) : 0;
  const waterPct    = total ? Math.round((water    / total) * 100) : 0;

  const cards = [
    {
      variant: 'blue',
      icon: <IconTotal />,
      label: 'Total Spending',
      value: fmtVnd(total),
      sub: `${bills.length} records · ${months.length} month${months.length !== 1 ? 's' : ''}`,
    },
    {
      variant: 'orange',
      icon: <IconBolt />,
      label: 'Electric',
      value: fmtVnd(electric),
      sub: total ? `${electricPct}% of total` : 'No data',
    },
    {
      variant: 'teal',
      icon: <IconDrop />,
      label: 'Water',
      value: fmtVnd(water),
      sub: total ? `${waterPct}% of total` : 'No data',
    },
    {
      variant: 'purple',
      icon: <IconCalendar />,
      label: 'Avg / Month',
      value: fmtVnd(avgMonth),
      sub: months.length ? `Over ${months.length} month${months.length !== 1 ? 's' : ''}` : 'No data',
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {cards.map(c => (
        <Col xs={12} sm={6} key={c.label}>
          <Card className={`stat-card stat-card--${c.variant}`} bordered={false}>
            <div className="stat-card__icon">{c.icon}</div>
            <div className="stat-card__label">{c.label}</div>
            <div className="stat-card__value">{c.value}</div>
            <div className="stat-card__sub">{c.sub}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

import { Row, Col, Card, Statistic } from 'antd';
import { ThunderboltOutlined, DropboxOutlined, DollarOutlined, FileOutlined } from '@ant-design/icons';
import { Bill, BILL_TYPE_HEX } from '../../types';

interface Props {
  bills: Bill[];
}

export function BillSummary({ bills }: Props) {
  const total    = bills.reduce((s, b) => s + b.amount, 0);
  const electric = bills.filter(b => b.billType === 'electric').reduce((s, b) => s + b.amount, 0);
  const water    = bills.filter(b => b.billType === 'water').reduce((s, b) => s + b.amount, 0);

  const months   = [...new Set(bills.map(b => b.billMonth))];
  const avgMonth = months.length ? Math.round(total / months.length) : 0;

  function fmtVnd(n: number) {
    return n.toLocaleString('vi-VN') + '₫';
  }

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Total"
            value={fmtVnd(total)}
            prefix={<DollarOutlined style={{ color: '#4361EE' }} />}
            valueStyle={{ fontSize: 18 }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Electric"
            value={fmtVnd(electric)}
            prefix={<ThunderboltOutlined style={{ color: BILL_TYPE_HEX.electric }} />}
            valueStyle={{ fontSize: 18, color: BILL_TYPE_HEX.electric }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Water"
            value={fmtVnd(water)}
            prefix={<DropboxOutlined style={{ color: BILL_TYPE_HEX.water }} />}
            valueStyle={{ fontSize: 18, color: BILL_TYPE_HEX.water }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Avg / Month"
            value={fmtVnd(avgMonth)}
            prefix={<FileOutlined style={{ color: '#64748B' }} />}
            valueStyle={{ fontSize: 18 }}
          />
        </Card>
      </Col>
    </Row>
  );
}

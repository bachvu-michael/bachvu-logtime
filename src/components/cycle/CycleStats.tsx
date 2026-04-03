import { useMemo } from 'react';
import { Card, Row, Col, Table, Tag, Alert } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { CycleEntry } from '../../types';
import { computeCycles, CycleInfo } from '../../utils/cycleUtils';

interface Props {
  entries: CycleEntry[];
  year:    number;
}

function StatCard({ label, value, sub, color = '#4361EE' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card size="small" style={{ textAlign: 'center', border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{sub}</div>}
    </Card>
  );
}

/** Custom tooltip for the cycle chart */
function CycleChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: CycleChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#EC4899' }}>Chu kỳ {d.cycleIndex}</div>
      <div>📅 Bắt đầu: <b>{d.startDate}</b></div>
      <div>🩸 Kết thúc kỳ kinh: <b>{d.periodEnd}</b></div>
      <div>🔴 Ngày kinh: <b>{d.bleedingDays} ngày</b></div>
      {d.cycleLength !== null && (
        <div>📏 Độ dài chu kỳ: <b>{d.cycleLength} ngày</b></div>
      )}
      {d.peakDate && <div style={{ color: '#7C3AED' }}>★ Ngày đỉnh: <b>{d.peakDate}</b></div>}
      {d.autoPeakDate && !d.peakDate && <div style={{ color: '#9B72C0' }}>◎ Ngày đỉnh (auto): <b>{d.autoPeakDate}</b></div>}
    </div>
  );
}

interface CycleChartRow {
  label:        string;
  cycleIndex:   number;
  startDate:    string;
  periodEnd:    string;
  bleedingDays: number;
  restDays:     number;    // cycleLength - bleedingDays (or 0 if last)
  cycleLength:  number | null;
  peakDate?:    string;
  autoPeakDate?: string;
  isAbnormal:   boolean;
}

export function CycleStats({ entries, year }: Props) {
  const cycles = useMemo(() => computeCycles(entries), [entries]);

  const summary = useMemo(() => {
    if (!cycles.length) return null;

    const lengths = cycles.map(c => c.cycleLength).filter((l): l is number => l !== null);
    const avgLength = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null;
    const minLength = lengths.length ? Math.min(...lengths) : null;
    const maxLength = lengths.length ? Math.max(...lengths) : null;
    const variation = minLength !== null && maxLength !== null ? maxLength - minLength : null;

    const avgPeriod = Math.round(cycles.map(c => c.bleedingDays).reduce((a, b) => a + b, 0) / cycles.length);
    const totalBleeding = entries.filter(e => e.bleeding !== 'none').length;
    const fertileDays   = entries.filter(e => e.mucus === 'watery' || e.mucus === 'egg_white').length;
    const peakDays      = entries.filter(e => e.isPeakDay).length;
    const abnormal      = cycles.filter(c => c.isAbnormal).length;

    return { avgLength, minLength, maxLength, variation, avgPeriod, totalBleeding, fertileDays, peakDays, abnormal };
  }, [cycles, entries]);

  const chartData: CycleChartRow[] = cycles.map(c => ({
    label:        `C${c.index}`,
    cycleIndex:   c.index,
    startDate:    c.startDate,
    periodEnd:    c.periodEnd,
    bleedingDays: c.bleedingDays,
    restDays:     c.cycleLength !== null ? Math.max(0, c.cycleLength - c.bleedingDays) : 0,
    cycleLength:  c.cycleLength,
    peakDate:     c.peakDate,
    autoPeakDate: c.autoPeakDate,
    isAbnormal:   c.isAbnormal,
  }));

  if (!entries.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 14 }}>
        Chưa có dữ liệu cho năm {year}
      </div>
    );
  }

  const abnormalCycles = cycles.filter(c => c.isAbnormal);

  const columns = [
    {
      title: 'Chu kỳ',
      dataIndex: 'index',
      width: 65,
      render: (v: number) => (
        <span style={{
          fontWeight: 700, fontSize: 12,
          background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>C{v}</span>
      ),
    },
    {
      title: 'Bắt đầu',
      dataIndex: 'startDate',
      width: 110,
      render: (v: string) => <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: 'Hết kinh',
      dataIndex: 'periodEnd',
      width: 110,
      render: (v: string) => <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: 'Ngày kinh',
      dataIndex: 'bleedingDays',
      width: 90,
      render: (v: number) => {
        const color = v < 2 ? 'orange' : v > 7 ? 'red' : 'green';
        return <Tag color={color}>{v} ngày</Tag>;
      },
    },
    {
      title: 'Độ dài chu kỳ',
      dataIndex: 'cycleLength',
      width: 115,
      render: (v: number | null) => {
        if (v === null) return <span style={{ color: '#94A3B8', fontSize: 12 }}>Đang tính…</span>;
        const color = v < 21 ? 'orange' : v > 35 ? 'red' : 'green';
        return <Tag color={color}>{v} ngày</Tag>;
      },
    },
    {
      title: 'Ngày đỉnh',
      width: 200,
      render: (_: unknown, row: CycleInfo) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {row.peakDate && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#7C3AED', fontWeight: 700 }}>
              ★ {row.peakDate} (xác nhận)
            </span>
          )}
          {row.autoPeakDate && row.autoPeakDate !== row.peakDate && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9B72C0' }}>
              ◎ {row.autoPeakDate} (auto)
            </span>
          )}
          {!row.peakDate && !row.autoPeakDate && (
            <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>
          )}
        </div>
      ),
    },
    {
      title: 'Nhận xét',
      render: (_: unknown, row: CycleInfo) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {row.observations.map((o, i) => (
            <span key={i} style={{ fontSize: 11, color: row.isAbnormal ? '#DC2626' : '#059669' }}>
              {row.isAbnormal ? '⚠ ' : '✓ '}{o}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* ── KPI Cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Số chu kỳ" value={cycles.length} sub={`năm ${year}`} color="#EC4899" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="TB độ dài chu kỳ"
            value={summary?.avgLength != null ? `${summary.avgLength} ngày` : '—'}
            sub={summary?.minLength != null ? `${summary.minLength}–${summary.maxLength} ngày` : undefined}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="TB ngày kinh"
            value={summary?.avgPeriod != null ? `${summary.avgPeriod} ngày` : '—'}
            sub="mỗi kỳ"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chu kỳ bất thường"
            value={summary?.abnormal ?? 0}
            sub="cần chú ý"
            color={summary?.abnormal ? '#DC2626' : '#10B981'}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng ngày kinh" value={summary?.totalBleeding ?? 0} sub="ngày ra máu" color="#F87171" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Chất nhầy màu mỡ" value={summary?.fertileDays ?? 0} sub="watery + egg white" color="#2DD4BF" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Ngày đỉnh xác nhận" value={summary?.peakDays ?? 0} sub="manual peak" color="#8B5CF6" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Biến động chu kỳ"
            value={summary?.variation != null ? `${summary.variation} ngày` : '—'}
            sub={summary?.variation != null ? (summary.variation > 7 ? 'Không đều' : 'Tương đối đều') : undefined}
            color={summary?.variation != null && summary.variation > 7 ? '#F59E0B' : '#10B981'}
          />
        </Col>
      </Row>

      {/* ── Abnormal alerts ── */}
      {abnormalCycles.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            <WarningOutlined style={{ color: '#F59E0B', marginRight: 6 }} />
            Chu kỳ cần chú ý
          </div>
          {abnormalCycles.map(c => (
            <Alert
              key={c.index}
              type="warning"
              showIcon
              message={<span style={{ fontWeight: 600, fontSize: 12 }}>Chu kỳ {c.index} — bắt đầu {c.startDate}</span>}
              description={
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {c.observations.map((o, i) => <li key={i} style={{ fontSize: 11 }}>{o}</li>)}
                </ul>
              }
            />
          ))}
        </div>
      )}

      {summary?.variation != null && summary.variation > 7 && (
        <Alert
          type="warning" showIcon icon={<WarningOutlined />}
          message="Chu kỳ không đều"
          description={`Biến động ${summary.variation} ngày (> 7 ngày). Theo Billings, hãy quan sát chất nhầy mỗi ngày để xác định ngày phóng noãn chính xác.`}
          style={{ marginBottom: 16, fontSize: 12 }}
        />
      )}

      {abnormalCycles.length === 0 && cycles.length > 0 && (
        <Alert
          type="success" showIcon icon={<CheckCircleOutlined />}
          message="Tất cả chu kỳ trong năm đều bình thường"
          description="Các chu kỳ nằm trong khoảng 21–35 ngày, kỳ kinh 2–7 ngày."
          style={{ marginBottom: 16, fontSize: 12 }}
        />
      )}

      {/* ── Cycle duration chart (replaces monthly chart) ── */}
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Chu kỳ kinh & số ngày kinh</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F87171', display: 'inline-block' }} />
                Ngày kinh
              </span>
              <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#BAE6FD', display: 'inline-block' }} />
                Phần còn lại
              </span>
            </div>
          </div>
        }
        style={{ border: '1px solid #F1F5F9', marginBottom: 20 }}
      >
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8', fontSize: 12 }}>
            Chưa đủ dữ liệu để vẽ biểu đồ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} unit=" ngày" />
              <RechartTooltip content={<CycleChartTooltip />} />
              <Bar dataKey="bleedingDays" stackId="a" name="Ngày kinh" radius={[0, 0, 4, 4]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isAbnormal ? '#FCA5A5' : '#F87171'} />
                ))}
                <LabelList
                  dataKey="bleedingDays"
                  position="insideBottom"
                  style={{ fontSize: 9, fill: '#7F1D1D', fontWeight: 700 }}
                  formatter={(v: number) => v > 0 ? `${v}d` : ''}
                />
              </Bar>
              <Bar dataKey="restDays" stackId="a" name="Phần còn lại" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isAbnormal ? '#FEF3C7' : '#BAE6FD'} />
                ))}
                <LabelList
                  dataKey="cycleLength"
                  position="top"
                  style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                  formatter={(v: number | null) => v !== null ? `${v}d` : '?'}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Cycle detail table ── */}
      <Card
        size="small"
        title={<span style={{ fontSize: 13, fontWeight: 600 }}>Bảng chi tiết từng chu kỳ</span>}
        style={{ border: '1px solid #F1F5F9' }}
      >
        <Table<CycleInfo>
          dataSource={[...cycles].reverse()}
          columns={columns}
          rowKey="index"
          size="small"
          pagination={false}
          scroll={{ x: 860 }}
          rowClassName={r => r.isAbnormal ? 'cycle-row--abnormal' : ''}
        />
      </Card>

      <style>{`.cycle-row--abnormal td { background: #FFF7ED !important; }`}</style>
    </div>
  );
}

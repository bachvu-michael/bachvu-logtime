import { useMemo, useState } from 'react';
import { Select, Card, Row, Col, Tag, Typography, Alert, Empty } from 'antd';
import {
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { CycleEntry, CYCLE_MUCUS_LABELS } from '../../types';
import { CycleInfo } from '../../utils/cycleUtils';
import { analyzeCycle, CycleAnalysisResult, HealthLevel, HealthSignal } from '../../utils/cycleAnalysis';

const { Text } = Typography;

interface Props {
  entries: CycleEntry[];
  cycles:  CycleInfo[];
}

const LEVEL_COLOR: Record<HealthLevel, string> = {
  normal:  '#10B981',
  caution: '#F59E0B',
  concern: '#EF4444',
};
const LEVEL_BG: Record<HealthLevel, string> = {
  normal:  '#F0FDF4',
  caution: '#FFFBEB',
  concern: '#FFF1F2',
};
const LEVEL_ICON: Record<HealthLevel, React.ReactNode> = {
  normal:  <CheckCircleOutlined style={{ color: '#10B981' }} />,
  caution: <WarningOutlined     style={{ color: '#F59E0B' }} />,
  concern: <CloseCircleOutlined style={{ color: '#EF4444' }} />,
};
const LEVEL_LABEL: Record<HealthLevel, string> = {
  normal:  'Bình thường',
  caution: 'Cần chú ý',
  concern: 'Cần kiểm tra',
};
const CAT_LABEL: Record<HealthSignal['category'], string> = {
  cycle:      'Chu kỳ',
  period:     'Kỳ kinh',
  mucus:      'Chất nhầy',
  ovulation:  'Phóng noãn',
  luteal:     'Pha hoàng thể',
  spotting:   'Ra máu bất thường',
};

function OverallBadge({ level }: { level: HealthLevel }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: LEVEL_BG[level], border: `1.5px solid ${LEVEL_COLOR[level]}`,
      borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700,
      color: LEVEL_COLOR[level],
    }}>
      {LEVEL_ICON[level]}
      {LEVEL_LABEL[level]}
    </div>
  );
}

function PhaseBar({ result }: { result: CycleAnalysisResult }) {
  const total = result.cycle.cycleLength ?? result.phases.reduce((s, p) => s + p.days, 0);
  if (total === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Các giai đoạn trong chu kỳ
      </Text>
      {/* Bar */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 22, marginTop: 8, gap: 1 }}>
        {result.phases.map(p => (
          <div
            key={p.type}
            title={`${p.name}: ${p.days} ngày`}
            style={{
              flex: p.days,
              background: p.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#374151',
              minWidth: 0, overflow: 'hidden',
            }}
          >
            {p.days > 2 ? `${p.days}d` : ''}
          </div>
        ))}
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {result.phases.map(p => (
          <div key={p.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: 'inline-block' }} />
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              {p.name} ({p.days} ngày)
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricGrid({ result }: { result: CycleAnalysisResult }) {
  const effectivePeak = result.cycle.peakDate ?? result.cycle.autoPeakDate;
  const items = [
    {
      label: 'Độ dài chu kỳ',
      value: result.cycle.cycleLength !== null ? `${result.cycle.cycleLength} ngày` : 'Chưa kết thúc',
    },
    { label: 'Ngày kinh',       value: `${result.cycle.bleedingDays} ngày` },
    { label: 'Ngày phóng noãn', value: result.ovulationDay ? `Ngày ${result.ovulationDay}` : '—' },
    { label: 'Ngày đỉnh',       value: effectivePeak ?? '—',
      extra: effectivePeak ? (result.peakQuality === 'confirmed' ? '★ xác nhận' : '◎ tự động') : undefined },
    { label: 'Pha hoàng thể',   value: result.luteaPhaseLength !== null ? `${result.luteaPhaseLength} ngày` : '—' },
    { label: 'Chất nhầy tốt nhất', value: CYCLE_MUCUS_LABELS[result.bestMucus] },
    { label: 'Chất nhầy màu mỡ', value: result.hasFertileMucus ? 'Có ✓' : 'Không ✗' },
    { label: 'Giai đoạn trước phóng noãn', value: result.preOvulatoryDays !== null ? `${result.preOvulatoryDays} ngày` : '—' },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Chỉ số chu kỳ
      </Text>
      <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
        {items.map(item => (
          <Col key={item.label} xs={12} sm={8} md={6}>
            <div style={{
              background: '#F8FAFF', border: '1px solid #F1F5F9',
              borderRadius: 8, padding: '8px 12px',
            }}>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                {item.value}
              </div>
              {item.extra && (
                <div style={{ fontSize: 10, color: '#8B5CF6', marginTop: 1 }}>{item.extra}</div>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

function SignalCard({ signal }: { signal: HealthSignal }) {
  const alertType = signal.level === 'normal' ? 'success'
    : signal.level === 'caution' ? 'warning' : 'error';

  return (
    <Alert
      type={alertType}
      showIcon
      message={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag
            style={{ fontSize: 10, margin: 0, padding: '0 6px' }}
            color={signal.level === 'normal' ? 'green' : signal.level === 'caution' ? 'orange' : 'red'}
          >
            {CAT_LABEL[signal.category]}
          </Tag>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{signal.title}</span>
        </div>
      }
      description={
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{signal.detail}</div>
          {signal.recommendation && (
            <div style={{
              marginTop: 6, fontSize: 11, color: '#7C3AED',
              background: '#F5F3FF', borderRadius: 6, padding: '6px 10px',
              borderLeft: '3px solid #8B5CF6',
            }}>
              💡 {signal.recommendation}
            </div>
          )}
        </div>
      }
      style={{ marginBottom: 10 }}
    />
  );
}

function CycleSummaryCard({ result }: { result: CycleAnalysisResult }) {
  return (
    <Card
      size="small"
      style={{ border: '1px solid #F1F5F9', marginBottom: 20 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            Chu kỳ {result.cycle.index} — bắt đầu {result.cycle.startDate}
          </span>
          <OverallBadge level={result.overallLevel} />
        </div>
      }
    >
      <PhaseBar result={result} />
      <MetricGrid result={result} />

      <div>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Phân tích chi tiết
        </Text>
        <div style={{ marginTop: 10 }}>
          {result.signals.map(s => <SignalCard key={s.id} signal={s} />)}
        </div>
      </div>
    </Card>
  );
}

export function CycleAnalysisTab({ entries, cycles }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | 'all'>('all');

  const results = useMemo<CycleAnalysisResult[]>(() => {
    return cycles.map((c, i) =>
      analyzeCycle(c, entries, cycles[i + 1]),
    );
  }, [cycles, entries]);

  const resultsToShow = selectedIdx === 'all'
    ? [...results].reverse()
    : results.filter(r => r.cycle.index === selectedIdx);

  const cycleOptions = [
    { value: 'all', label: `Tất cả ${cycles.length} chu kỳ` },
    ...cycles.map(c => ({ value: c.index, label: `Chu kỳ ${c.index} — ${c.startDate}` })),
  ];

  // Overall summary across shown results
  const concern = resultsToShow.filter(r => r.overallLevel === 'concern').length;
  const caution = resultsToShow.filter(r => r.overallLevel === 'caution').length;
  const normal  = resultsToShow.filter(r => r.overallLevel === 'normal').length;

  if (cycles.length === 0) {
    return (
      <Empty
        description="Chưa có chu kỳ nào để phân tích. Hãy thêm dữ liệu hàng ngày."
        style={{ padding: '60px 0' }}
      />
    );
  }

  return (
    <div>
      {/* ── Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Xem chu kỳ:</Text>
          <Select
            value={selectedIdx}
            onChange={setSelectedIdx}
            style={{ minWidth: 220 }}
            options={cycleOptions as { value: number | 'all'; label: string }[]}
          />
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {concern > 0 && (
            <div style={{ background: '#FFF1F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
              <CloseCircleOutlined /> {concern} cần kiểm tra
            </div>
          )}
          {caution > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#D97706', fontWeight: 600 }}>
              <WarningOutlined /> {caution} cần chú ý
            </div>
          )}
          {normal > 0 && concern === 0 && caution === 0 && (
            <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#059669', fontWeight: 600 }}>
              <CheckCircleOutlined /> Tất cả bình thường
            </div>
          )}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <Alert
        type="info"
        showIcon
        message="Lưu ý quan trọng"
        description="Các phân tích dưới đây dựa trên phương pháp Billings và dữ liệu bạn đã nhập. Đây chỉ là tham khảo — không thay thế chẩn đoán y tế. Nếu có dấu hiệu bất thường, hãy thăm khám bác sĩ phụ khoa."
        style={{ marginBottom: 20, fontSize: 12 }}
        closable
      />

      {/* ── Cycle cards ── */}
      {resultsToShow.map(r => (
        <CycleSummaryCard key={r.cycle.index} result={r} />
      ))}
    </div>
  );
}

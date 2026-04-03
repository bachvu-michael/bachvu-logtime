import { useMemo } from 'react';
import { Tooltip } from 'antd';
import {
  CycleEntry,
  CYCLE_BLEEDING_LABELS, CYCLE_MUCUS_LABELS, CYCLE_SENSATION_LABELS,
  CYCLE_BLEEDING_COLORS, CYCLE_MUCUS_COLORS,
} from '../../types';
import { DateCycleInfo, FertilityLevel } from '../../utils/cycleUtils';

interface Props {
  year:       number;
  month:      number;
  entries:    CycleEntry[];
  cycleMap:   Record<string, DateCycleInfo>;
  onDayClick: (date: string, existing: CycleEntry | null) => void;
}

const WEEKDAYS   = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

/**
 * Billings observation symbols (sensation → symbol).
 * dry = one dash, moist = small dot, wet = one dot, slippery = two dots
 */
function sensationSymbol(entry: CycleEntry): { text: string; color: string; size: number } {
  if (entry.bleeding !== 'none') return { text: '', color: '', size: 0 };
  switch (entry.sensation) {
    case 'dry':      return { text: '—',  color: '#94A3B8', size: 10 };
    case 'moist':    return { text: '·',  color: '#F59E0B', size: 14 };
    case 'wet':      return { text: '●',  color: '#2DD4BF', size: 10 };
    case 'slippery': return { text: '●●', color: '#059669', size: 9  };
  }
}

/** Background colour priority: bleeding > mucus > dry-logged > unlogged */
function getDayBg(entry: CycleEntry): string {
  if (entry.bleeding !== 'none') return CYCLE_BLEEDING_COLORS[entry.bleeding];
  if (entry.mucus    !== 'none') return CYCLE_MUCUS_COLORS[entry.mucus];
  return '#FFFBEB'; // amber-50 — logged dry day
}

const FERTILITY_LABEL: Record<FertilityLevel, string> = {
  high:   '🌿 Rất dễ thụ thai (vùng màu mỡ cao)',
  medium: '🌱 Có thể thụ thai (vùng chuyển tiếp)',
};

function getTooltip(date: string, entry: CycleEntry | undefined, ci: DateCycleInfo | undefined) {
  const lines: string[] = [];
  if (ci?.isStart)         lines.push(`▶ Bắt đầu chu kỳ ${ci.cycleIndex}`);
  if (ci?.isPeriodEnd && !ci.isStart) lines.push('◀ Kết thúc kỳ kinh');
  if (ci?.isAutoPeak)      lines.push('◎ Ngày đỉnh (tự động)');
  if (ci?.fertilityLevel)  lines.push(FERTILITY_LABEL[ci.fertilityLevel]);
  if (!entry) { lines.push(date); return lines.join('\n'); }
  lines.push(date);
  if (entry.bleeding !== 'none') lines.push(`Kinh: ${CYCLE_BLEEDING_LABELS[entry.bleeding]}`);
  if (entry.mucus    !== 'none') lines.push(`Chất nhầy: ${CYCLE_MUCUS_LABELS[entry.mucus]}`);
  lines.push(`Cảm giác: ${CYCLE_SENSATION_LABELS[entry.sensation]}`);
  if (entry.isPeakDay) lines.push('★ Ngày đỉnh (xác nhận)');
  if (entry.note) lines.push(entry.note);
  return lines.join('\n');
}

export function CycleCalendar({ year, month, entries, cycleMap, onDayClick }: Props) {
  const entryMap = useMemo(() => {
    const m: Record<string, CycleEntry> = {};
    for (const e of entries) m[e.date] = e;
    return m;
  }, [entries]);

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, textAlign: 'center' }}>
        {MONTH_NAMES[month - 1]} {year}
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 600,
            color: d === 'CN' || d === 'T7' ? '#EF4444' : '#94A3B8', padding: '2px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((date, i) => {
          if (!date) return <div key={i} />;

          const entry   = entryMap[date];
          const ci      = cycleMap[date];
          const dayNum  = parseInt(date.split('-')[2]);
          const isToday    = date === today;
          const isSunday   = i % 7 === 0;
          const isSaturday = i % 7 === 6;

          const bg = entry ? getDayBg(entry) : '#fff';
          const sym = entry ? sensationSymbol(entry) : null;
          const fertility = ci?.fertilityLevel;

          // Border priority: today > cycle-start > high-fertility > medium-fertility > default
          const border = isToday
            ? '2px solid #4361EE'
            : ci?.isStart
              ? '2px solid #EC4899'
              : fertility === 'high'
                ? '2px solid #10B981'
                : fertility === 'medium'
                  ? '1px solid #84CC16'
                  : '1px solid #F1F5F9';

          return (
            <Tooltip
              key={date}
              title={<span style={{ whiteSpace: 'pre-line' }}>{getTooltip(date, entry, ci)}</span>}
            >
              <div
                onClick={() => onDayClick(date, entry ?? null)}
                style={{
                  borderRadius: 6, padding: '3px 2px', minHeight: 44,
                  cursor: 'pointer', border, background: bg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-start',
                  position: 'relative', transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(67,97,238,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                {/* Day number */}
                <span style={{
                  fontSize: 11, fontWeight: isToday ? 700 : 500,
                  color: isSunday || isSaturday ? '#EF4444' : '#0F172A',
                }}>
                  {dayNum}
                </span>

                {/* Cycle start badge */}
                {ci?.isStart && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, color: '#fff',
                    background: '#EC4899', borderRadius: 3, padding: '0 3px',
                    lineHeight: '14px', marginTop: 1,
                  }}>C{ci.cycleIndex}</span>
                )}

                {/* Fertility indicator */}
                {fertility && !ci?.isStart && (
                  <span style={{
                    fontSize: 8,
                    color: fertility === 'high' ? '#10B981' : '#84CC16',
                    lineHeight: 1,
                    marginTop: 1,
                  }}>
                    {fertility === 'high' ? '◆' : '◇'}
                  </span>
                )}
                {fertility && ci?.isStart && (
                  <span style={{
                    fontSize: 7,
                    color: fertility === 'high' ? '#10B981' : '#84CC16',
                    lineHeight: 1,
                  }}>
                    {fertility === 'high' ? '◆' : '◇'}
                  </span>
                )}

                {/* Billings sensation symbol (non-bleeding logged days) */}
                {sym && sym.text && (
                  <span style={{
                    fontSize: sym.size, color: sym.color, lineHeight: 1,
                    marginTop: 2, letterSpacing: sym.text === '●●' ? '-1px' : undefined,
                    fontWeight: 700,
                  }}>
                    {sym.text}
                  </span>
                )}

                {/* Mucus quality dot (for non-bleeding mucus days, supplement symbol) */}
                {entry?.mucus !== 'none' && entry?.bleeding === 'none' && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: CYCLE_MUCUS_COLORS[entry.mucus!],
                    display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)',
                    marginTop: 1,
                  }} />
                )}

                {/* Auto peak: ◎ (open circle, lighter) */}
                {ci?.isAutoPeak && !entry?.isPeakDay && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#7C3AED',
                    background: '#F3E8FF', borderRadius: 3, padding: '0 2px',
                    lineHeight: '13px', marginTop: 1, opacity: 0.85,
                  }}>P?</span>
                )}

                {/* Manual confirmed peak: P */}
                {entry?.isPeakDay && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: '#7C3AED', borderRadius: 3, padding: '0 3px',
                    lineHeight: '14px', marginTop: 1,
                  }}>P</span>
                )}

                {/* Period end underline */}
                {ci?.isPeriodEnd && !ci.isStart && (
                  <span style={{
                    position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                    width: 14, height: 2, borderRadius: 1, background: '#7C3AED',
                  }} />
                )}

                {/* Note dot */}
                {entry?.note && (
                  <span style={{
                    position: 'absolute', bottom: 3, right: 3,
                    width: 4, height: 4, borderRadius: '50%', background: '#94A3B8',
                  }} />
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

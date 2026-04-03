import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Space, Typography, message, Tabs } from 'antd';
import { PlusOutlined, DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { CycleEntry, CycleEntryInput } from '../types';
import { fetchCycles, upsertCycle, deleteCycle, exportCycles } from '../api/cycles';
import { CycleCalendar } from '../components/cycle/CycleCalendar';
import { CycleFormModal } from '../components/cycle/CycleFormModal';
import { CycleStats } from '../components/cycle/CycleStats';
import { CycleAnalysisTab } from '../components/cycle/CycleAnalysisTab';
import { computeCycles, buildCycleDateMap } from '../utils/cycleUtils';

const { Text } = Typography;

function currentYear()  { return new Date().getFullYear(); }
function currentMonth() { return new Date().getMonth() + 1; }

function yearOptions() {
  const y = currentYear();
  return [y + 1, y, y - 1, y - 2].map(yr => ({ value: yr, label: String(yr) }));
}

const MONTH_NAMES = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];

export function CyclePage() {
  const [entries,   setEntries]   = useState<CycleEntry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [year,      setYear]      = useState(currentYear());
  const [month,     setMonth]     = useState(currentMonth());
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats' | 'analysis'>('calendar');
  const [modal, setModal] = useState<{ open: boolean; date?: string; editing: CycleEntry | null }>({
    open: false, editing: null,
  });

  const loadYear = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCycles({ year: String(year) });
      setEntries(data);
    } catch {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadYear(); }, [loadYear]);

  // Computed from ALL year entries — drives both calendar markers and stats
  const cycles   = useMemo(() => computeCycles(entries), [entries]);
  const cycleMap = useMemo(() => buildCycleDateMap(cycles, entries), [cycles, entries]);

  function monthEntries() {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return entries.filter(e => e.date.startsWith(prefix));
  }

  async function handleSave(input: CycleEntryInput) {
    const saved = await upsertCycle(input);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.date === saved.date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved].sort((a, b) => a.date.localeCompare(b.date));
    });
    message.success('Đã lưu');
  }

  async function handleDelete(id: string) {
    await deleteCycle(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    message.success('Đã xoá');
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleExport() {
    try { await exportCycles({ year: String(year) }); }
    catch { message.error('Không thể xuất dữ liệu'); }
  }

  const colorLegend = [
    { color: '#DC2626', label: 'Ra máu nhiều' },
    { color: '#F87171', label: 'Ra máu vừa' },
    { color: '#FCA5A5', label: 'Ra máu nhẹ/lấm tấm' },
    { color: '#2DD4BF', label: 'Nhầy egg-white' },
    { color: '#67E8F9', label: 'Nhầy loãng' },
    { color: '#A7F3D0', label: 'Nhầy kem' },
    { color: '#D1FAE5', label: 'Nhầy đặc' },
    { color: '#FFFBEB', label: 'Ngày khô (đã log)' },
  ];

  const symbolLegend = [
    { symbol: '—',  color: '#94A3B8', label: 'Khô (dry)' },
    { symbol: '·',  color: '#F59E0B', label: 'Ẩm (moist)' },
    { symbol: '●',  color: '#2DD4BF', label: 'Ướt (wet)' },
    { symbol: '●●', color: '#059669', label: 'Trơn / ướt lấm tấm (slippery)' },
    { symbol: '◆',  color: '#10B981', label: 'Rất dễ thụ thai (border xanh)' },
    { symbol: '◇',  color: '#84CC16', label: 'Có thể thụ thai (chuyển tiếp)' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(236,72,153,0.35)',
          }}>
            🌸
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
              Theo dõi chu kỳ
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              Phương pháp Billings — theo dõi chất nhầy và kinh nguyệt
            </div>
          </div>
        </div>

        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export {year}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModal({ open: true, date: undefined, editing: null })}
            style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', border: 'none' }}
          >
            Thêm ngày
          </Button>
        </Space>
      </div>

      {/* ── Filter / Nav Bar ── */}
      <div style={{
        background: '#fff', border: '1px solid #F1F5F9', borderRadius: 12,
        padding: '12px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Năm
          </Text>
          <Select value={year} onChange={setYear} style={{ width: 90 }} options={yearOptions()} />
        </div>

        {activeTab === 'calendar' && (
          <>
            <div style={{ width: 1, height: 24, background: '#F1F5F9' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button size="small" icon={<LeftOutlined />} onClick={prevMonth} type="text" />
              <Text style={{ fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                {MONTH_NAMES[month - 1]}
              </Text>
              <Button size="small" icon={<RightOutlined />} onClick={nextMonth} type="text" />
            </div>
          </>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 12, color: '#94A3B8' }}>
            {loading ? 'Đang tải…' : `${entries.length} ngày · ${cycles.length} chu kỳ`}
          </Text>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        activeKey={activeTab}
        onChange={k => setActiveTab(k as 'calendar' | 'stats' | 'analysis')}
        items={[
          {
            key: 'calendar',
            label: 'Lịch tháng',
            children: (
              <div style={{
                background: '#fff', borderRadius: 12, padding: 20,
                border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
              }}>
                <CycleCalendar
                  year={year}
                  month={month}
                  entries={monthEntries()}
                  cycleMap={cycleMap}
                  onDayClick={(date, existing) => setModal({ open: true, date, editing: existing })}
                />

                {/* Legend */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                  {/* Colour legend */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    {colorLegend.map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block', border: '1px solid rgba(0,0,0,0.08)' }} />
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{l.label}</Text>
                      </div>
                    ))}
                  </div>
                  {/* Symbol legend */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {symbolLegend.map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: l.color, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{l.symbol}</span>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{l.label}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#EC4899', borderRadius: 3, padding: '0 4px', lineHeight: '14px' }}>C1</span>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Bắt đầu chu kỳ</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#7C3AED', borderRadius: 3, padding: '0 4px', lineHeight: '14px' }}>P</span>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Ngày đỉnh (xác nhận)</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', borderRadius: 3, padding: '0 4px', lineHeight: '14px' }}>P?</span>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Ngày đỉnh (tự động)</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 16, height: 3, background: '#7C3AED', borderRadius: 1 }} />
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Kết thúc kỳ kinh</Text>
                    </div>
                  </div>
                </div>

                {/* Entries list for this month */}
                {monthEntries().length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Chi tiết {MONTH_NAMES[month - 1]}
                    </Text>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {monthEntries().map(e => {
                        const ci = cycleMap[e.date];
                        return (
                          <div key={e.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 8, background: '#F8FAFF',
                            border: '1px solid #F1F5F9',
                          }}>
                            <Text style={{ fontWeight: 600, minWidth: 90, fontSize: 13 }}>{e.date}</Text>
                            {ci?.isStart && (
                              <span style={{ fontSize: 10, background: '#FCE7F3', color: '#DB2777', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                                Bắt đầu C{ci.cycleIndex}
                              </span>
                            )}
                            {e.bleeding !== 'none' && (
                              <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', borderRadius: 4, padding: '2px 6px' }}>
                                Kinh: {e.bleeding}
                              </span>
                            )}
                            {e.mucus !== 'none' && (
                              <span style={{ fontSize: 11, background: '#D1FAE5', color: '#059669', borderRadius: 4, padding: '2px 6px' }}>
                                Nhầy: {e.mucus}
                              </span>
                            )}
                            {e.bleeding === 'none' && e.mucus === 'none' && (
                              <span style={{ fontSize: 11, background: '#FFFBEB', color: '#D97706', borderRadius: 4, padding: '2px 6px' }}>
                                Ngày khô
                              </span>
                            )}
                            {e.isPeakDay && (
                              <span style={{ fontSize: 11, background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                                Peak
                              </span>
                            )}
                            {e.note && <Text style={{ fontSize: 11, color: '#94A3B8', flex: 1 }} ellipsis>{e.note}</Text>}
                            <Button
                              size="small" type="text" danger
                              onClick={() => handleDelete(e.id)}
                              style={{ marginLeft: 'auto', fontSize: 11 }}
                            >
                              Xoá
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'stats',
            label: `Thống kê ${year}`,
            children: (
              <div style={{
                background: '#fff', borderRadius: 12, padding: 20,
                border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
              }}>
                <CycleStats entries={entries} year={year} />
              </div>
            ),
          },
          {
            key: 'analysis',
            label: '🔍 Phân tích sức khoẻ',
            children: (
              <div style={{
                background: '#fff', borderRadius: 12, padding: 20,
                border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
              }}>
                <CycleAnalysisTab entries={entries} cycles={cycles} />
              </div>
            ),
          },
        ]}
      />

      <CycleFormModal
        open={modal.open}
        date={modal.date}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}

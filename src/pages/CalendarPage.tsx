import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Space, Typography, message, Badge, Tabs } from 'antd';
import { PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { PersonalEvent, PersonalEventInput, EventType, isActiveReminder } from '../types';
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchEventTypes } from '../api/events';
import { EventCalendar } from '../components/calendar/EventCalendar';
import { EventFormModal } from '../components/calendar/EventFormModal';
import { ReminderBanner } from '../components/calendar/ReminderBanner';
import { EventTypesManager } from '../components/calendar/EventTypesManager';

const { Text } = Typography;

function currentYear()  { return new Date().getFullYear(); }
function currentMonth() { return new Date().getMonth() + 1; }

function yearOptions() {
  const y = currentYear();
  return [y + 1, y, y - 1].map(yr => ({ value: yr, label: String(yr) }));
}

const MONTH_NAMES = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];

const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));

export function CalendarPage() {
  const [events,  setEvents]  = useState<PersonalEvent[]>([]);
  const [types,   setTypes]   = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [year,    setYear]    = useState(currentYear());
  const [month,   setMonth]   = useState(currentMonth());
  const [tab,     setTab]     = useState<'calendar' | 'types'>('calendar');
  const [modal, setModal] = useState<{ open: boolean; date?: string; editing: PersonalEvent | null }>({
    open: false, editing: null,
  });

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEvents({ month: monthStr });
      setEvents(data);
    } catch {
      message.error('Không thể tải sự kiện');
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    fetchEventTypes().then(setTypes).catch(() => {});
  }, []);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(currentYear());
    setMonth(currentMonth());
  }

  async function handleSave(input: PersonalEventInput) {
    if (modal.editing) {
      const updated = await updateEvent(modal.editing.id, input);
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      message.success('Đã cập nhật');
    } else {
      const created = await createEvent(input);
      if (created.date.startsWith(monthStr)) {
        setEvents(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      }
      message.success('Đã thêm sự kiện');
    }
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    message.success('Đã xoá');
  }

  const today = new Date().toISOString().split('T')[0];
  const activeReminderCount = useMemo(
    () => events.filter(e => isActiveReminder(e, today)).length,
    [events, today],
  );

  const tabItems = [
    { key: 'calendar', label: '📅 Lịch' },
    { key: 'types',    label: '🏷 Loại sự kiện' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #4361EE 0%, #06B6D4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(67,97,238,0.35)',
          }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
              Lịch cá nhân
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              Ghi lại sự kiện, hẹn hò và nhắc nhở cá nhân
            </div>
          </div>
        </div>

        <Space wrap>
          {activeReminderCount > 0 && (
            <Badge count={activeReminderCount} size="small">
              <Button style={{ color: '#F59E0B', borderColor: '#FDE68A' }}>
                🔔 Nhắc nhở
              </Button>
            </Badge>
          )}
          {tab === 'calendar' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModal({ open: true, date: undefined, editing: null })}
            >
              Thêm sự kiện
            </Button>
          )}
        </Space>
      </div>

      {/* ── Reminder Banner ── */}
      <ReminderBanner />

      {/* ── Main Tabs ── */}
      <div style={{
        background: '#fff', border: '1px solid #F1F5F9', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)', marginBottom: 16,
      }}>
        <Tabs
          activeKey={tab}
          onChange={k => setTab(k as 'calendar' | 'types')}
          items={tabItems}
          style={{ padding: '0 16px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </div>

      {/* ── Calendar Tab ── */}
      {tab === 'calendar' && (
        <>
          {/* Nav Bar */}
          <div style={{
            background: '#fff', border: '1px solid #F1F5F9', borderRadius: 12,
            padding: '10px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
          }}>
            <Button size="small" onClick={goToday} style={{ fontSize: 12 }}>Hôm nay</Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button size="small" type="text" icon={<LeftOutlined />} onClick={prevMonth} />
              <Text style={{ fontWeight: 700, minWidth: 110, textAlign: 'center', fontSize: 14 }}>
                {MONTH_NAMES[month - 1]} {year}
              </Text>
              <Button size="small" type="text" icon={<RightOutlined />} onClick={nextMonth} />
            </div>

            <Select
              value={month}
              onChange={setMonth}
              style={{ width: 110 }}
              size="small"
              options={MONTH_OPTIONS}
            />
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 80 }}
              size="small"
              options={yearOptions()}
            />

            <div style={{ marginLeft: 'auto' }}>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                {loading ? 'Đang tải…' : `${events.length} sự kiện`}
              </Text>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: 20,
            border: '1px solid #F1F5F9',
            boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
          }}>
            <EventCalendar
              year={year}
              month={month}
              events={events}
              types={types}
              onDayClick={date => setModal({ open: true, date, editing: null })}
              onEventClick={ev => setModal({ open: true, date: undefined, editing: ev })}
            />
          </div>
        </>
      )}

      {/* ── Types Tab ── */}
      {tab === 'types' && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: 24,
          border: '1px solid #F1F5F9',
          boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>
            Quản lý loại sự kiện
          </div>
          <EventTypesManager types={types} onChange={setTypes} />
        </div>
      )}

      <EventFormModal
        open={modal.open}
        date={modal.date}
        editing={modal.editing}
        types={types}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
        onDelete={handleDelete}
        onTypesChange={setTypes}
      />
    </div>
  );
}

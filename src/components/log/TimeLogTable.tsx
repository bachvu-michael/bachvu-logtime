import { useState, useMemo } from 'react';
import {
  Table, Tag, Space, Button, Popconfirm, Drawer, Form,
  Input, InputNumber, DatePicker, AutoComplete, Select,
  message, Typography, Card, Row, Col, Segmented,
} from 'antd';
import { EditOutlined, DeleteOutlined, ThunderboltOutlined, TeamOutlined, CoffeeOutlined, DownloadOutlined, FileExcelOutlined, UnorderedListOutlined, TagsOutlined, CopyOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, getISOWeek } from 'date-fns';
import {
  LogEntry, LogEntryInput, TaskType,
  TeamworkType, TEAMWORK_TYPE_LABELS, TEAMWORK_TYPE_COLORS, TEAMWORK_TYPE_SUGGESTIONS,
  MAX_DAILY_MINUTES, TAKEOFF_LABELS,
} from '../../types';
import { updateLog, deleteLog } from '../../api/logs';
import { formatDisplay, minutesToDisplay, getDayUsedMinutes } from '../../utils/dateHelpers';
import { exportJson, exportCsv } from '../../utils/exportHelpers';

/** Backward compat helpers */
function entryTitle(log: LogEntry): string {
  if (log.title) return log.title;
  return (log as unknown as Record<string, string>).description ?? '';
}
function entryKey(log: LogEntry): string {
  if (log.ticketKey) return log.ticketKey;
  return (log as unknown as Record<string, string>).ticketId ?? '';
}
function entryMinutes(log: LogEntry): number {
  if (log.hours !== undefined) return log.hours * 60 + (log.minutes ?? 0);
  return Math.round((log.timeSpent ?? 0) * 60);
}

const TAG_COLORS = ['blue','purple','green','orange','magenta','cyan','gold','volcano','geekblue','lime'];
function tagColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

interface Props {
  logs: LogEntry[];
  loading: boolean;
  onUpdated: (entry: LogEntry) => void;
  onDeleted: (id: string) => void;
}

interface TableRow {
  key: string;
  log: LogEntry;
  rowSpan: number;
  dayDate: string;
  dayWorkMinutes: number;   // jira + teamwork only (for display)
  dayTotalMinutes: number;  // all including takeoff (for cap)
  isToday: boolean;
  weekNum: number;          // ISO week number (for row banding)
}

interface TicketRow {
  key: string;
  date: string;
  taskType: string;
  ticketKey: string;
  title: string;
  teamworkType?: string;
  minutes: number;
}

export function TimeLogTable({ logs, loading, onUpdated, onDeleted }: Props) {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'date' | 'ticket'>('date');
  const [editTarget, setEditTarget]       = useState<LogEntry | null>(null);
  const [editTaskType, setEditTaskType]   = useState<TaskType>('jira');
  const [editTeamworkType, setEditTeamworkType] = useState<TeamworkType>('meeting');
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // ── Logged IDs (persisted) ──────────────────────────────────────────────────
  const [loggedIds, setLoggedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('logtime_logged_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  function applyLogged(ids: string[], logged: boolean) {
    setLoggedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => logged ? next.add(id) : next.delete(id));
      localStorage.setItem('logtime_logged_ids', JSON.stringify([...next]));
      return next;
    });
    setSelectedKeys([]);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(
      () => message.success('Copied!', 1),
      () => message.error('Copy failed'),
    );
  }

  function copyTimeStr(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h === 0 ? String(m) : `${h}:${String(m).padStart(2, '0')}`;
  }

  // ── Available months from logs ──────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) set.add(log.date.slice(0, 7));
    if (!set.has(currentMonth)) set.add(currentMonth);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [logs, currentMonth]);

  // ── Filter by month then search ─────────────────────────────────────────────
  const monthLogs = useMemo(
    () => logs.filter(l => l.date.startsWith(selectedMonth)),
    [logs, selectedMonth]
  );

  const filtered = useMemo(() =>
    search.trim()
      ? monthLogs.filter(l =>
          entryKey(l).toLowerCase().includes(search.toLowerCase()) ||
          entryTitle(l).toLowerCase().includes(search.toLowerCase())
        )
      : monthLogs,
    [monthLogs, search]
  );

  const isWork = (l: LogEntry) => l.taskType !== 'takeoff';

  // ── Stats (work entries only; takeoff excluded from time totals) ────────────
  const monthTotalMinutes = useMemo(
    () => monthLogs.filter(isWork).reduce((s, l) => s + entryMinutes(l), 0),
    [monthLogs]
  );

  const weekTotalMinutes = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(new Date(),   { weekStartsOn: 1 });
    return monthLogs
      .filter(l => isWork(l) && (() => { try { return isWithinInterval(parseISO(l.date), { start: weekStart, end: weekEnd }); } catch { return false; } })())
      .reduce((s, l) => s + entryMinutes(l), 0);
  }, [monthLogs]);

  // Today work hours (stats display)
  const todayWorkMinutes = useMemo(
    () => monthLogs.filter(l => l.date === todayStr && isWork(l)).reduce((s, l) => s + entryMinutes(l), 0),
    [monthLogs, todayStr]
  );
  // Today all hours (cap includes takeoff)
  const todayAllMinutes = useMemo(
    () => monthLogs.filter(l => l.date === todayStr).reduce((s, l) => s + entryMinutes(l), 0),
    [monthLogs, todayStr]
  );
  const todayRemainingMinutes = Math.max(0, MAX_DAILY_MINUTES - todayAllMinutes);

  // ── Build flat row array grouped by day ────────────────────────────────────
  const tableRows = useMemo((): TableRow[] => {
    const map = new Map<string, LogEntry[]>();
    for (const log of filtered) {
      const arr = map.get(log.date) ?? [];
      arr.push(log);
      map.set(log.date, arr);
    }
    const groups = Array.from(map.entries())
      .map(([date, entries]) => ({
        date,
        entries: [...entries].sort((a, b) => a.createdAt - b.createdAt),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const rows: TableRow[] = [];
    for (const { date, entries } of groups) {
      const dayWorkMinutes  = entries.filter(isWork).reduce((s, l) => s + entryMinutes(l), 0);
      const dayTotalMinutes = entries.reduce((s, l) => s + entryMinutes(l), 0);
      const isToday = date === todayStr;
      const weekNum = getISOWeek(parseISO(date));
      entries.forEach((log, i) => {
        rows.push({ key: log.id, log, rowSpan: i === 0 ? entries.length : 0, dayDate: date, dayWorkMinutes, dayTotalMinutes, isToday, weekNum });
      });
    }
    return rows;
  }, [filtered, todayStr]);

  // ── Ticket summary rows (flat, sorted by date desc) ─────────────────────────
  const ticketRows = useMemo((): TicketRow[] =>
    filtered
      .filter(l => l.taskType !== 'takeoff')
      .map(log => ({
        key: log.id,
        date: log.date,
        taskType: log.taskType ?? (entryKey(log) ? 'jira' : 'teamwork'),
        ticketKey: entryKey(log),
        title: entryTitle(log),
        teamworkType: log.teamworkType,
        minutes: entryMinutes(log),
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  [filtered]);

  // ── Edit helpers ────────────────────────────────────────────────────────────
  function openEdit(record: LogEntry) {
    const type: TaskType     = record.taskType ?? (entryKey(record) ? 'jira' : 'teamwork');
    const twType: TeamworkType = record.teamworkType ?? 'meeting';
    setEditTarget(record);
    setEditTaskType(type);
    setEditTeamworkType(twType);
    form.setFieldsValue({
      taskType:     type,
      teamworkType: twType,
      ticketKey:    entryKey(record),
      title:        type === 'jira' ? entryTitle(record) : undefined,
      teamworkTask: type === 'teamwork' ? entryTitle(record) : undefined,
      hours:        record.hours   ?? Math.floor(record.timeSpent ?? 0),
      minutes:      record.minutes ?? Math.round(((record.timeSpent ?? 0) % 1) * 60),
      date:         dayjs(record.date),
    });
  }

  async function handleEditSave() {
    const values = await form.validateFields().catch(() => null);
    if (!values || !editTarget) return;

    const h = values.hours ?? 0;
    const m = values.minutes ?? 0;
    const usedElsewhere = getDayUsedMinutes(logs, values.date.format('YYYY-MM-DD'), editTarget.id);
    if (usedElsewhere + h * 60 + m > MAX_DAILY_MINUTES) {
      message.error(`Cannot exceed 8h/day. Only ${minutesToDisplay(MAX_DAILY_MINUTES - usedElsewhere)} remaining.`);
      return;
    }

    setSaving(true);
    try {
      const title = editTaskType === 'jira'
        ? (values.title?.trim() ?? '')
        : (values.teamworkTask?.trim() ?? '');

      const updated = await updateLog(editTarget.id, {
        taskType:     editTaskType,
        ticketKey:    editTaskType === 'jira' ? (values.ticketKey ?? '').trim().toUpperCase() : '',
        title,
        hours:        h,
        minutes:      m,
        timeSpent:    h + m / 60,
        date:         values.date.format('YYYY-MM-DD'),
        teamworkType: editTaskType === 'teamwork' ? editTeamworkType : undefined,
      } as Partial<LogEntryInput>);
      onUpdated(updated);
      setEditTarget(null);
      message.success('Entry updated');
    } catch {
      message.error('Failed to update entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLog(id);
      onDeleted(id);
      message.success('Entry deleted');
    } catch {
      message.error('Failed to delete entry');
    }
  }

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns: ColumnsType<TableRow> = [
    {
      title: 'Date',
      key: 'date',
      width: 160,
      onCell: (row) => ({ rowSpan: row.rowSpan }),
      render: (_, row) => (
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {row.isToday ? `Today` : formatDisplay(row.dayDate)}
          </Typography.Text>
          {row.isToday && (
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {row.dayDate}
            </Typography.Text>
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.dayWorkMinutes > 0 && (
              <Tag color="blue" style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>
                {minutesToDisplay(row.dayWorkMinutes)}
              </Tag>
            )}
            {row.dayTotalMinutes > row.dayWorkMinutes && (
              <Tag color="orange" icon={<CoffeeOutlined />} style={{ fontSize: 11, margin: 0 }}>
                {minutesToDisplay(row.dayTotalMinutes - row.dayWorkMinutes)} off
              </Tag>
            )}
            {row.isToday && todayRemainingMinutes > 0 && (
              <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                {minutesToDisplay(todayRemainingMinutes)} left
              </Tag>
            )}
            {row.isToday && todayRemainingMinutes === 0 && (
              <Tag color="success" style={{ fontSize: 11, margin: 0 }}>Full</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'taskType',
      width: 150,
      render: (_, row) => {
        const type = row.log.taskType ?? (entryKey(row.log) ? 'jira' : 'teamwork');
        if (type === 'takeoff') return <Tag icon={<CoffeeOutlined />} color="orange">Take Off</Tag>;
        return type === 'jira'
          ? <Tag icon={<ThunderboltOutlined />} color="blue">Jira</Tag>
          : <Tag icon={<TeamOutlined />} color="purple">Teamwork</Tag>;
      },
    },
    {
      title: 'Ticket / Task',
      key: 'task',
      ellipsis: true,
      render: (_, row) => {
        if (row.log.taskType === 'takeoff') {
          return (
            <Typography.Text style={{ fontSize: 13, color: '#fa8c16', fontWeight: 500 }}>
              {TAKEOFF_LABELS[row.log.takeoffPeriod ?? 'full']}
            </Typography.Text>
          );
        }
        if (row.log.taskType === 'teamwork') {
          const twType = row.log.teamworkType;
          return (
            <Space size={6}>
              {twType && (
                <Tag color={TEAMWORK_TYPE_COLORS[twType]} style={{ fontWeight: 600 }}>
                  {TEAMWORK_TYPE_LABELS[twType]}
                </Tag>
              )}
              <Typography.Text style={{ fontSize: 13 }}>{entryTitle(row.log) || '—'}</Typography.Text>
            </Space>
          );
        }
        const key   = entryKey(row.log);
        const title = entryTitle(row.log);
        return (
          <Space size={6}>
            {key && <Tag color={tagColor(key)} style={{ fontWeight: 600 }}>{key}</Tag>}
            <Typography.Text style={{ fontSize: 13 }}>{title || '—'}</Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Time',
      key: 'time',
      width: 86,
      align: 'right',
      render: (_, row) => (
        <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>
          {minutesToDisplay(entryMinutes(row.log))}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 76,
      align: 'center',
      render: (_, row) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(row.log)} />
          <Popconfirm
            title="Delete this entry?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(row.log.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Ticket summary columns ───────────────────────────────────────────────
  const ticketColumns: ColumnType<TicketRow>[] = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Typography.Text strong style={{ fontSize: 13 }}>
          {date === todayStr ? 'Today' : formatDisplay(date)}
        </Typography.Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 180,
      sorter: (a, b) => a.taskType.localeCompare(b.taskType),
      render: (type: string, row) => {
        if (type === 'teamwork' && row.teamworkType) {
          return (
            <Space size={4}>
              <Tag icon={<TeamOutlined />} color="purple">Teamwork</Tag>
              <Tag color={TEAMWORK_TYPE_COLORS[row.teamworkType as TeamworkType]} style={{ fontWeight: 600 }}>
                {TEAMWORK_TYPE_LABELS[row.teamworkType as TeamworkType]}
              </Tag>
            </Space>
          );
        }
        return type === 'jira'
          ? <Tag icon={<ThunderboltOutlined />} color="blue">Jira</Tag>
          : <Tag icon={<TeamOutlined />} color="purple">Teamwork</Tag>;
      },
    },
    {
      title: 'Ticket / Task',
      key: 'task',
      sorter: (a, b) => {
        const ka = a.taskType === 'jira' ? a.ticketKey : a.title;
        const kb = b.taskType === 'jira' ? b.ticketKey : b.title;
        return ka.localeCompare(kb);
      },
      render: (_, row) => {
        if (row.taskType === 'jira') {
          return (
            <Space size={6}>
              {row.ticketKey && <Tag color={tagColor(row.ticketKey)} style={{ fontWeight: 600 }}>{row.ticketKey}</Tag>}
              <Typography.Text style={{ fontSize: 13 }}>{row.title || '—'}</Typography.Text>
            </Space>
          );
        }
        return <Typography.Text style={{ fontSize: 13 }}>{row.title || '—'}</Typography.Text>;
      },
    },
    {
      title: 'Time',
      dataIndex: 'minutes',
      key: 'minutes',
      width: 90,
      align: 'right' as const,
      sorter: (a, b) => a.minutes - b.minutes,
      render: (v: number) => <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{minutesToDisplay(v)}</Tag>,
    },
    {
      title: '',
      key: 'copy',
      width: 76,
      align: 'center' as const,
      render: (_, row) => {
        const ticketText = row.taskType === 'jira'
          ? [row.ticketKey, row.title].filter(Boolean).join(' ')
          : row.title;
        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              title="Copy ticket"
              onClick={() => copyText(ticketText)}
            />
            <Button
              type="text"
              size="small"
              icon={<ClockCircleOutlined />}
              title="Copy time"
              onClick={() => copyText(copyTimeStr(row.minutes))}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Card
        title="Time Entries"
        extra={
          <Space>
            <Segmented
              value={viewMode}
              onChange={v => setViewMode(v as 'date' | 'ticket')}
              options={[
                { value: 'date', icon: <UnorderedListOutlined />, label: 'By Date' },
                { value: 'ticket', icon: <TagsOutlined />, label: 'By Ticket' },
              ]}
            />
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 130 }}
              options={availableMonths.map(m => ({ value: m, label: m }))}
            />
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => exportJson(monthLogs, selectedMonth)}
              disabled={monthLogs.length === 0}
            >
              JSON
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              size="small"
              onClick={() => exportCsv(monthLogs, selectedMonth)}
              disabled={monthLogs.length === 0}
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            >
              Excel
            </Button>
            <Input.Search
              placeholder="Search…"
              allowClear
              style={{ width: 200 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </Space>
        }
        styles={{ header: { fontWeight: 600 } }}
      >
        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <Row gutter={16} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
          {[
            { label: 'Month', value: minutesToDisplay(monthTotalMinutes) },
            { label: 'This Week', value: minutesToDisplay(weekTotalMinutes) },
            { label: 'Today', value: minutesToDisplay(todayWorkMinutes) },
            {
              label: 'Today Left',
              value: minutesToDisplay(todayRemainingMinutes),
              color: todayRemainingMinutes === 0 ? '#52c41a' : undefined,
            },
          ].map(({ label, value, color }) => (
            <Col key={label} span={6}>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}
              >
                {label}
              </Typography.Text>
              <Typography.Text strong style={{ fontSize: 20, color }}>
                {value}
              </Typography.Text>
            </Col>
          ))}
        </Row>

        {viewMode === 'ticket' ? (
          <>
          <Table<TicketRow>
            columns={ticketColumns}
            dataSource={ticketRows}
            rowKey="key"
            loading={loading}
            pagination={false}
            size="middle"
            locale={{ emptyText: search ? 'No matching entries' : 'No entries for this month' }}
            rowClassName={row => loggedIds.has(row.key) ? 'row-logged' : ''}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: keys => setSelectedKeys(keys as string[]),
              columnWidth: 40,
            }}
          />
          {selectedKeys.length > 0 && (
            <div style={{
              position: 'sticky', bottom: 0, marginTop: 8,
              background: '#fff', border: '1px solid #E2E8F0',
              borderRadius: 8, padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {selectedKeys.length} selected
              </Typography.Text>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => applyLogged(selectedKeys, true)}
              >
                Mark as Logged
              </Button>
              <Button
                size="small"
                onClick={() => applyLogged(selectedKeys, false)}
              >
                Mark as Unlogged
              </Button>
              <Button size="small" type="text" onClick={() => setSelectedKeys([])}>Clear</Button>
            </div>
          )}
          </>
        ) : (
        <Table<TableRow>
          columns={columns}
          dataSource={tableRows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: search ? 'No matching entries' : 'No entries for this month' }}
          rowClassName={row => row.weekNum % 2 === 0 ? 'row-week-even' : 'row-week-odd'}
        />
        )}
      </Card>

      {/* ── Edit Drawer ─────────────────────────────────────────────────────── */}
      <Drawer
        title="Edit Entry"
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        width={500}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={handleEditSave}>Save Changes</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="taskType" label="Task Type">
            <Select
              options={[
                { value: 'jira',     label: <span><ThunderboltOutlined /> Jira</span> },
                { value: 'teamwork', label: <span><TeamOutlined /> Teamwork</span> },
              ]}
              onChange={(v: TaskType) => setEditTaskType(v)}
            />
          </Form.Item>

          {editTaskType === 'jira' && (
            <>
              <Form.Item name="ticketKey" label="Ticket Key" rules={[{ required: true }]}>
                <Input onChange={e => form.setFieldValue('ticketKey', e.target.value.toUpperCase())} />
              </Form.Item>
              <Form.Item name="title" label="Ticket Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}

          {editTaskType === 'teamwork' && (
            <>
              <Form.Item name="teamworkType" label="Type">
                <Select
                  options={Object.entries(TEAMWORK_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(v: TeamworkType) => setEditTeamworkType(v)}
                />
              </Form.Item>
              <Form.Item name="teamworkTask" label="Name" rules={[{ required: true }]}>
                <AutoComplete
                  options={[
                    ...([] as string[]).concat(TEAMWORK_TYPE_SUGGESTIONS[editTeamworkType]),
                  ].map(p => ({ value: p }))}
                >
                  <Input />
                </AutoComplete>
              </Form.Item>
            </>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="hours" label="Hours" rules={[{ required: true, type: 'number', min: 0, max: 8 }]}>
                <InputNumber min={0} max={8} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minutes" label="Minutes" rules={[{ required: true, type: 'number', min: 0, max: 59 }]}>
                <InputNumber min={0} max={59} step={15} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}

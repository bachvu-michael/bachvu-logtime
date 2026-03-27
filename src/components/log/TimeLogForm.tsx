import { useState, useEffect } from 'react';
import {
  Form, Input, InputNumber, DatePicker, AutoComplete, Select,
  Button, Card, Row, Col, Segmented, Progress, Radio, message, Typography, Tag,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, TeamOutlined, CoffeeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  LogEntry, LogEntryInput, TaskType,
  TeamworkType, TEAMWORK_TYPE_LABELS, TEAMWORK_TYPE_COLORS, TEAMWORK_TYPE_SUGGESTIONS,
  MAX_DAILY_MINUTES, TakeoffPeriod, TAKEOFF_MINUTES, TAKEOFF_LABELS,
} from '../../types';
import { createLog } from '../../api/logs';
import { fetchTasks, TasksStore } from '../../api/tasks';
import { getDayUsedMinutes, minutesToDisplay } from '../../utils/dateHelpers';

interface Props {
  logs: LogEntry[];
  onCreated: (entry: LogEntry) => void;
}

const JIRA_KEY_RE = /^[A-Z]+-\d+$/;
const TEAMWORK_TYPES: TeamworkType[] = ['meeting', 'code_review', 'support'];

export function TimeLogForm({ logs, onCreated }: Props) {
  const [form] = Form.useForm();
  const [taskType, setTaskType]         = useState<TaskType>('jira');
  const [teamworkType, setTeamworkType] = useState<TeamworkType>('meeting');
  const [takeoffPeriod, setTakeoffPeriod] = useState<TakeoffPeriod>('full');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [inputH, setInputH]             = useState(0);
  const [inputM, setInputM]             = useState(0);
  const [submitting, setSubmitting]     = useState(false);
  const [tasks, setTasks]               = useState<TasksStore>({ jira: {}, teamwork: {} });

  useEffect(() => { fetchTasks().then(setTasks); }, []);

  // ── Daily usage ─────────────────────────────────────────────────────────────
  const usedMinutes  = getDayUsedMinutes(logs, selectedDate);
  const inputMinutes = taskType === 'takeoff'
    ? TAKEOFF_MINUTES[takeoffPeriod]
    : (inputH ?? 0) * 60 + (inputM ?? 0);
  const afterMinutes    = usedMinutes + inputMinutes;
  const remainingBefore = Math.max(0, MAX_DAILY_MINUTES - usedMinutes);
  const wouldExceed     = afterMinutes > MAX_DAILY_MINUTES;
  const progressPct     = Math.min(100, Math.round((afterMinutes / MAX_DAILY_MINUTES) * 100));
  const progressStatus  = wouldExceed ? 'exception' : afterMinutes >= MAX_DAILY_MINUTES ? 'success' : 'normal';
  const progressColor   = taskType === 'takeoff'
    ? (wouldExceed ? '#f5222d' : '#fa8c16')
    : (wouldExceed ? '#f5222d' : afterMinutes >= MAX_DAILY_MINUTES ? '#52c41a' : '#4361EE');
  const maxH = Math.floor(Math.max(0, MAX_DAILY_MINUTES - usedMinutes) / 60);

  // ── Autocomplete options ────────────────────────────────────────────────────
  const [jiraKeyInput, setJiraKeyInput]     = useState('');
  const [teamworkNameInput, setTeamworkNameInput] = useState('');

  const jiraKeyOptions = Object.entries(tasks.jira)
    .filter(([key]) => key.includes(jiraKeyInput.toUpperCase()))
    .map(([key, title]) => ({
      value: key,
      label: <span><strong>{key}</strong> — {title}</span>,
    }));

  // Merge stored names + suggestions for the selected teamwork type
  const storedNames    = tasks.teamwork[teamworkType] ?? [];
  const suggestions    = TEAMWORK_TYPE_SUGGESTIONS[teamworkType];
  const teamworkOptions = [...new Set([...storedNames, ...suggestions])]
    .filter(n => n.toLowerCase().includes(teamworkNameInput.toLowerCase()))
    .map(n => ({ value: n }));

  function handleTaskTypeChange(val: string | number) {
    setTaskType(val as TaskType);
    form.resetFields(['ticketKey', 'title', 'teamworkTask']);
    setInputH(0); setInputM(0);
    setTeamworkType('meeting');
    setTakeoffPeriod('full');
  }

  function handleKeySelect(key: string) {
    const title = tasks.jira[key];
    if (title) form.setFieldValue('title', title);
  }

  function handleKeyChange(val: string) {
    const upper = val.toUpperCase();
    form.setFieldValue('ticketKey', upper);
    if (tasks.jira[upper]) form.setFieldValue('title', tasks.jira[upper]);
  }

  async function handleFinish(values: {
    ticketKey?: string;
    title?: string;
    teamworkTask?: string;
    hours?: number;
    minutes?: number;
    date: dayjs.Dayjs;
  }) {
    let h: number, m: number, resolvedTitle: string;

    if (taskType === 'takeoff') {
      const mins = TAKEOFF_MINUTES[takeoffPeriod];
      h = Math.floor(mins / 60); m = mins % 60;
      resolvedTitle = TAKEOFF_LABELS[takeoffPeriod];
    } else {
      h = values.hours ?? 0;
      m = values.minutes ?? 0;
      resolvedTitle = taskType === 'jira'
        ? (values.title?.trim() ?? '')
        : (values.teamworkTask?.trim() ?? '');
    }

    const totalM = h * 60 + m;
    if (totalM === 0) { message.warning('Please enter at least 1 minute.'); return; }
    if (usedMinutes + totalM > MAX_DAILY_MINUTES) {
      message.error(`Only ${minutesToDisplay(remainingBefore)} remaining for ${selectedDate}.`);
      return;
    }

    setSubmitting(true);
    try {
      const entry = await createLog({
        taskType,
        ticketKey:     taskType === 'jira' ? (values.ticketKey ?? '').trim().toUpperCase() : '',
        title:         resolvedTitle,
        hours:         h,
        minutes:       m,
        timeSpent:     h + m / 60,
        date:          values.date.format('YYYY-MM-DD'),
        teamworkType:  taskType === 'teamwork' ? teamworkType : undefined,
        takeoffPeriod: taskType === 'takeoff'  ? takeoffPeriod : undefined,
      } satisfies LogEntryInput);

      onCreated(entry);
      if (taskType !== 'takeoff') fetchTasks().then(setTasks);

      form.resetFields();
      form.setFieldsValue({ date: dayjs(), hours: 0, minutes: 0 });
      setInputH(0); setInputM(0);
      setTeamworkNameInput('');
      message.success(taskType === 'takeoff' ? `${TAKEOFF_LABELS[takeoffPeriod]} logged!` : 'Time entry logged!');
    } catch {
      message.error('Failed to save. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log Time Entry" styles={{ header: { fontWeight: 600 } }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ date: dayjs(), hours: 0, minutes: 0 }}
      >
        {/* ── Task type ──────────────────────────────────────────────────── */}
        <Form.Item label="Task Type" style={{ marginBottom: 20 }}>
          <Segmented
            value={taskType}
            onChange={handleTaskTypeChange}
            options={[
              { value: 'jira',     label: <span><ThunderboltOutlined /> Jira</span> },
              { value: 'teamwork', label: <span><TeamOutlined /> Teamwork</span> },
              { value: 'takeoff',  label: <span><CoffeeOutlined /> Take Off</span> },
            ]}
          />
        </Form.Item>

        {/* ── Jira fields ─────────────────────────────────────────────────── */}
        {taskType === 'jira' && (
          <Row gutter={16}>
            <Col xs={24} sm={10} md={7}>
              <Form.Item
                name="ticketKey"
                label="Ticket Key"
                rules={[
                  { required: true, message: 'Ticket key is required' },
                  { pattern: JIRA_KEY_RE, message: 'Format: DS-1234' },
                ]}
              >
                <AutoComplete
                  options={jiraKeyOptions}
                  onSelect={handleKeySelect}
                  onChange={(val) => { setJiraKeyInput(val); handleKeyChange(val); }}
                >
                  <Input
                    placeholder="DS-1234"
                    style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col xs={24} sm={14} md={17}>
              <Form.Item
                name="title"
                label="Ticket Name"
                rules={[{ required: true, message: 'Ticket name is required' }]}
              >
                <Input placeholder="Fix login redirect after session expiry" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── Teamwork fields ─────────────────────────────────────────────── */}
        {taskType === 'teamwork' && (
          <Row gutter={16}>
            <Col xs={24} sm={8} md={6}>
              <Form.Item label="Type">
                <Select
                  value={teamworkType}
                  onChange={(v: TeamworkType) => { setTeamworkType(v); form.resetFields(['teamworkTask']); setTeamworkNameInput(''); }}
                  options={TEAMWORK_TYPES.map(t => ({
                    value: t,
                    label: <Tag color={TEAMWORK_TYPE_COLORS[t]} style={{ margin: 0 }}>{TEAMWORK_TYPE_LABELS[t]}</Tag>,
                  }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16} md={18}>
              <Form.Item
                name="teamworkTask"
                label="Name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <AutoComplete
                  options={teamworkOptions}
                  placeholder={`e.g. ${TEAMWORK_TYPE_SUGGESTIONS[teamworkType][0]}`}
                  onChange={setTeamworkNameInput}
                >
                  <Input />
                </AutoComplete>
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── Takeoff fields ──────────────────────────────────────────────── */}
        {taskType === 'takeoff' && (
          <Form.Item label="Period">
            <Radio.Group
              value={takeoffPeriod}
              onChange={e => setTakeoffPeriod(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="morning">🌅 Morning (4h)</Radio.Button>
              <Radio.Button value="afternoon">🌇 Afternoon (4h)</Radio.Button>
              <Radio.Button value="full">☀️ Full Day (8h)</Radio.Button>
            </Radio.Group>
          </Form.Item>
        )}

        {/* ── Date + Time + Submit ─────────────────────────────────────────── */}
        <Row gutter={16} align="bottom">
          <Col xs={24} sm={12} md={4}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                onChange={d => d && setSelectedDate(d.format('YYYY-MM-DD'))}
              />
            </Form.Item>
          </Col>

          {taskType !== 'takeoff' && <>
            <Col xs={12} sm={6} md={3}>
              <Form.Item
                name="hours"
                label={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Hours
                    {remainingBefore > 0 && (
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, height: 'auto', fontSize: 11, lineHeight: 1 }}
                        onClick={() => {
                          const h = Math.floor(remainingBefore / 60);
                          const m = remainingBefore % 60;
                          form.setFieldsValue({ hours: h, minutes: m });
                          setInputH(h);
                          setInputM(m);
                        }}
                      >
                        {minutesToDisplay(remainingBefore)} left
                      </Button>
                    )}
                  </span>
                }
                rules={[{ required: true, type: 'number', min: 0, max: maxH }]}
              >
                <InputNumber min={0} max={maxH} step={1} style={{ width: '100%' }} onChange={v => setInputH(v ?? 0)} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Item name="minutes" label="Minutes" rules={[{ required: true, type: 'number', min: 0, max: 59 }]}>
                <InputNumber min={0} max={59} step={15} style={{ width: '100%' }} onChange={v => setInputM(v ?? 0)} />
              </Form.Item>
            </Col>
          </>}

          {taskType === 'takeoff' && (
            <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
              <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>
                {minutesToDisplay(TAKEOFF_MINUTES[takeoffPeriod])} reserved · not counted as work
              </Tag>
            </Col>
          )}

          <Col xs={24} md={taskType === 'takeoff' ? 10 : 8} style={{ paddingBottom: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              block
              loading={submitting}
              disabled={wouldExceed || (taskType !== 'takeoff' && inputMinutes === 0)}
              danger={taskType === 'takeoff'}
            >
              {taskType === 'takeoff' ? `Log ${TAKEOFF_LABELS[takeoffPeriod]}` : 'Add Entry'}
            </Button>
          </Col>
        </Row>

        {/* ── Daily progress ──────────────────────────────────────────────── */}
        <div className={`daily-progress${wouldExceed ? ' daily-progress--danger' : ''}`}>
          <div className="daily-progress__header">
            <Typography.Text className="daily-progress__label">
              {selectedDate} — daily usage
            </Typography.Text>
            <Typography.Text className="daily-progress__right" type={wouldExceed ? 'danger' : undefined}>
              {wouldExceed
                ? `⚠ Exceeds limit by ${minutesToDisplay(afterMinutes - MAX_DAILY_MINUTES)}`
                : `${minutesToDisplay(afterMinutes)} / 8h · ${minutesToDisplay(Math.max(0, MAX_DAILY_MINUTES - afterMinutes))} left`}
            </Typography.Text>
          </div>
          <Progress
            percent={progressPct}
            status={progressStatus}
            strokeColor={progressColor}
            showInfo={false}
            size={['100%', 8]}
            style={{ marginTop: 8 }}
          />
          <div className="daily-progress__segments">
            <span className="daily-progress__seg daily-progress__seg--used">
              Logged: {minutesToDisplay(usedMinutes)}
            </span>
            {inputMinutes > 0 && (
              <span className={`daily-progress__seg daily-progress__seg--new${wouldExceed ? '--over' : ''}`}>
                + {taskType === 'takeoff' ? TAKEOFF_LABELS[takeoffPeriod] : 'This entry'}: {minutesToDisplay(inputMinutes)}
              </span>
            )}
            <span className="daily-progress__seg daily-progress__seg--max">Max: 8h</span>
          </div>
        </div>
      </Form>
    </Card>
  );
}

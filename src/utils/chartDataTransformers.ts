import { LogEntry, TEAMWORK_TYPE_LABELS } from '../types';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';

export interface TicketData { ticketId: string; hours: number; kind: 'jira' | 'teamwork' | 'takeoff'; title?: string }

// ── Time-per-day (stacked by task) ───────────────────────────────────────────
export type DayRow = Record<string, string | number>;   // always has 'date' & 'label' string fields

export interface TaskSeries {
  key:   string;
  name:  string;
  color: string;
  kind:  'jira' | 'teamwork' | 'takeoff';
}

export interface TimePerDayResult { rows: DayRow[]; series: TaskSeries[] }

/** Normalise timeSpent regardless of old (decimal) or new (hours+minutes) shape. */
function timeSpent(log: LogEntry): number {
  if (log.hours !== undefined) return log.hours + (log.minutes ?? 0) / 60;
  return log.timeSpent ?? 0;
}

/** Returns the grouping key and kind for a log entry. */
function entryGroup(log: LogEntry): { key: string; kind: 'jira' | 'teamwork' | 'takeoff' } {
  if (log.taskType === 'takeoff') return { key: 'Time Off', kind: 'takeoff' };
  if (log.taskType === 'teamwork') {
    const label = log.teamworkType ? TEAMWORK_TYPE_LABELS[log.teamworkType] : 'Teamwork';
    return { key: label, kind: 'teamwork' };
  }
  // jira (or legacy entries with a ticketKey)
  const key = log.ticketKey || (log as unknown as Record<string, string>).ticketId || '—';
  return { key, kind: 'jira' };
}

export function toTimePerTicket(logs: LogEntry[]): TicketData[] {
  const map: Record<string, { hours: number; kind: 'jira' | 'teamwork' | 'takeoff'; title?: string }> = {};
  for (const log of logs) {
    const { key, kind } = entryGroup(log);
    if (!map[key]) map[key] = { hours: 0, kind, title: kind === 'jira' ? (log.title || undefined) : undefined };
    map[key].hours += timeSpent(log);
  }
  return Object.entries(map)
    .map(([ticketId, { hours, kind, title }]) => ({ ticketId, hours: Math.round(hours * 100) / 100, kind, title }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 15);
}

type FilterParam =
  | { days: number }
  | { start: string; end: string }
  | 'all';

const JIRA_COLORS     = ['#1677ff', '#0958d9', '#4096ff', '#003eb3', '#69b1ff', '#1d39c4', '#0d5bd1', '#91caff'];
const TEAMWORK_COLORS = ['#722ed1', '#531dab', '#9254de', '#391085', '#b37feb', '#c41d7f'];
const TAKEOFF_COLOR   = '#fa8c16';

function taskKey(log: LogEntry): string {
  if (log.taskType === 'takeoff')  return 'off';
  if (log.taskType === 'teamwork') {
    const name = log.title?.trim() || (log.teamworkType ? TEAMWORK_TYPE_LABELS[log.teamworkType] : 'Teamwork');
    return `t::${name}`;
  }
  return `j::${log.ticketKey || (log as unknown as Record<string, string>).ticketId || '—'}`;
}

function taskName(log: LogEntry): string {
  if (log.taskType === 'takeoff')  return 'Time Off';
  if (log.taskType === 'teamwork') return log.title?.trim() || (log.teamworkType ? TEAMWORK_TYPE_LABELS[log.teamworkType] : 'Teamwork');
  return log.ticketKey || (log as unknown as Record<string, string>).ticketId || '—';
}

function taskKind(log: LogEntry): 'jira' | 'teamwork' | 'takeoff' {
  return log.taskType === 'takeoff' ? 'takeoff' : log.taskType === 'teamwork' ? 'teamwork' : 'jira';
}

export function toTimePerDay(logs: LogEntry[], filter: FilterParam = { days: 30 }): TimePerDayResult {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Determine date range
  let startStr: string | null = null;
  let endStr: string | null = null;
  let fillAllDays = false;

  if (filter !== 'all' && 'days' in filter) {
    startStr = format(subDays(today, filter.days - 1), 'yyyy-MM-dd');
    endStr   = todayStr;
    fillAllDays = true;
  } else if (filter !== 'all' && 'start' in filter) {
    startStr = filter.start;
    endStr   = filter.end;
    fillAllDays = true;
  }

  // Filter logs to range
  const inRange = logs.filter(l =>
    (!startStr || l.date >= startStr) && (!endStr || l.date <= endStr)
  );

  // Build map: date → taskKey → hours
  const dateMap: Record<string, Record<string, number>> = {};
  const taskMeta: Record<string, { name: string; kind: 'jira' | 'teamwork' | 'takeoff' }> = {};

  for (const log of inRange) {
    const k = taskKey(log);
    if (!dateMap[log.date]) dateMap[log.date] = {};
    dateMap[log.date][k] = (dateMap[log.date][k] ?? 0) + timeSpent(log);
    if (!taskMeta[k]) taskMeta[k] = { name: taskName(log), kind: taskKind(log) };
  }

  // Build date list
  let dates: string[];
  if (fillAllDays && startStr && endStr) {
    dates = eachDayOfInterval({ start: parseISO(startStr), end: parseISO(endStr) })
      .map(d => format(d, 'yyyy-MM-dd'));
  } else {
    dates = Object.keys(dateMap).sort();
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const rows: DayRow[] = dates.map(date => {
    const row: DayRow = { date, label: format(parseISO(date), 'MMM d') };
    for (const [k, h] of Object.entries(dateMap[date] ?? {})) {
      row[k] = round(h);
    }
    return row;
  });

  // Compute totals per task for sort order
  const totals: Record<string, number> = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (k !== 'date' && k !== 'label' && typeof v === 'number') {
        totals[k] = (totals[k] ?? 0) + v;
      }
    }
  }

  // Build series grouped by kind, sorted by total desc within each kind
  const byKind = (kind: 'jira' | 'teamwork' | 'takeoff') =>
    Object.entries(taskMeta)
      .filter(([, m]) => m.kind === kind)
      .sort(([a], [b]) => (totals[b] ?? 0) - (totals[a] ?? 0));

  const series: TaskSeries[] = [
    ...byKind('jira')    .map(([k, m], i) => ({ key: k, name: m.name, color: JIRA_COLORS[i % JIRA_COLORS.length],         kind: 'jira'     as const })),
    ...byKind('teamwork').map(([k, m], i) => ({ key: k, name: m.name, color: TEAMWORK_COLORS[i % TEAMWORK_COLORS.length],   kind: 'teamwork' as const })),
    ...byKind('takeoff') .map(([k, m])    => ({ key: k, name: m.name, color: TAKEOFF_COLOR,                                kind: 'takeoff'  as const })),
  ];

  return { rows, series };
}


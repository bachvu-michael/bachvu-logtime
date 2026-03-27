import { LogEntry, TEAMWORK_TYPE_LABELS, TAKEOFF_LABELS } from '../types';

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function entryHours(log: LogEntry): number {
  return log.hours !== undefined ? log.hours : Math.floor(log.timeSpent ?? 0);
}
function entryMinutes(log: LogEntry): number {
  return log.minutes !== undefined ? log.minutes : Math.round(((log.timeSpent ?? 0) % 1) * 60);
}
function entryCategory(log: LogEntry): string {
  if (log.taskType === 'takeoff') return TAKEOFF_LABELS[log.takeoffPeriod ?? 'full'];
  if (log.taskType === 'teamwork') return log.teamworkType ? TEAMWORK_TYPE_LABELS[log.teamworkType] : 'Teamwork';
  return log.ticketKey || '—';
}
function entryTypeLabel(log: LogEntry): string {
  if (log.taskType === 'takeoff') return 'Take Off';
  if (log.taskType === 'teamwork') return 'Teamwork';
  return 'Jira';
}

export function exportJson(logs: LogEntry[], month: string) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  downloadBlob(JSON.stringify(sorted, null, 2), `logtime-${month}.json`, 'application/json');
}

export function exportCsv(logs: LogEntry[], month: string) {
  const headers = ['Date', 'Type', 'Category', 'Ticket Key', 'Title', 'Hours', 'Minutes', 'Time Spent (h)'];

  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map(log => [
      log.date,
      entryTypeLabel(log),
      entryCategory(log),
      log.ticketKey || '',
      log.title || '',
      entryHours(log),
      entryMinutes(log),
      (entryHours(log) + entryMinutes(log) / 60).toFixed(2),
    ].map(escape).join(','));

  downloadBlob([headers.join(','), ...rows].join('\n'), `logtime-${month}.csv`, 'text/csv;charset=utf-8;');
}

import { format, parseISO, subDays } from 'date-fns';
import { LogEntry, MAX_DAILY_MINUTES } from '../types';

export function formatDisplay(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'MMM d, yyyy');
  } catch {
    return isoDate;
  }
}

export function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Convert raw minutes to display string: 90 → "1h 30m" */
export function minutesToDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return days;
}

/** Returns already-logged minutes for a given date, optionally excluding one entry (for edit). */
export function getDayUsedMinutes(logs: LogEntry[], date: string, excludeId?: string): number {
  return logs
    .filter(l => l.date === date && l.id !== excludeId)
    .reduce((sum, l) => sum + (l.hours * 60 + l.minutes), 0);
}

/** Remaining minutes available for a day. */
export function getDayRemainingMinutes(logs: LogEntry[], date: string, excludeId?: string): number {
  return Math.max(0, MAX_DAILY_MINUTES - getDayUsedMinutes(logs, date, excludeId));
}

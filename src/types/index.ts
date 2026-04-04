export type TaskType = 'jira' | 'teamwork' | 'takeoff';

// ── Teamwork ──────────────────────────────────────────────────────────────────
export type TeamworkType = 'meeting' | 'code_review' | 'support';

export const TEAMWORK_TYPE_LABELS: Record<TeamworkType, string> = {
  meeting:     'Meeting',
  code_review: 'Code Review',
  support:     'Support',
};

/** Tag colors per teamwork type */
export const TEAMWORK_TYPE_COLORS: Record<TeamworkType, string> = {
  meeting:     'blue',
  code_review: 'cyan',
  support:     'geekblue',
};

/** Default name suggestions per type */
export const TEAMWORK_TYPE_SUGGESTIONS: Record<TeamworkType, string[]> = {
  meeting:     ['Daily Meeting', 'Weekly Meeting', 'Sprint Planning', 'Sprint Retrospective', 'Sprint Review', 'One-on-one'],
  code_review: ['Code Review', 'PR Review', 'Architecture Review'],
  support:     ['Customer Support', 'Bug Triage', 'Incident Response'],
};

// ── Takeoff ───────────────────────────────────────────────────────────────────
export type TakeoffPeriod = 'full' | 'morning' | 'afternoon';

export const TAKEOFF_MINUTES: Record<TakeoffPeriod, number> = {
  full:      480,
  morning:   240,
  afternoon: 240,
};

export const TAKEOFF_LABELS: Record<TakeoffPeriod, string> = {
  full:      'Full Day Off',
  morning:   'Morning Off',
  afternoon: 'Afternoon Off',
};

// ── Log entry ─────────────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  taskType: TaskType;
  ticketKey: string;            // 'DS-1234' for jira; '' for teamwork/takeoff
  title: string;                // ticket name / task name / takeoff label
  hours: number;                // 0–8
  minutes: number;              // 0–59
  timeSpent: number;            // hours + minutes/60
  date: string;                 // YYYY-MM-DD
  teamworkType?: TeamworkType;  // only for taskType === 'teamwork'
  takeoffPeriod?: TakeoffPeriod; // only for taskType === 'takeoff'
  createdAt: number;
}

export type LogEntryInput = Omit<LogEntry, 'id' | 'createdAt'>;

export const MAX_DAILY_MINUTES = 480; // 8h

// ── Invoice ───────────────────────────────────────────────────────────────────
export type InvoiceType = 'invoice' | 'credit_note';
export type InvoiceStatus = 'pending' | 'paid' | 'overtime';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending:  'Pending',
  paid:     'Paid',
  overtime: 'Overtime',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending:  'orange',
  paid:     'green',
  overtime: 'red',
};
export interface InvoiceItem {
  description: string;
  price: number;      // price in VND
  quantity: number;
}

export interface Invoice {
  id: string;
  invoiceType: InvoiceType; // 'invoice' | 'credit_note'
  domain: string;           // client / project domain
  total: number;            // sum of price * quantity across items
  items: InvoiceItem[];
  datetime: string;         // YYYY-MM-DD
  description?: string;     // shown in the Note section of the invoice
  status: InvoiceStatus;
  createdAt: number;
}

export type InvoiceInput = Omit<Invoice, 'id' | 'createdAt'>;

// ── Bills ─────────────────────────────────────────────────────────────────────
export type BillType = 'electric' | 'water';

export type BillLocation = 'home' | 'room' | 'other';

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  electric: 'Electric',
  water:    'Water',
};

export const BILL_TYPE_COLORS: Record<BillType, string> = {
  electric: 'gold',
  water:    'blue',
};

export const BILL_TYPE_HEX: Record<BillType, string> = {
  electric: '#F59E0B',
  water:    '#3B82F6',
};

export const BILL_LOCATION_LABELS: Record<BillLocation, string> = {
  home:   'Home',
  room:   'Room',
  other:  'Other',
};

export const BILL_LOCATIONS: BillLocation[] = ['home', 'room', 'other'];

export interface BillName {
  id:        string;
  name:      string;
  createdAt: number;
}

export interface Bill {
  id:        string;
  billType:  BillType;
  location:  BillLocation;
  name?:     string;
  amount:    number;       // in VND
  billMonth: string;       // YYYY-MM — the month this bill covers
  paidDate:  string;       // YYYY-MM-DD — when it was actually paid
  note?:     string;
  createdAt: number;
}

export type BillInput = Omit<Bill, 'id' | 'createdAt'>;

// ── Personal Events ───────────────────────────────────────────────────────────
export type EventReminder = 'none' | 'on_day' | '1_day' | '3_days' | '1_week' | 'on_miss';

export const EVENT_REMINDER_LABELS: Record<EventReminder, string> = {
  none:    'Không nhắc',
  on_day:  'Nhắc vào ngày diễn ra',
  '1_day': 'Nhắc trước 1 ngày',
  '3_days':'Nhắc trước 3 ngày',
  '1_week':'Nhắc trước 1 tuần',
  on_miss: 'Nhắc khi bỏ lỡ',
};

export interface PersonalEvent {
  id:          string;
  title:       string;
  date:        string;          // YYYY-MM-DD
  time?:       string;          // HH:MM
  eventType:   string;          // EventType.name
  description?: string;
  reminder:    EventReminder;
  completed:   boolean;
  createdAt:   number;
}

export type PersonalEventInput = Omit<PersonalEvent, 'id' | 'createdAt'>;

export interface EventType {
  id:        string;
  name:      string;
  color:     string;
  createdAt: number;
}

export const DEFAULT_EVENT_TYPES: Omit<EventType, 'id' | 'createdAt'>[] = [
  { name: 'Sức khoẻ',  color: '#3B82F6' },
  { name: 'Sinh nhật', color: '#EC4899' },
  { name: 'Hẹn gặp',  color: '#8B5CF6' },
  { name: 'Nhắc việc', color: '#F59E0B' },
  { name: 'Du lịch',  color: '#10B981' },
  { name: 'Khác',     color: '#64748B' },
];

export const EVENT_TYPE_PALETTE = [
  '#3B82F6','#EC4899','#8B5CF6','#F59E0B','#10B981','#EF4444',
  '#06B6D4','#F97316','#84CC16','#64748B','#A855F7','#14B8A6',
];

/** Return true when an event's reminder is currently active */
export function isActiveReminder(event: PersonalEvent, today: string): boolean {
  if (event.completed || event.reminder === 'none') return false;
  if (event.reminder === 'on_miss') return today > event.date;
  const offsets: Record<string, number> = { on_day: 0, '1_day': 1, '3_days': 3, '1_week': 7 };
  const offset = offsets[event.reminder] ?? 0;
  const d = new Date(event.date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - offset);
  const reminderStart = d.toISOString().split('T')[0];
  return today >= reminderStart && today <= event.date;
}

// ── Cycle (Billings Method) ───────────────────────────────────────────────────
export type CycleBleeding  = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type CycleMucus     = 'none' | 'sticky' | 'creamy' | 'watery' | 'egg_white';
export type CycleSensation = 'dry' | 'moist' | 'wet' | 'slippery';

export const CYCLE_BLEEDING_LABELS: Record<CycleBleeding, string> = {
  none:     'Không có',
  spotting: 'Lấm tấm',
  light:    'Nhẹ',
  medium:   'Vừa',
  heavy:    'Nhiều',
};

export const CYCLE_MUCUS_LABELS: Record<CycleMucus, string> = {
  none:      'Không có',
  sticky:    'Đặc / Dính',
  creamy:    'Kem / Đục',
  watery:    'Lỏng / Trong',
  egg_white: 'Giống lòng trắng trứng',
};

export const CYCLE_SENSATION_LABELS: Record<CycleSensation, string> = {
  dry:      'Khô',
  moist:    'Ẩm',
  wet:      'Ướt',
  slippery: 'Trơn / Nhớt',
};

export const CYCLE_BLEEDING_COLORS: Record<CycleBleeding, string> = {
  none:     'transparent',
  spotting: '#FECACA',
  light:    '#FCA5A5',
  medium:   '#F87171',
  heavy:    '#DC2626',
};

export const CYCLE_MUCUS_COLORS: Record<CycleMucus, string> = {
  none:      'transparent',
  sticky:    '#D1FAE5',
  creamy:    '#A7F3D0',
  watery:    '#67E8F9',
  egg_white: '#2DD4BF',
};

export interface CycleEntry {
  id:        string;
  date:      string;        // YYYY-MM-DD
  bleeding:  CycleBleeding;
  mucus:     CycleMucus;
  sensation: CycleSensation;
  isPeakDay: boolean;
  note?:     string;
  createdAt: number;
}

export type CycleEntryInput = Omit<CycleEntry, 'id' | 'createdAt'>;

export const CYCLE_BLEEDING_OPTIONS: CycleBleeding[] = ['none', 'spotting', 'light', 'medium', 'heavy'];
export const CYCLE_MUCUS_OPTIONS:    CycleMucus[]    = ['none', 'sticky', 'creamy', 'watery', 'egg_white'];
export const CYCLE_SENSATION_OPTIONS: CycleSensation[] = ['dry', 'moist', 'wet', 'slippery'];

export const BILL_NAME_COLORS = [
  '#4361EE', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#84CC16',
];

export function getBillNameColor(allNames: string[], name: string): string {
  const idx = allNames.indexOf(name);
  return BILL_NAME_COLORS[idx % BILL_NAME_COLORS.length] ?? '#64748B';
}

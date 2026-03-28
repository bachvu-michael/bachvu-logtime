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

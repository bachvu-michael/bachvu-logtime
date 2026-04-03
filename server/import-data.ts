/**
 * One-time migration: import existing JSON data files into MySQL via Prisma.
 *
 * Usage:
 *   npx tsx server/import-data.ts
 *
 * Safe to re-run — uses upsert/skipDuplicates so existing rows are not overwritten.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import type { LogEntry, Invoice } from '../src/types/index.js';

// ─── Load .env ────────────────────────────────────────────────────────────────
const envFile = path.join(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([^=#\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const prisma = new PrismaClient();
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readJson<T>(file: string): T | null {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as T;
  } catch {
    console.warn(`  ⚠ Could not parse ${file}`);
    return null;
  }
}

function toDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00.000Z');
}

// ─── 1. Log entries ───────────────────────────────────────────────────────────
async function importLogs() {
  const files = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}-\d{2}\.json$/.test(f));
  let total = 0;

  for (const file of files) {
    const entries = readJson<LogEntry[]>(file);
    if (!entries?.length) continue;

    const result = await prisma.logEntry.createMany({
      data: entries.map(e => ({
        id:            e.id,
        taskType:      e.taskType,
        ticketKey:     e.ticketKey ?? '',
        title:         e.title ?? '',
        hours:         e.hours ?? 0,
        minutes:       e.minutes ?? 0,
        timeSpent:     e.timeSpent ?? 0,
        date:          toDate(e.date),
        teamworkType:  e.teamworkType ?? null,
        takeoffPeriod: e.takeoffPeriod ?? null,
        createdAt:     e.createdAt,
      })),
      skipDuplicates: true,
    });

    console.log(`  ${file}: ${result.count} log entries imported`);
    total += result.count;
  }

  console.log(`  Total log entries: ${total}`);
}

// ─── 2. Task cache ────────────────────────────────────────────────────────────
async function importTasks() {
  const store = readJson<{
    jira?: Record<string, string>;
    teamwork?: Record<string, string[]>;
  }>('tasks.json');

  if (!store) { console.log('  tasks.json not found — skipping'); return; }

  // Jira tasks
  const jiraEntries = Object.entries(store.jira ?? {});
  if (jiraEntries.length) {
    const result = await prisma.jiraTask.createMany({
      data: jiraEntries.map(([ticketKey, title]) => ({ ticketKey, title })),
      skipDuplicates: true,
    });
    console.log(`  Jira tasks: ${result.count} imported`);
  }

  // Teamwork tasks
  const teamworkRows: { teamworkType: string; name: string }[] = [];
  for (const [type, names] of Object.entries(store.teamwork ?? {})) {
    for (const name of names) teamworkRows.push({ teamworkType: type, name });
  }
  if (teamworkRows.length) {
    const result = await prisma.teamworkTask.createMany({
      data: teamworkRows,
      skipDuplicates: true,
    });
    console.log(`  Teamwork tasks: ${result.count} imported`);
  }
}

// ─── 3. Invoices ──────────────────────────────────────────────────────────────
async function importInvoices() {
  const invoices = readJson<Invoice[]>('invoices.json');
  if (!invoices?.length) { console.log('  invoices.json not found or empty — skipping'); return; }

  let imported = 0;
  for (const inv of invoices) {
    // Skip if already exists
    const exists = await prisma.invoice.findUnique({ where: { id: inv.id } });
    if (exists) { console.log(`  Invoice ${inv.id} already exists — skipping`); continue; }

    await prisma.invoice.create({
      data: {
        id:          inv.id,
        invoiceType: inv.invoiceType ?? 'invoice',
        domain:      inv.domain ?? '',
        total:       inv.total ?? 0,
        datetime:    toDate(inv.datetime),
        description: inv.description || null,
        status:      inv.status ?? 'pending',
        createdAt:   inv.createdAt,
        items: {
          create: (inv.items ?? []).map(item => ({
            description: item.description ?? '',
            price:       item.price ?? 0,
            quantity:    item.quantity ?? 1,
          })),
        },
      },
    });
    imported++;
  }

  console.log(`  Invoices: ${imported} imported`);
}

// ─── 4. Bills ─────────────────────────────────────────────────────────────────
async function importBills() {
  const bills = readJson<Array<{
    id: string; billType: string; location: string; name?: string;
    amount: number; billMonth: string; paidDate: string; note?: string; createdAt: number;
  }>>('bills.json');

  if (!bills?.length) { console.log('  bills.json not found or empty — skipping'); return; }

  const result = await prisma.bill.createMany({
    data: bills.map(b => ({
      id:        b.id,
      billType:  b.billType,
      location:  b.location,
      name:      b.name ?? null,
      amount:    b.amount,
      billMonth: b.billMonth,
      paidDate:  toDate(b.paidDate),
      note:      b.note ?? null,
      createdAt: b.createdAt,
    })),
    skipDuplicates: true,
  });
  console.log(`  Bills: ${result.count} imported`);

  // Also import bill names if present
  const billNames = readJson<Array<{ id: string; name: string; createdAt: number }>>('bill-names.json');
  if (billNames?.length) {
    const namesResult = await prisma.billName.createMany({
      data: billNames.map(n => ({ id: n.id, name: n.name, createdAt: n.createdAt })),
      skipDuplicates: true,
    });
    console.log(`  Bill names: ${namesResult.count} imported`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting data import...\n');

  console.log('Importing log entries...');
  await importLogs();

  console.log('\nImporting task cache...');
  await importTasks();

  console.log('\nImporting invoices...');
  await importInvoices();

  console.log('\nImporting bills...');
  await importBills();

  console.log('\nDone.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

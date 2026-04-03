import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { prisma } from './prisma.js';
import logsRouter from './routes/logs.js';
import tasksRouter from './routes/tasks.js';
import invoicesRouter from './routes/invoices.js';
import pdfRouter from './routes/pdf.js';
import billsRouter from './routes/bills.js';
import billNamesRouter from './routes/billNames.js';
import cyclesRouter from './routes/cycles.js';
import { authRouter, requireAuth } from './auth.js';

// Load .env if present (no dotenv dependency needed)
const envFile = path.join(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([^=#\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/logs',     requireAuth, logsRouter);
app.use('/api/tasks',    requireAuth, tasksRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);
app.use('/api/pdf',      requireAuth, pdfRouter);
app.use('/api/bills',      requireAuth, billsRouter);
app.use('/api/bill-names', requireAuth, billNamesRouter);
app.use('/api/cycles',     requireAuth, cyclesRouter);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// In production, bind to localhost only — Nginx proxies /api externally
const HOST = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';

prisma.$connect()
  .then(() => {
    console.log('Connected to database');
    app.listen(PORT, HOST, () => {
      const authStatus = process.env.APP_PASSWORD ? 'password protected' : 'no auth';
      console.log(`LogTime API running on http://${HOST}:${PORT} (${authStatus})`);
    });
  })
  .catch((err: unknown) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

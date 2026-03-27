import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logsRouter from './routes/logs.js';
import tasksRouter from './routes/tasks.js';
import { authRouter, requireAuth } from './auth.js';

// Load .env if present (no dotenv dependency needed)
const envFile = path.join(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([^=#\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const app = express();
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/logs', requireAuth, logsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  const authStatus = process.env.APP_PASSWORD ? 'password protected' : 'no auth';
  console.log(`LogTime server running on http://localhost:${PORT} (${authStatus})`);
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start both Vite (port 5173) and Express (port 3001) concurrently
npm run dev:client    # Start Vite dev server only
npm run dev:server    # Start Express server only (with file watching via tsx)
npm run build         # Production build
npm run preview       # Preview production build
```

No test runner is configured in this project.

## Architecture

**LogTime** is a local fullstack time-tracking app for logging hours against Jira tickets and team activities.

### Stack
- **Frontend:** React 19 + TypeScript, Vite 8, Ant Design v6, Recharts, Tailwind CSS + SCSS
- **Backend:** Express 5 + TypeScript (Node.js), file-based JSON storage
- **Dev:** `concurrently` runs both servers; Vite proxies `/api` → `http://localhost:3001`

### Data Storage
All data lives in `data/` as monthly JSON files (`YYYY-MM.json`) plus a `tasks.json` cache for autocomplete. There is no database. The server reads/writes these files directly on each API request.

### Core Data Model (`src/types/index.ts`)
```typescript
LogEntry {
  id: string            // UUID
  taskType: 'jira' | 'teamwork' | 'takeoff'
  ticketKey: string     // e.g. 'DS-1234', empty for non-Jira
  title: string
  hours: number
  minutes: number
  timeSpent: number     // decimal: hours + minutes/60
  date: string          // YYYY-MM-DD
  teamworkType?: 'meeting' | 'code_review' | 'support'
  takeoffPeriod?: 'full' | 'morning' | 'afternoon'
  createdAt: number     // timestamp
}
```

### API Endpoints (`server/routes/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/logs?month=YYYY-MM` | Fetch logs (optional month filter) |
| GET | `/api/logs/months` | List months that have data |
| POST | `/api/logs` | Create log entry |
| PUT | `/api/logs/:id` | Update log (moves file if date changes month) |
| DELETE | `/api/logs/:id` | Delete log entry |
| GET | `/api/tasks` | Fetch task autocomplete cache |

### Frontend Structure
- `src/App.tsx` — Ant Design Layout with collapsible sidebar navigation
- `src/pages/` — Four pages: Dashboard, LogTime, Calendar, PromptPage
- `src/components/dashboard/` — Stats cards and Recharts visualizations
- `src/components/log/` — `TimeLogForm` (create/validate) and `TimeLogTable` (list/edit/delete)
- `src/components/calendar/CalendarView.tsx` — Monthly calendar view
- `src/api/` — Fetch-based API client functions
- `src/utils/` — Chart data transformers and date helpers
- `src/styles/` — SCSS partials (`_variables`, `_base`, `_components`, `_mixins`)

### TypeScript Config
Two separate tsconfig files: `tsconfig.app.json` (frontend, `moduleResolution: bundler`) and `tsconfig.server.json` (backend, `moduleResolution: node16`). The root `tsconfig.json` references both.

### Auth System
Token-based auth controlled by `APP_PASSWORD` env var. If unset, auth is disabled (no login required).
- `server/auth.ts` — token store (`Set<string>`), `authRouter` (`/api/auth/*`), `requireAuth` middleware
- `src/utils/authFetch.ts` — wraps `fetch` to inject `Authorization: Bearer <token>`; auto-reloads on 401
- `src/api/auth.ts` — `checkAuthRequired`, `login`, `logout`, `isAuthenticated`
- `src/App.tsx` — checks auth on mount via `GET /api/auth/status`, shows `LoginPage` if needed
- Token stored in `localStorage` under key `logtime_token`

### Production / Deployment
- `npm run start` — runs Express in `NODE_ENV=production`; Express serves `dist/` as static + SPA fallback
- `server/index.ts` loads `.env` from project root automatically (no dotenv package)
- See `DEPLOY.md` for full Linux deployment guide; `deploy.sh` for one-shot setup script

### Next Request

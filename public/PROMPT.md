# Reusable Prompt — Local Time Tracker / CRUD App with File Storage

Use this prompt as a starting point whenever you want to build a similar **local fullstack web app** with React + TypeScript + Ant Design, an Express backend, and file-based storage.

---

## The Prompt

```
Build a local fullstack web application called [APP NAME] using the following stack:

**Frontend:**
- React 19 + TypeScript (Vite)
- Ant Design v6 for all UI components
- Recharts for charts/visualisations
- date-fns for date formatting

**Backend:**
- Node.js + Express (TypeScript, run with `tsx watch`)
- File-based storage: one JSON file per [PERIOD] stored in a local `data/` directory
  - File naming: `data/YYYY-MM.json` (or adjust period as needed)
  - Each file contains an array of records
- REST API on port 3001
- Vite dev server proxies `/api` → `http://localhost:3001`
- Run both concurrently with `concurrently`

**Data model** for each record:
{
  id: string (crypto.randomUUID()),
  [FIELD_1]: string,
  [FIELD_2]: string,
  [FIELD_3]: number,
  date: string (YYYY-MM-DD),
  category: string,
  createdAt: number (Date.now())
}

**Folder structure:**
[PROJECT_ROOT]/
├── server/
│   ├── index.ts              # Express entry, port 3001
│   └── routes/[resource].ts  # CRUD routes with file I/O
├── data/                     # Auto-created, one JSON per period
├── src/
│   ├── types/index.ts        # Shared TypeScript interfaces
│   ├── api/[resource].ts     # fetch-based API client functions
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   └── chartDataTransformers.ts
│   ├── components/
│   │   ├── [resource]/       # Form + Table components
│   │   └── dashboard/        # Chart components
│   ├── pages/
│   │   ├── [Resource]Page.tsx
│   │   └── DashboardPage.tsx
│   └── App.tsx               # Ant Design Layout + Sider nav
├── tsconfig.app.json         # Frontend TS config (bundler moduleResolution)
├── tsconfig.server.json      # Server TS config (node16 moduleResolution)
└── vite.config.ts            # With /api proxy to :3001

**API endpoints:**
GET    /api/[resource]            - list all (optional ?[period]=YYYY-MM filter)
GET    /api/[resource]/[periods]  - list available periods
POST   /api/[resource]            - create (saves to correct period file)
PUT    /api/[resource]/:id        - update (moves between files if period changes)
DELETE /api/[resource]/:id        - delete

**UI pages:**

1. [Resource] Entry Page:
   - Ant Design Form (layout="vertical") with validation
   - Fields: [FIELD_1] (Input), [FIELD_2] (AutoComplete with past values),
     [FIELD_3] (InputNumber), date (DatePicker, default today), category (AutoComplete)
   - On submit: POST to API, prepend to local state, show success message
   - Ant Design Table below with columns: date, [FIELD_1] (Tag), category (Tag),
     description (ellipsis), [FIELD_3] (Tag), actions (edit/delete)
   - Edit opens a Drawer with the same form pre-filled
   - Delete uses Popconfirm
   - Search/filter input in card header

2. Dashboard Page:
   - Period selector (Select, allowClear → "All time" mode)
   - 4 Statistic cards in a row (colorful background, icons)
   - 2-column grid: horizontal BarChart (time per [FIELD_1]) + donut PieChart (per category)
   - Full-width AreaChart (value over time, last 30 days / all-time toggle)
   - All charts use Recharts with custom tooltips

**Layout:**
- Ant Design Layout with collapsible Sider (white background, border-right)
- Logo + app name in sider header
- Menu with icons for each page
- Content area background: #fafafa
- ConfigProvider with borderRadius: 8, colorPrimary: '#1677ff'

**npm scripts:**
"dev": "concurrently -n client,server -c cyan,green \"npm run dev:client\" \"npm run dev:server\""
"dev:client": "vite"
"dev:server": "tsx watch server/index.ts"

**Key implementation notes:**
- Server uses `fs.readFileSync`/`fs.writeFileSync` (sync is fine for a local tool)
- `data/` directory is auto-created on first write
- PUT handles moving a record between period files when its date changes
- Tag colors are deterministic: hash the string → pick from a fixed palette
- Categories/autocomplete values are derived live from existing records (no separate store)
- chart data transformers are pure functions in a separate file
- No external state management library — useState + fetch is sufficient
- Loading states per page (Spin component while fetching)
- Error Alert if server is unreachable
```

---

## Customisation Checklist

When adapting this prompt for a new project, replace the placeholders:

| Placeholder | Replace with |
|---|---|
| `[APP NAME]` | e.g. "Expense Tracker", "Reading Log" |
| `[PERIOD]` | e.g. "month" (YYYY-MM), "year" (YYYY), "week" |
| `[FIELD_1]` | Primary identifier, e.g. `ticketId`, `title`, `isbn` |
| `[FIELD_2]` | Secondary text, e.g. `description`, `notes` |
| `[FIELD_3]` | Numeric measure, e.g. `timeSpent`, `amount`, `pages` |
| `[resource]` | REST resource name (plural), e.g. `logs`, `expenses`, `books` |
| `[periods]` | Period list endpoint, e.g. `months`, `years` |

---

## What Was Built (This Project)

**Project:** LogTime — Jira ticket time tracker

| Placeholder | Value used |
|---|---|
| APP NAME | LogTime |
| PERIOD | month (`data/YYYY-MM.json`) |
| FIELD_1 | `ticketId` (Jira ticket, e.g. PROJ-123) |
| FIELD_2 | `description` |
| FIELD_3 | `timeSpent` (hours, float) |
| resource | `logs` |
| periods | `months` |

**Stack versions actually used:**
- React 19 / Vite 8
- Ant Design 6 / `@ant-design/icons` 6
- Recharts 3 / date-fns 4 / dayjs 1
- Express 5 / TypeScript 6 / tsx 4
- concurrently 9

**Data files location:** `[project root]/data/YYYY-MM.json`

---

## Running the App

```bash
npm install
npm run dev        # starts both Vite (:5173) and Express (:3001)
```

Open `http://localhost:5173`

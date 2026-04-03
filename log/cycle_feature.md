# Cycle Feature (Billings Method)

## Overview
A menstrual cycle tracking page following the Billings Ovulation Method. Tracks daily cervical mucus observations, bleeding, and peak days.

## Files Created/Modified

### New Files
- `src/pages/CyclePage.tsx` — main page with calendar + stats tabs
- `src/components/cycle/CycleCalendar.tsx` — monthly grid calendar with colour-coded days
- `src/components/cycle/CycleFormModal.tsx` — add/edit day modal
- `src/components/cycle/CycleStats.tsx` — yearly KPI cards + monthly bleeding bar chart
- `src/api/cycles.ts` — fetch, upsert, delete, export API functions
- `server/routes/cycles.ts` — Express router (GET, POST upsert-by-date, DELETE, GET /export)

### Modified Files
- `prisma/schema.prisma` — added `CycleEntry` model (`cycle_entries` table)
- `src/types/index.ts` — added `CycleEntry`, `CycleEntryInput`, bleeding/mucus/sensation enums and labels
- `server/index.ts` — registered `/api/cycles` route
- `src/App.tsx` — added `cycle` page + `HeartOutlined` nav item
- `server/import-data.ts` — added `importCycles()` for `data/cycles.json`

## Data Model

```prisma
model CycleEntry {
  id        String  @id @db.VarChar(36)
  date      String  @unique @db.VarChar(10)  // YYYY-MM-DD
  bleeding  String  @default("none")          // none | spotting | light | medium | heavy
  mucus     String  @default("none")          // none | sticky | creamy | watery | egg_white
  sensation String  @default("dry")           // dry | moist | wet | slippery
  isPeakDay Boolean @default(false)
  note      String? @db.Text
  createdAt BigInt
  @@map("cycle_entries")
}
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cycles?year=YYYY&month=YYYY-MM` | Fetch entries |
| POST | `/api/cycles` | Upsert by date (create or update) |
| DELETE | `/api/cycles/:id` | Delete entry |
| GET | `/api/cycles/export?year=YYYY` | Download JSON |

## UI Features
- Monthly calendar view with colour-coded cells (bleeding = red shades, mucus = teal/green shades)
- Peak day marked with purple "P" badge
- Click any day to open add/edit modal
- Month navigation (prev/next arrows)
- Year selector affecting both calendar and stats tabs
- Stats tab: 4 KPI cards + monthly bar chart of bleeding days
- Detail list below calendar showing all entries for current month
- Export button downloads cycles-YYYY.json
- Import: place `data/cycles.json` and run `npx tsx server/import-data.ts`

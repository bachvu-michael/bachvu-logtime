import type { CycleEntry } from '../types';

export interface CycleInfo {
  index: number;              // 1-based cycle number within the year
  startDate: string;          // first bleeding day (YYYY-MM-DD)
  periodEnd: string;          // last bleeding day of this period
  bleedingDays: number;       // count of logged bleeding days
  cycleLength: number | null; // days from startDate to next period startDate (null = last cycle)
  peakDate?: string;          // manually confirmed peak day
  autoPeakDate?: string;      // auto-detected peak (last egg_white/slippery before mucus dries up)
  observations: string[];     // Billings-based comments
  isAbnormal: boolean;
}

/** Date helpers */
function toMs(date: string) { return new Date(date + 'T00:00:00Z').getTime(); }
export function daysBetween(a: string, b: string) {
  return Math.round((toMs(b) - toMs(a)) / 86_400_000);
}
export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

export type FertilityLevel = 'high' | 'medium';

/**
 * Auto-detect peak day (Billings method):
 * The peak day is the LAST day of the most-fertile mucus type (egg_white)
 * OR slippery sensation, before the mucus abruptly becomes drier.
 * We look in the post-menstrual window of the cycle.
 */
function detectAutoPeak(
  sorted: CycleEntry[],
  cycleStart: string,
  cycleRangeEnd: string,  // exclusive upper bound (next period start or '9999-99-99')
): string | undefined {
  // Consider entries from periodEnd onward to avoid bleeding days counting as peak
  const window = sorted.filter(e => e.date >= cycleStart && e.date < cycleRangeEnd);

  // Find last entry with egg_white mucus OR slippery sensation
  let lastFertile: string | undefined;
  for (const e of window) {
    if (e.mucus === 'egg_white' || e.sensation === 'slippery') {
      lastFertile = e.date;
    }
  }

  // Validate: the day AFTER lastFertile should have drier mucus (watery→creamy→sticky→none)
  // If we can't validate (no next entry), still return it as a candidate
  if (!lastFertile) return undefined;

  const nextEntry = window.find(e => e.date > lastFertile!);
  if (nextEntry) {
    const rank = (m: string, s: string) => {
      if (m === 'egg_white' || s === 'slippery') return 4;
      if (m === 'watery'    || s === 'wet')      return 3;
      if (m === 'creamy'    || s === 'moist')    return 2;
      return 1; // sticky/none/dry
    };
    const currentRank = rank(window.find(e => e.date === lastFertile)!.mucus, window.find(e => e.date === lastFertile)!.sensation);
    const nextRank    = rank(nextEntry.mucus, nextEntry.sensation);
    // Peak is confirmed only when next day is drier
    if (nextRank < currentRank) return lastFertile;
    // If next day is same or wetter, the real peak hasn't happened yet → no confirmed auto-peak
    return undefined;
  }

  // Last entry in cycle — tentative peak candidate
  return lastFertile;
}

/**
 * Detect menstrual periods and build CycleInfo from logged entries.
 */
export function computeCycles(allEntries: CycleEntry[]): CycleInfo[] {
  const sorted = [...allEntries].sort((a, b) => a.date.localeCompare(b.date));

  // ── Step 1: group consecutive bleeding days into periods ─────────────────────
  const periods: { start: string; end: string; bleedingDates: string[] }[] = [];
  let currentDates: string[] = [];

  for (const e of sorted) {
    if (e.bleeding === 'none') continue;
    if (currentDates.length === 0) {
      currentDates.push(e.date);
    } else {
      const gap = daysBetween(currentDates[currentDates.length - 1], e.date);
      if (gap <= 3) {
        currentDates.push(e.date);
      } else {
        periods.push({ start: currentDates[0], end: currentDates[currentDates.length - 1], bleedingDates: currentDates });
        currentDates = [e.date];
      }
    }
  }
  if (currentDates.length > 0) {
    periods.push({ start: currentDates[0], end: currentDates[currentDates.length - 1], bleedingDates: currentDates });
  }

  // ── Step 2: build CycleInfo ──────────────────────────────────────────────────
  return periods.map((p, i) => {
    const next = periods[i + 1];
    const cycleLength    = next ? daysBetween(p.start, next.start) : null;
    const cycleRangeEnd  = next ? next.start : '9999-99-99';

    // Manual peak: user explicitly marked isPeakDay
    const peakEntry = sorted.find(e => e.isPeakDay && e.date >= p.start && e.date < cycleRangeEnd);

    // Auto peak: algorithm-detected
    const autoPeakDate = detectAutoPeak(sorted, p.start, cycleRangeEnd);

    // ── Observations ─────────────────────────────────────────────────────────
    const obs: string[] = [];
    let isAbnormal = false;

    if (cycleLength !== null) {
      if (cycleLength < 21) {
        obs.push(`Chu kỳ ngắn (${cycleLength} ngày < 21) — có thể do căng thẳng, rối loạn nội tiết tố hoặc suy giáp`);
        isAbnormal = true;
      } else if (cycleLength > 40) {
        obs.push(`Chu kỳ rất dài (${cycleLength} ngày > 40) — nên kiểm tra sức khoẻ (PCOS, rối loạn phóng noãn)`);
        isAbnormal = true;
      } else if (cycleLength > 35) {
        obs.push(`Chu kỳ dài (${cycleLength} ngày > 35) — có thể liên quan đến rối loạn nội tiết (PCOS, căng thẳng mãn tính)`);
        isAbnormal = true;
      }
    }

    if (p.bleedingDates.length < 2) {
      obs.push(`Kinh nguyệt ngắn (${p.bleedingDates.length} ngày < 2) — có thể thiếu hụt estrogen hoặc niêm mạc tử cung mỏng`);
      isAbnormal = true;
    } else if (p.bleedingDates.length > 7) {
      obs.push(`Kinh nguyệt kéo dài (${p.bleedingDates.length} ngày > 7) — có thể do u xơ, polyp hoặc mất cân bằng nội tiết tố`);
      isAbnormal = true;
    }

    if (!peakEntry && !autoPeakDate && cycleLength !== null) {
      obs.push('Không phát hiện ngày đỉnh trong chu kỳ này — hãy chú ý quan sát chất nhầy egg-white');
    }

    if (obs.length === 0) {
      obs.push(`Chu kỳ bình thường${cycleLength !== null ? ` (${cycleLength} ngày)` : ''}`);
    }

    return {
      index: i + 1,
      startDate:    p.start,
      periodEnd:    p.end,
      bleedingDays: p.bleedingDates.length,
      cycleLength,
      peakDate:     peakEntry?.date,
      autoPeakDate,
      observations: obs,
      isAbnormal,
    };
  });
}

/**
 * Build lookup map: date → { cycleIndex, isStart, isPeriodEnd, isAutoPeak, fertilityLevel }
 *
 * Billings fertile window rules:
 *   HIGH  — watery/egg_white mucus | slippery sensation | peak day | 3 days after peak
 *   MEDIUM — sticky/creamy mucus | moist/wet sensation (if not already HIGH)
 * Bleeding days are excluded (period phase).
 */
export interface DateCycleInfo {
  cycleIndex:     number;
  isStart:        boolean;
  isPeriodEnd:    boolean;
  isAutoPeak:     boolean;
  fertilityLevel?: FertilityLevel;
}

export function buildCycleDateMap(
  cycles:     CycleInfo[],
  allEntries: CycleEntry[] = [],
): Record<string, DateCycleInfo> {
  const map: Record<string, DateCycleInfo> = {};
  const entryMap: Record<string, CycleEntry> = {};
  for (const e of allEntries) entryMap[e.date] = e;

  function get(date: string, idx: number): DateCycleInfo {
    if (!map[date]) map[date] = { cycleIndex: idx, isStart: false, isPeriodEnd: false, isAutoPeak: false };
    return map[date];
  }

  function setFertility(date: string, idx: number, level: FertilityLevel) {
    const cell = get(date, idx);
    // Don't mark bleeding days as fertile
    if (entryMap[date]?.bleeding !== 'none') return;
    if (cell.fertilityLevel === 'high') return; // already best
    if (level === 'high' || !cell.fertilityLevel) cell.fertilityLevel = level;
  }

  for (const c of cycles) {
    get(c.startDate, c.index).isStart     = true;
    get(c.periodEnd, c.index).isPeriodEnd = true;
    if (c.autoPeakDate) get(c.autoPeakDate, c.index).isAutoPeak = true;

    // Effective peak for post-peak window
    const effectivePeak = c.peakDate ?? c.autoPeakDate;

    // Post-peak fertile window: peak + 3 days → HIGH
    if (effectivePeak) {
      setFertility(effectivePeak, c.index, 'high');
      for (let d = 1; d <= 3; d++) {
        const postPeak = addDays(effectivePeak, d);
        // Stop at next cycle start
        const next = cycles[c.index]; // cycles[c.index] = next cycle (0-based: cycles[c.index - 1] is current)
        if (next && postPeak >= next.startDate) break;
        setFertility(postPeak, c.index, 'high');
      }
    }

    // Mucus-based fertility for all entries in this cycle range
    const rangeEnd = cycles[c.index]?.startDate ?? '9999-99-99';
    for (const e of allEntries) {
      if (e.date < c.startDate || e.date >= rangeEnd) continue;
      if (e.bleeding !== 'none') continue; // skip bleeding days

      const isHighMucus   = e.mucus === 'watery' || e.mucus === 'egg_white';
      const isHighSens    = e.sensation === 'slippery';
      const isMedMucus    = e.mucus === 'sticky' || e.mucus === 'creamy';
      const isMedSens     = e.sensation === 'moist' || e.sensation === 'wet';

      if (isHighMucus || isHighSens) {
        setFertility(e.date, c.index, 'high');
      } else if (isMedMucus || isMedSens) {
        setFertility(e.date, c.index, 'medium');
      }
    }
  }

  return map;
}

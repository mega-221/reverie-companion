export const REVERIE_MONTHS = [
  'Wind’s Grace',
  'Nature’s Bloom',
  'Life’s Genesis',
  'Sun’s Zenith',
  'Forge’s Fire',
  'Midyear’s Chills',
  'Harvest’s Bounty',
  'Frost’s Arrival',
  'Light’s Fall',
  'Night’s Veil',
  'Moon’s Glow',
  'Morning’s Rise',
] as const;

export type ReverieCalendarDate = {
  day: number;        // 1..30
  monthIndex: number; // 0..11
  year: number;
};

export const DEFAULT_CALENDAR_DATE: ReverieCalendarDate = {
  day: 1,
  monthIndex: 0,
  year: 421,
};

const normalizeApostrophes = (s: string) => s.replace(/[’']/g, "'").toLowerCase().trim();

export function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

export function normalizeCalendarDate(d?: Partial<ReverieCalendarDate> | null): ReverieCalendarDate {
  const rawDay = Number(d?.day);
  const rawMonth = Number(d?.monthIndex);
  const rawYear = Number(d?.year);

  return {
    day: Number.isFinite(rawDay) ? Math.max(1, Math.min(30, Math.round(rawDay))) : DEFAULT_CALENDAR_DATE.day,
    monthIndex: Number.isFinite(rawMonth) ? ((Math.trunc(rawMonth) % 12) + 12) % 12 : DEFAULT_CALENDAR_DATE.monthIndex,
    year: Number.isFinite(rawYear) ? Math.trunc(rawYear) : DEFAULT_CALENDAR_DATE.year,
  };
}

export function parseReverieDate(raw?: string): ReverieCalendarDate | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(.+?),\s*(-?\d+)\.?\s*AS$/i);
  if (!match) return null;

  const day = Number(match[1]);
  const monthRaw = normalizeApostrophes(match[2]);
  const year = Number(match[3]);

  const monthIndex = REVERIE_MONTHS.findIndex(m => normalizeApostrophes(m) === monthRaw);
  if (monthIndex < 0 || !Number.isInteger(day) || day < 1 || day > 30 || !Number.isFinite(year)) {
    return null;
  }

  return { day, monthIndex, year };
}

export function formatReverieDate(d: Partial<ReverieCalendarDate>): string {
  const safe = normalizeCalendarDate(d);
  return `${ordinalDay(safe.day)} of ${REVERIE_MONTHS[safe.monthIndex]}, ${safe.year}. AS`;
}

export function calendarSortKey(d: ReverieCalendarDate): number {
  return d.year * 360 + d.monthIndex * 30 + d.day;
}

export function calendarTotalDays(d: Partial<ReverieCalendarDate> | null | undefined): number {
  const safe = normalizeCalendarDate(d);
  return safe.year * 360 + safe.monthIndex * 30 + (safe.day - 1);
}

export function dateFromTotalDays(absDay: number): ReverieCalendarDate {
  const rounded = Math.round(absDay);
  const year = Math.floor(rounded / 360);
  const remYear = ((rounded % 360) + 360) % 360;
  const monthIndex = Math.floor(remYear / 30);
  const day = (remYear % 30) + 1;
  return { day, monthIndex, year };
}

export function formatReverieElapsed(
  prev: Partial<ReverieCalendarDate> | null | undefined,
  next: Partial<ReverieCalendarDate> | null | undefined
): string {
  const diff = calendarTotalDays(next) - calendarTotalDays(prev);
  if (diff === 0) return 'No time elapsed';

  const absDays = Math.abs(diff);
  const years = Math.floor(absDays / 360);
  const remAfterYears = absDays % 360;
  const months = Math.floor(remAfterYears / 30);
  const days = remAfterYears % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);

  if (years === 0 && months === 0 && absDays % 7 === 0) {
    const weeks = absDays / 7;
    parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'} (${absDays} days)`);
  } else if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  const summary = parts.join(', ');
  return diff > 0 ? `${summary} passed` : `Turned back ${summary}`;
}

export function advanceReverieDate(
  date: Partial<ReverieCalendarDate> | null | undefined,
  unit: 'day' | 'week' | 'month' | 'year',
  delta: number
): ReverieCalendarDate {
  const safe = normalizeCalendarDate(date);
  const step = Math.trunc(delta);
  if (!Number.isFinite(step) || step === 0) return safe;

  if (unit === 'day' || unit === 'week') {
    const dayDelta = unit === 'week' ? step * 7 : step;
    return dateFromTotalDays(calendarTotalDays(safe) + dayDelta);
  }

  if (unit === 'month') {
    const absMonth = safe.year * 12 + safe.monthIndex + step;
    const year = Math.floor(absMonth / 12);
    const monthIndex = ((absMonth % 12) + 12) % 12;
    return { day: safe.day, monthIndex, year };
  }

  return { day: safe.day, monthIndex: safe.monthIndex, year: safe.year + step };
}

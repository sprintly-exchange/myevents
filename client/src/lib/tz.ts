/**
 * Timezone utilities for converting and formatting "naive" datetime strings
 * (stored without timezone info, e.g. "2026-05-14T14:00") in a specific IANA timezone.
 *
 * The app stores event_date as a plain local string like "2026-05-14T14:00"
 * alongside a separate `timezone` field (e.g. "Europe/Stockholm").
 * These helpers correctly interpret the naive string in the given timezone.
 */

function getTzOffsetMs(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const hour = get('hour') % 24; // some locales return 24 for midnight
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return localMs - date.getTime(); // positive = ahead of UTC
}

/**
 * Convert a naive datetime string ("2026-05-14T14:00") interpreted as being
 * in `tz` to a proper Date object with the correct UTC timestamp.
 */
export function naiveDateToDate(naiveStr: string, tz: string): Date {
  if (!naiveStr) return new Date(NaN);
  const [datePart = '', timePart = '00:00'] = naiveStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  if (!year || !month || !day) return new Date(NaN);

  // Step 1: use the naive numbers as a UTC placeholder
  const placeholder = Date.UTC(year, month - 1, day, hours || 0, minutes || 0);
  // Step 2: find the timezone offset at that approximate UTC time
  const offset = getTzOffsetMs(new Date(placeholder), tz);
  // Step 3: actual UTC = naive_time - offset (naive = UTC + offset)
  const approxUtc = placeholder - offset;
  // Step 4: recompute offset at adjusted time to handle DST boundaries
  const offset2 = getTzOffsetMs(new Date(approxUtc), tz);
  return new Date(placeholder - offset2);
}

export function formatEventDate(naiveStr: string, tz: string, locale = 'sv-SE'): string {
  if (!naiveStr) return '';
  const date = naiveDateToDate(naiveStr, tz);
  if (isNaN(date.getTime())) return naiveStr;
  return date.toLocaleDateString(locale, {
    timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatEventTime(naiveStr: string, tz: string, locale = 'sv-SE'): string {
  if (!naiveStr) return '';
  const date = naiveDateToDate(naiveStr, tz);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}

export function formatEventDateTime(naiveStr: string, tz: string, locale = 'sv-SE'): string {
  if (!naiveStr) return '';
  const date = naiveDateToDate(naiveStr, tz);
  if (isNaN(date.getTime())) return naiveStr;
  return date.toLocaleString(locale, { timeZone: tz, dateStyle: 'full', timeStyle: 'short' });
}

export function formatEventDateRange(
  start: string,
  end: string | null | undefined,
  tz: string,
  locale = 'sv-SE'
): string {
  if (!start) return '';
  const startFmt = formatEventDateTime(start, tz, locale);
  if (!end) return startFmt;
  const startDate = naiveDateToDate(start, tz);
  const endDate = naiveDateToDate(end, tz);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return startFmt;
  const startDay = startDate.toLocaleDateString('sv-SE', { timeZone: tz });
  const endDay = endDate.toLocaleDateString('sv-SE', { timeZone: tz });
  if (startDay === endDay) {
    return `${startFmt} – ${formatEventTime(end, tz, locale)}`;
  }
  return `${startFmt} – ${formatEventDateTime(end, tz, locale)}`;
}

export function isEventUpcoming(naiveStr: string, tz: string): boolean {
  if (!naiveStr) return false;
  const date = naiveDateToDate(naiveStr, tz);
  if (isNaN(date.getTime())) return false;
  return date > new Date();
}

export function getTzDisplayName(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

export function getTzOffsetLabel(tz: string): string {
  const offsetMs = getTzOffsetMs(new Date(), tz);
  const sign = offsetMs >= 0 ? '+' : '-';
  const absMs = Math.abs(offsetMs);
  const h = Math.floor(absMs / 3600000);
  const m = Math.round((absMs % 3600000) / 60000);
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export type CompactRelativeTimeOptions = {
  /** Clock in ms. Defaults to `Date.now()`. */
  now?: number;
  /**
   * Returned for anything under a minute old, including future times. When
   * unset the result is whole seconds (`"42s"`), and a future time gives zero
   * or a negative count (`"0s"`, `"-300s"`).
   */
  justNow?: string;
  /**
   * `false` (default): elapsed time only. A day is 24 hours, a month 30 days,
   * a year 12 of those months.
   * `true`: days count local calendar days across a DST change, and months and
   * years are calendar months, as `dayjs().diff(date, unit)` counts them.
   */
  calendar?: boolean;
};

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Rounds toward zero; `-0` becomes `0`. */
function truncate(n: number): number {
  return n < 0 ? Math.ceil(n) || 0 : Math.floor(n);
}

/** Local UTC offset in minutes, rounded to 15 minutes. */
function utcOffset(ms: number): number {
  return -Math.round(new Date(ms).getTimezoneOffset() / 15) * 15;
}

/** Adds calendar months in local time and clamps the day to the target month. */
function addMonths(ms: number, months: number): number {
  const date = new Date(ms);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, daysInMonth));
  return date.getTime();
}

/** Fractional calendar months from `a` to `b`, negated (the moment.js formula). */
function monthDiff(a: number, b: number): number {
  if (new Date(a).getDate() < new Date(b).getDate()) return -monthDiff(b, a);
  const from = new Date(a);
  const to = new Date(b);
  const whole = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const anchor = addMonths(a, whole);
  const before = b - anchor < 0;
  const anchor2 = addMonths(a, whole + (before ? -1 : 1));
  return +(-(whole + (b - anchor) / (before ? anchor - anchor2 : anchor2 - anchor)) || 0);
}

/**
 * Time since `date` as one compact unit: `"now"` or `"42s"`, then `"5m"`,
 * `"3h"`, `"2d"`, `"4mo"`, `"1y"`. Strings are parsed with `new Date(string)`.
 * An invalid date gives `"NaNy"`, or `"0mo"` with `calendar`.
 */
export function formatCompactRelativeTime(
  date: string | number | Date,
  options: CompactRelativeTimeOptions = {},
): string {
  const now = options.now ?? Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = truncate(diff / 1000);
  if (seconds < 60) return options.justNow ?? `${seconds}s`;
  const minutes = truncate(diff / MS_PER_MINUTE);
  if (minutes < 60) return `${minutes}m`;
  const hours = truncate(diff / (60 * MS_PER_MINUTE));
  if (hours < 24) return `${hours}h`;

  if (!options.calendar) {
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.floor(months / 12)}y`;
  }

  const zoneDelta = (utcOffset(then) - utcOffset(now)) * MS_PER_MINUTE;
  const days = truncate((diff - zoneDelta) / MS_PER_DAY);
  if (days < 30) return `${days}d`;
  const months = monthDiff(now, then);
  if (truncate(months) < 12) return `${truncate(months)}mo`;
  return `${truncate(months / 12)}y`;
}

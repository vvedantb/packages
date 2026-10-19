// formatCompactRelativeTime against the two app copies it replaces, with a
// fixed clock, across time zones (DST, a 30-minute DST, half-hour offsets),
// month ends, future and invalid inputs. Neither copy had tests of its own.
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCompactRelativeTime } from "../src/index.js";

// app-b extends these plugins before its formatter runs; `utc` replaces `diff`.
dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(timezone);
dayjs.extend(isToday);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

/** app-a, verbatim. */
function referenceA(dateInput: string | number): string {
  const seconds = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

/** app-b, verbatim. */
function referenceB(date: number | string | Date): string {
  const now = dayjs();
  const then = dayjs(date);
  const diffSeconds = now.diff(then, "second");

  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = now.diff(then, "minute");
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = now.diff(then, "hour");
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = now.diff(then, "day");
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = now.diff(then, "month");
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = now.diff(then, "year");
  return `${diffYears}y`;
}

const zones = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Australia/Lord_Howe",
  "Asia/Kolkata",
  "America/St_Johns",
  "Pacific/Chatham",
];

const clocks = [
  "2026-01-31T12:00:00Z",
  "2026-03-01T00:30:00Z",
  "2026-03-08T07:30:00Z",
  "2026-03-29T01:30:00Z",
  "2026-03-31T23:59:59.999Z",
  "2026-04-05T15:00:00Z",
  "2026-10-25T00:59:00Z",
  "2026-11-01T06:30:00Z",
  "2028-02-29T12:00:00Z",
  "2027-01-01T00:00:00Z",
].map((iso) => Date.parse(iso));

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const offsets = [
  -400 * DAY, -HOUR, -61 * SECOND, -59 * SECOND, -SECOND, -500, 0, 400, SECOND, 59_900, MINUTE, 59 * MINUTE + 59_999,
  HOUR, 23 * HOUR + 59 * MINUTE, DAY, 25 * HOUR, 29 * DAY + 23 * HOUR, 30 * DAY, 31 * DAY, 59 * DAY, 60 * DAY,
  364 * DAY, 365 * DAY, 366 * DAY, 400 * DAY, 800 * DAY, 3650 * DAY,
];

/** Inputs for one clock: fixed offsets plus whole calendar months back in local time. */
function inputs(now: number): number[] {
  const back = [1, 2, 3, 11, 12, 13, 24].map((months) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    return d.getTime();
  });
  return [...offsets.map((o) => now - o), ...back, ...back.map((t) => t + HOUR), ...back.map((t) => t - HOUR)];
}

const originalTz = process.env.TZ;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe("time zones apply in this worker", () => {
  it("TZ changes the local offset", () => {
    process.env.TZ = "UTC";
    const utcOffset = new Date(Date.UTC(2026, 6, 1)).getTimezoneOffset();
    process.env.TZ = "Asia/Kolkata";
    const kolkata = new Date(Date.UTC(2026, 6, 1)).getTimezoneOffset();
    expect([utcOffset, kolkata]).toEqual([0, -330]);
  });
});

describe("app-a parity: { justNow: \"now\" }", () => {
  for (const zone of zones) {
    it(zone, () => {
      process.env.TZ = zone;
      for (const now of clocks) {
        vi.setSystemTime(now);
        for (const then of inputs(now)) {
          for (const input of [then, new Date(then).toISOString()]) {
            expect(formatCompactRelativeTime(input, { justNow: "now" }), `${zone} ${now} ${input}`).toBe(referenceA(input));
          }
        }
      }
      for (const bad of ["not a date", Number.NaN]) {
        expect(formatCompactRelativeTime(bad, { justNow: "now" })).toBe(referenceA(bad));
      }
    });
  }
});

describe("app-b parity: { calendar: true }", () => {
  for (const zone of zones) {
    it(zone, () => {
      process.env.TZ = zone;
      for (const now of clocks) {
        vi.setSystemTime(now);
        for (const then of inputs(now)) {
          for (const input of [then, new Date(then), new Date(then).toISOString()]) {
            expect(formatCompactRelativeTime(input, { calendar: true }), `${zone} ${now} ${String(input)}`).toBe(
              referenceB(input),
            );
          }
        }
      }
      expect(formatCompactRelativeTime(Number.NaN, { calendar: true })).toBe(referenceB(Number.NaN));
      expect(formatCompactRelativeTime("not a date", { calendar: true })).toBe(referenceB("not a date"));
    });
  }
});

describe("formatCompactRelativeTime", () => {
  it("formats each unit", () => {
    process.env.TZ = "UTC";
    const now = Date.parse("2026-06-15T12:00:00Z");
    const f = (ms: number, options = {}) => formatCompactRelativeTime(now - ms, { now, ...options });
    expect([f(30 * SECOND), f(5 * MINUTE), f(3 * HOUR), f(2 * DAY), f(65 * DAY), f(800 * DAY)]).toEqual([
      "30s", "5m", "3h", "2d", "2mo", "2y",
    ]);
    expect(f(30 * SECOND, { justNow: "now" })).toBe("now");
    expect(f(-5 * MINUTE)).toBe("-300s");
    expect(f(-5 * MINUTE, { justNow: "now" })).toBe("now");
  });

  it("30-day months versus calendar months", () => {
    process.env.TZ = "UTC";
    const now = Date.parse("2026-03-31T12:00:00Z");
    const then = Date.parse("2026-01-31T12:00:00Z");
    expect(formatCompactRelativeTime(then, { now })).toBe("1mo");
    expect(formatCompactRelativeTime(then, { now, calendar: true })).toBe("2mo");
  });

  it("calendar days follow the local calendar across DST", () => {
    process.env.TZ = "America/New_York";
    const now = new Date(2026, 2, 9, 0, 30).getTime();
    const then = new Date(2026, 2, 8, 0, 30).getTime();
    expect(formatCompactRelativeTime(then, { now })).toBe("23h");
    expect(formatCompactRelativeTime(new Date(2026, 2, 7, 0, 30), { now })).toBe("1d");
    expect(formatCompactRelativeTime(new Date(2026, 2, 7, 0, 30), { now, calendar: true })).toBe("2d");
  });

  it("invalid input", () => {
    expect(formatCompactRelativeTime("nope", { justNow: "now" })).toBe("NaNy");
    expect(formatCompactRelativeTime("nope", { calendar: true })).toBe("0mo");
  });
});

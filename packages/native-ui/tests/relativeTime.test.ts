import { describe, expect, it } from "vitest";
import { formatCompactRelativeTime as web } from "../../ui/app/src/time/compactRelativeTime";
import { formatCompactRelativeTime } from "../src/relativeTime";

// `formatCompactRelativeTime` is a copy of the web twin in `@vvedantb/ui`
// (`RelativeDateTime` shows it). Both run over the same ages, with and without
// `calendar`, and must give the same strings.

const NOW = new Date(2026, 10, 9, 12, 0, 0).getTime();
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const AGES = [
  -5 * MINUTE,
  0,
  42_000,
  5 * MINUTE,
  59 * MINUTE,
  3 * 60 * MINUTE,
  DAY - 1,
  2 * DAY,
  29 * DAY,
  31 * DAY,
  150 * DAY,
  364 * DAY,
  400 * DAY,
  3 * 365 * DAY,
];

describe("formatCompactRelativeTime", () => {
  it("matches the web twin", () => {
    for (const age of AGES) {
      for (const calendar of [false, true]) {
        const options = { now: NOW, calendar };
        expect(formatCompactRelativeTime(NOW - age, options), `${age} ms, calendar ${calendar}`).toBe(
          web(NOW - age, options),
        );
      }
      expect(formatCompactRelativeTime(NOW - age, { now: NOW, justNow: "now" })).toBe(
        web(NOW - age, { now: NOW, justNow: "now" }),
      );
    }
  });

  it("counts calendar months, as the web inbox shows them", () => {
    expect(formatCompactRelativeTime(new Date(2026, 5, 2).getTime(), { now: NOW, calendar: true })).toBe("5mo");
    expect(formatCompactRelativeTime(NOW - 3 * 60 * MINUTE, { now: NOW, calendar: true })).toBe("3h");
  });
});

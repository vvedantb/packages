import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useDisablePageMotion } from "../../app/src/page-motion/PageMotionProvider";
import { motionEase, tokenTransition } from "../motion/presets";

/** Suffixes we will count; compound durations like "1h 12m" stay static. */
const COUNTABLE_SUFFIX = /^(?:%|h|k|m|s|ms)?$/i;

/**
 * Splits a label into the number to count and the text around it. A finite
 * number passes through; a string needs one number with an optional prefix
 * ("$", "~") and a suffix of `%`, `h`, `k`, `m`, `s` or `ms`. Anything else
 * (`—`, "1h 12m", "3 of 5") is `null`.
 */
export function parseCountable(value: string | number): {
  amount: number;
  prefix: string;
  suffix: string;
  decimals: number;
} | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return { amount: value, prefix: "", suffix: "", decimals: 0 };
  }
  const match = value.trim().match(/^(\D*?)(-?\d+(?:\.\d+)?)(\D*)$/);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const raw = match[2] ?? "";
  const suffix = (match[3] ?? "").trim();
  if (!COUNTABLE_SUFFIX.test(suffix)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  const decimals = raw.includes(".") ? (raw.split(".")[1]?.length ?? 0) : 0;
  return { amount, prefix, suffix, decimals };
}

/**
 * Counts from the last seen number to `value` on `--motion-base`
 * (`tokenTransition.base`), keeping the prefix, suffix and decimal places. The
 * first value counts up from 0. The same amount again (a refetch) is a no-op,
 * so the number does not replay on every write. Labels `parseCountable` rejects
 * (`—`, "1h 12m") render as they are, and so does every value while
 * `PageMotionProvider` is `disabled`.
 */
export function useCountUpDisplay(value: string | number): string | number {
  const parsed = parseCountable(value);
  const [display, setDisplay] = useState(value);
  const lastAmount = useRef<number | null>(null);
  const skipMotion = useDisablePageMotion();

  useEffect(() => {
    if (skipMotion) {
      lastAmount.current = parsed?.amount ?? null;
      setDisplay(value);
      return;
    }
    if (!parsed) {
      lastAmount.current = null;
      setDisplay(value);
      return;
    }
    if (lastAmount.current === parsed.amount) {
      setDisplay(value);
      return;
    }
    const from = lastAmount.current ?? 0;
    lastAmount.current = parsed.amount;
    const controls = animate(from, parsed.amount, {
      duration: tokenTransition.base.duration,
      ease: motionEase,
      onUpdate: (latest) => {
        const rounded = parsed.decimals > 0 ? latest.toFixed(parsed.decimals) : String(Math.round(latest));
        setDisplay(`${parsed.prefix}${rounded}${parsed.suffix}`);
      },
    });
    return () => controls.stop();
  }, [parsed?.amount, parsed?.prefix, parsed?.suffix, parsed?.decimals, skipMotion, value]);

  return display;
}

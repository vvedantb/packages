import type { ReactNode } from "react";

export const chipClass =
  "inline-flex max-sm:max-w-full items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground";

export const chip = (name: string) => (
  <button key={name} type="button" className={chipClass}>
    /{name}
  </button>
);

// Long single-line text, so the compact to expanded switch comes from a real
// wrap and not from a newline. The editor measures after mount, so `key` forces
// one remount per case to run the measurement on first paint.
const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
export const texts: Record<string, string> = {
  empty: "",
  short: "Summarise the notes",
  "just before wrap": words(8),
  "wraps to 2 lines": words(18),
  "wraps to 3 lines": words(30),
};
export const chipSets: Record<string, string[]> = {
  "0 chips": [],
  "1 chip": ["review"],
  "3 chips": ["review", "summarise", "draft-reply"],
};


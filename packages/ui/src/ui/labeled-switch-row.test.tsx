import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { LabeledSwitchRow } from "./labeled-switch-row";

const base = { id: "a", label: "A", checked: false };
const cls = (extra?: string) =>
  (LabeledSwitchRow({ ...base, className: extra }) as ReactElement<{ className: string }>).props.className;

describe("LabeledSwitchRow className", () => {
  it("keeps the default classes when omitted", () => {
    expect(cls()).toBe("flex items-center justify-between gap-3 max-sm:flex-wrap");
  });
  it("merges a caller class", () => {
    expect(cls("mt-2")).toContain("mt-2");
  });
});

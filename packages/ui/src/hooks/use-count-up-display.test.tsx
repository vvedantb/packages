// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PageMotionProvider, type PageMotionConfigProps } from "../../app/src/page-motion/PageMotionProvider";
import { parseCountable, useCountUpDisplay } from "./use-count-up-display";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("parseCountable", () => {
  it("keeps bare numbers", () => {
    expect(parseCountable(42)).toEqual({
      amount: 42,
      prefix: "",
      suffix: "",
      decimals: 0,
    });
  });

  it("keeps a trailing percent or hour", () => {
    expect(parseCountable("45%")).toMatchObject({ amount: 45, suffix: "%" });
    expect(parseCountable("12h")).toMatchObject({ amount: 12, suffix: "h" });
  });

  it("leaves compound durations and em-dashes alone", () => {
    expect(parseCountable("1h 12m")).toBeNull();
    expect(parseCountable("—")).toBeNull();
  });
});

/** Stands in for `MotionConfig`; the hook reads only the disabled flag. */
function PassThrough({ children }: PageMotionConfigProps) {
  return <>{children}</>;
}

function Count({ value }: { value: string | number }) {
  return <span data-testid="out">{useCountUpDisplay(value)}</span>;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function render(node: ReactNode): Promise<() => string | null | undefined> {
  if (!host) {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  }
  await act(async () => root?.render(node));
  return () => host?.querySelector("[data-testid=out]")?.textContent;
}

describe("useCountUpDisplay", () => {
  it("shows each value at once while page motion is off", async () => {
    const off = (value: string) => (
      <PageMotionProvider disabled motionConfig={PassThrough}>
        <Count value={value} />
      </PageMotionProvider>
    );
    const text = await render(off("45%"));
    expect(text()).toBe("45%");
    await render(off("80%"));
    expect(text()).toBe("80%");
  });

  it("renders a label it cannot count as it is", async () => {
    const text = await render(<Count value="1h 12m" />);
    expect(text()).toBe("1h 12m");
  });
});

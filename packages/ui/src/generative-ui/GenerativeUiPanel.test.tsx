// @vitest-environment happy-dom
// The web generative UI panel: a stored spec renders the agent's content, a
// button's actions reach the app, a link that is not http(s) never opens, and
// an unusable spec renders nothing.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerativeUiPanel } from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const spec = (button: { label: string; action: string; params: Record<string, string> }) =>
  JSON.stringify({
    root: "panel",
    elements: {
      panel: { type: "Panel", props: { title: "Build", description: null }, children: ["metric", "button"] },
      metric: { type: "Metric", props: { label: "Tests", value: "42 passed", delta: null, tone: "positive" } },
      button: {
        type: "Button",
        props: { label: button.label, variant: "primary" },
        on: { press: { action: button.action, params: button.params } },
      },
    },
  });

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(node));
  return host;
}

/** json-render runs actions asynchronously, so the press settles inside an async act. */
async function press(label: string) {
  const button = [...(host?.querySelectorAll("button") ?? [])].find((b) => b.textContent === label);
  if (!button) throw new Error(`no button "${label}"`);
  await act(async () => button.click());
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("GenerativeUiPanel", () => {
  it("renders the spec's content", () => {
    const view = render(<GenerativeUiPanel spec={spec({ label: "Rerun", action: "reply", params: { message: "rerun" } })} />);
    expect(view.textContent).toContain("Build");
    expect(view.textContent).toContain("42 passed");
  });

  it("sends a reply button's message to onReply", async () => {
    const onReply = vi.fn();
    render(<GenerativeUiPanel spec={spec({ label: "Rerun", action: "reply", params: { message: "rerun the tests" } })} onReply={onReply} />);
    await press("Rerun");
    expect(onReply).toHaveBeenCalledWith("rerun the tests");
  });

  it("opens an https link, and never a javascript: one", async () => {
    const onOpenUrl = vi.fn();
    render(
      <GenerativeUiPanel
        spec={spec({ label: "Open", action: "open_url", params: { url: "https://example.com/report" } })}
        onReply={() => {}}
        onOpenUrl={onOpenUrl}
      />,
    );
    await press("Open");
    expect(onOpenUrl).toHaveBeenCalledWith("https://example.com/report");
    act(() => root?.unmount());
    host?.remove();

    onOpenUrl.mockClear();
    render(
      <GenerativeUiPanel
        spec={spec({ label: "Open", action: "open_url", params: { url: "javascript:alert(1)" } })}
        onReply={() => {}}
        onOpenUrl={onOpenUrl}
      />,
    );
    await press("Open");
    expect(onOpenUrl).not.toHaveBeenCalled();
  });

  it("disables the buttons when the app cannot reply", () => {
    render(<GenerativeUiPanel spec={spec({ label: "Rerun", action: "reply", params: { message: "rerun" } })} />);
    const button = [...(host?.querySelectorAll("button") ?? [])].find((b) => b.textContent === "Rerun");
    expect(button?.closest("fieldset")?.disabled).toBe(true);
  });

  it("renders nothing for an unusable spec", () => {
    const view = render(<GenerativeUiPanel spec={'{"root":"missing","elements":{}}'} />);
    expect(view.innerHTML).toBe("");
    const broken = render(<GenerativeUiPanel spec="not json" />);
    expect(broken.innerHTML).toBe("");
  });
});

// @vitest-environment happy-dom
// UiConfig entries of the agent activity family (ActivityTasks,
// ActivityQuestionCard, ModelPicker): no entry renders the built-in DOM, an
// entry replaces what it names, explicit props win.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { type UiConfig, UiConfigProvider } from "../ui/ui-config";
import { ActivityQuestionCard } from "./activity-question";
import { type ActivityMarkdownProps, type ActivityStep, ActivityThinkingIcon } from "./activity-shared";
import { ActivityTasks } from "./activity-tasks";
import { ModelSelect } from "./model-picker";
import * as rootEntry from "../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// happy-dom has no Web Animations API; the spinners start loops in a ref callback.
Object.defineProperty(Element.prototype, "animate", {
  configurable: true,
  value: () => ({ playState: "running", pause() {}, play() {}, cancel() {} }),
});

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{node}</UiConfigProvider> : node),
  );
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function el(host: HTMLElement, selector: string): Element {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

const reasoning: ActivityStep[] = [
  { type: "thinking", label: "Thought", detail: "Plan first", status: "complete" },
];

function AppMarkdown({ className, mode, children }: ActivityMarkdownProps) {
  return (
    <div data-testid="app-markdown" data-mode={mode} className={className}>
      {children}
    </div>
  );
}

describe("ActivityTasks config", () => {
  it("names the agent 'Agent' without an entry, the entry's name with one, the prop over both", async () => {
    const original = Math.random;
    Math.random = () => 0;
    try {
      let host = await mount(<ActivityTasks steps={[]} isStreaming />);
      expect(host.textContent).toContain("Agent is accomplishing...");
      host = await mount(<ActivityTasks steps={[]} isStreaming />, { ActivityTasks: { name: "Eva" } });
      expect(host.textContent).toContain("Eva is accomplishing...");
      host = await mount(<ActivityTasks steps={[]} isStreaming name="Claude" />, { ActivityTasks: { name: "Eva" } });
      expect(host.textContent).toContain("Claude is accomplishing...");
    } finally {
      Math.random = original;
    }
  });

  it("renders reasoning with Streamdown by default and with the configured renderer", async () => {
    let host = await mount(<ActivityTasks steps={reasoning} layout="inline" />);
    expect(host.querySelector('[data-testid="app-markdown"]')).toBeNull();
    expect(host.textContent).toContain("Plan first");

    host = await mount(<ActivityTasks steps={reasoning} layout="inline" />, {
      ActivityTasks: { markdown: AppMarkdown },
    });
    const block = el(host, '[data-testid="app-markdown"]');
    expect(block.textContent).toBe("Plan first");
    expect(block.getAttribute("class")).toBe("my-1 text-foreground text-sm leading-relaxed");
  });

  it("passes the streaming mode to the renderer for live reply text", async () => {
    const host = await mount(
      <ActivityTasks
        layout="inline"
        steps={[{ type: "response", label: "Response", detail: "Half", status: "active" }]}
      />,
      { ActivityTasks: { markdown: AppMarkdown } },
    );
    expect(el(host, '[data-testid="app-markdown"]').getAttribute("data-mode")).toBe("streaming");
  });

  it("ActivityThinkingIcon: brain glyph by default, the configured image with an entry", async () => {
    let host = await mount(<ActivityThinkingIcon className="size-4" />);
    expect(host.querySelector("img")).toBeNull();
    expect(el(host, "svg").getAttribute("class")).toContain("size-4");

    host = await mount(<ActivityThinkingIcon className="size-4" />, {
      ActivityTasks: { thinkingIcon: { src: "/logo.svg", alt: "App" } },
    });
    const img = el(host, "img");
    expect(img.getAttribute("src")).toBe("/logo.svg");
    expect(img.getAttribute("alt")).toBe("App");
    expect(img.getAttribute("class")).toBe("rounded-full size-4");
  });
});

describe("ActivityQuestionCard config", () => {
  const questions = [{ question: "Pick", options: [{ label: "A" }, { label: "B" }] }];

  it("fills the picked option with the built-in class, or the configured one", async () => {
    let host = await mount(<ActivityQuestionCard questions={questions} answers={{ Pick: "B" }} />);
    const rows = () => [...host.querySelectorAll(".rounded-md.px-2")];
    expect(rows()[1]?.getAttribute("class")).toBe("flex items-start gap-2 rounded-md px-2 py-1.5 bg-surface-tertiary");
    expect(rows()[0]?.getAttribute("class")).toBe("flex items-start gap-2 rounded-md px-2 py-1.5");

    host = await mount(<ActivityQuestionCard questions={questions} answers={{ Pick: "B" }} />, {
      ActivityQuestionCard: { classes: { selectedOption: "bg-app-hover" } },
    });
    expect(rows()[1]?.getAttribute("class")).toBe("flex items-start gap-2 rounded-md px-2 py-1.5 bg-app-hover");
  });
});

describe("ModelPicker config", () => {
  const options = [
    { id: "opus", provider: "claude", label: "Opus" },
    { id: "gpt", provider: "codex", label: "GPT-5" },
  ];
  const accounts = [{ id: "acc", provider: "claude", label: "Jane Doe", isOwn: true }];
  const noop = () => {};

  it("trigger: built-in classes without an entry, `classes.trigger` replaces them, className merges last", async () => {
    let host = await mount(<ModelSelect value="opus" options={options} onValueChange={noop} />);
    const trigger = () => el(host, 'button[role="combobox"]').getAttribute("class");
    expect(trigger()).toContain("hover:bg-surface-tertiary");

    host = await mount(<ModelSelect value="opus" options={options} onValueChange={noop} className="w-40" />, {
      ModelPicker: { classes: { trigger: "app-trigger" } },
    });
    expect(trigger()).toBe("app-trigger w-40");
  });

  it("badge ring: tokens by default, the configured colour with an entry", async () => {
    const node = (
      <ModelSelect value="opus" options={options} onValueChange={noop} accounts={accounts} accountId="acc" />
    );
    let host = await mount(node);
    const badge = () => el(host, '[aria-hidden="true"][style]').getAttribute("style");
    expect(badge()).toContain("var(--color-border)");
    expect(host.textContent).toContain("JD");

    host = await mount(node, { ModelPicker: { badgeRing: { trigger: "red" } } });
    expect(badge()).toContain("0 0 0 1.5px red");
  });
});

describe("root entry", () => {
  it("exports the activity family", () => {
    for (const name of [
      "ActivityTasks",
      "ActivityQuestionCard",
      "ActivityThinkingIcon",
      "OpenSubagentContext",
      "activityStepConfig",
      "stepHasRichDetail",
      "formatElapsed",
      "useElapsedSeconds",
      "useSpinnerVerb",
      "useStreamingDisclosure",
      "Trace",
      "TraceCollapsibleTrigger",
      "Plan",
      "TestResults",
      "WebPreview",
      "Context",
      "ModelSelect",
      "ModelPickerContent",
      "modelPickerSurfaceClass",
      "findModelOption",
      "formatModelDisplayLabel",
      "getProviderLabel",
      "ProviderIcon",
    ]) {
      expect(rootEntry, name).toHaveProperty(name);
    }
    // The old private code frame copy is gone (CodeBlock `plain` replaced it).
    expect(rootEntry).not.toHaveProperty("CodeFrame");
  });
});

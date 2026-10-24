// @vitest-environment happy-dom
// Kibo blocks and the markdown renderer moved from eva, and the `UiConfig`
// entries `Gantt`, `Kanban`, `ThemeSwitcher` and `VideoPlayer`: config absent
// = built-in output, config present = replaced part, caller className last.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { clsx, type ClassValue } from "clsx";
import * as rootExports from "../index";
import { Markdown } from "../markdown";
import { UiConfigProvider, type UiConfig } from "../ui/ui-config";
import { GanttFeatureItem } from "./gantt-features";
import { GanttProvider, type GanttFeature } from "./gantt-provider";
import { GanttTimeline, GanttToday } from "./gantt-timeline";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanProvider } from "./kanban";
import { ThemeSwitcher } from "./theme-switcher";
import { VideoPlayer, VideoPlayerControlBar } from "./video-player";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
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

function el(host: ParentNode, selector: string): HTMLElement {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return found;
}

/** A merger that tags its output, to prove a component reads `UiConfig.cn`. */
const taggingCn = (...inputs: ClassValue[]) => clsx("merged-by-app", inputs);

describe("root exports", () => {
  it("exposes the kibo blocks, the markdown renderer and useDragSensors", () => {
    for (const name of [
      "GanttProvider", "GanttHeader", "GanttSidebar", "GanttTimeline", "GanttFeatureList", "GanttToday",
      "KanbanProvider", "KanbanBoard", "KanbanCard", "SortableListProvider", "SortableListGroup",
      "SortableListHeader", "SortableListItems", "SortableListItem",
      "ContributionGraph", "VideoPlayer", "LiveCursor", "LiveCursorPointer", "LiveCursorBody",
      "LiveCursorName", "AvatarStack", "ThemeSwitcher",
      "Markdown", "MarkdownLink", "useDragSensors",
    ]) {
      expect(rootExports, name).toHaveProperty(name);
    }
  });

  it("keeps generic names and the gantt maths helpers out of the root", () => {
    for (const name of [
      "ListProvider", "ListGroup", "ListHeader", "ListItems", "ListItem",
      "Cursor", "CursorPointer", "CursorBody", "CursorName",
      "getDifferenceIn", "getAddRange", "getOffset", "getWidth", "calculateInnerOffset",
    ]) {
      expect(rootExports, name).not.toHaveProperty(name);
    }
  });
});

describe("ThemeSwitcher", () => {
  it("built-in button classes without config", async () => {
    const host = await mount(<ThemeSwitcher />);
    const button = el(host, '[aria-label="Dark theme"]');
    expect(button.className).toBe(
      "relative h-6 w-6 rounded-full transition-[scale] duration-150 ease-out active:scale-[0.94] hit-target",
    );
  });

  it("classes.button replaces the button classes; className goes through UiConfig.cn", async () => {
    const host = await mount(<ThemeSwitcher className="w-fit" />, {
      cn: taggingCn,
      ThemeSwitcher: { classes: { button: "app-press" } },
    });
    expect(el(host, '[aria-label="Dark theme"]').className).toBe("app-press");
    expect(el(host, "div").className).toContain("merged-by-app");
    expect(el(host, "div").className).toContain("w-fit");
  });
});

describe("VideoPlayer", () => {
  it("built-in root and control bar classes without config", async () => {
    const host = await mount(
      <VideoPlayer>
        <VideoPlayerControlBar />
      </VideoPlayer>,
    );
    expect(el(host, "media-controller").getAttribute("class")).toBe(
      "overflow-hidden rounded-surface shadow-lg shadow-black/20",
    );
    expect(el(host, "media-control-bar").getAttribute("class")).toBe(
      "bg-zinc-950/95 px-1 *:transition-colors *:duration-150",
    );
  });

  it("classes replace root and control bar; className merges last", async () => {
    const host = await mount(
      <VideoPlayer className="max-w-full">
        <VideoPlayerControlBar />
      </VideoPlayer>,
      { VideoPlayer: { classes: { root: "app-root", controlBar: "app-bar" } } },
    );
    expect(el(host, "media-controller").getAttribute("class")).toBe("app-root max-w-full");
    expect(el(host, "media-control-bar").getAttribute("class")).toBe("app-bar");
  });
});

function board() {
  return (
    <KanbanProvider columns={[{ id: "todo", name: "Todo" }]} data={[{ id: "c1", name: "One", column: "todo" }]}>
      <KanbanBoard id="todo">
        <KanbanCards id="todo">
          {(item) => (
            <KanbanCard key={item.id} id={item.id} className="p-2">
              {item.name}
            </KanbanCard>
          )}
        </KanbanCards>
      </KanbanBoard>
    </KanbanProvider>
  );
}

describe("Kanban", () => {
  it("built-in card classes and press transition without config", async () => {
    const host = await mount(board());
    const card = el(host, '[aria-roledescription="sortable"]');
    expect(card.className).toBe(
      "cursor-grab transition-[opacity,transform,scale] duration-150 active:scale-[0.98] rounded-surface p-2",
    );
    expect(card.style.transition).toBe(
      "scale 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms cubic-bezier(0.22, 1, 0.36, 1)",
    );
  });

  it("classes.card and cardTransition replace the defaults", async () => {
    const host = await mount(board(), {
      Kanban: { classes: { card: "app-card" }, cardTransition: "opacity 1s linear" },
    });
    const card = el(host, '[aria-roledescription="sortable"]');
    expect(card.className).toBe("app-card rounded-surface p-2");
    expect(card.style.transition).toBe("opacity 1s linear");
  });
});

const feature: GanttFeature = {
  id: "f1",
  name: "Build",
  startAt: new Date(2026, 0, 5),
  endAt: new Date(2026, 1, 20),
  status: { id: "s", name: "Active", color: "#3b82f6" },
};

function gantt() {
  return (
    <GanttProvider>
      <GanttTimeline>
        <GanttFeatureItem {...feature} onMove={() => {}} />
        <GanttToday />
      </GanttTimeline>
    </GanttProvider>
  );
}

describe("Gantt", () => {
  it("built-in classes without config", async () => {
    const host = await mount(gantt());
    expect(el(host, ".gantt").className).toBe(
      "gantt relative isolate grid h-full w-full flex-none select-none overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-surface bg-card monthly",
    );
    expect(host.innerHTML).toContain("text-[0.625rem] leading-[0.875rem]");
    expect(host.innerHTML).toContain("transition-[max-height] duration-200");
    expect(host.innerHTML).toContain("transition-[opacity,translate] duration-150");
  });

  it("classes replace root, today pill, today date and drag grip", async () => {
    const host = await mount(gantt(), {
      Gantt: {
        classes: { root: "app-gantt", today: "app-today", todayDate: "app-date", dragHandle: "app-grip" },
      },
    });
    expect(host.querySelector(".gantt")).toBeNull();
    expect(el(host, ".app-gantt").className).toBe("app-gantt monthly");
    expect(el(host, ".app-today").textContent).toContain("Today");
    expect(el(host, ".app-today .app-date")).toBeTruthy();
    expect(host.querySelectorAll(".app-grip")).toHaveLength(2);
  });
});

describe("Markdown", () => {
  it("renders alerts, inline code and math inside .markdown", async () => {
    const host = await mount(
      <Markdown className="text-sm">{"> [!TIP]\n> Use `src/a.ts`.\n\n$$x^2$$"}</Markdown>,
    );
    expect(el(host, ".markdown").className).toContain("text-sm");
    expect(el(host, '[data-alert="tip"]').getAttribute("role")).toBe("note");
    expect(el(host, ".markdown-inline-code[data-file]").textContent).toBe("src/a.ts");
    expect(host.querySelector(".katex")).not.toBeNull();
  });

  it("merges className with UiConfig.cn", async () => {
    const host = await mount(<Markdown className="text-sm">{"Hi"}</Markdown>, { cn: taggingCn });
    expect(el(host, ".markdown").className).toContain("merged-by-app");
  });
});

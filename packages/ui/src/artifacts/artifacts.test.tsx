// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtifactListRow } from "@vvedantb/server";
import * as rootExports from "../index";
import { ArtifactCard } from "./artifact-card";
import { ArtifactList } from "./artifact-list";
import { ArtifactListToolbar } from "./artifact-list-toolbar";
import { ArtifactTypeIcon } from "./artifact-type-icon";
import { ArtifactVersionsMenu } from "./artifact-versions-menu";
import { ArtifactViewer } from "./artifact-viewer";
import type { ArtifactDocument, ArtifactSummary } from "./types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return {
    host,
    rerender: (next: ReactNode) => act(async () => created.render(next)),
  };
}

async function unmount() {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
}

function byLabel<T extends Element = HTMLButtonElement>(label: string, scope: ParentNode = document): T {
  const found = scope.querySelector<T>(`[aria-label="${label}"]`);
  if (!found) throw new Error(`no element labelled ${label}`);
  return found;
}

/** Opens a Radix menu trigger the way a mouse does. */
async function pointerOpen(trigger: Element) {
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
  });
}

function menuItem(text: string): HTMLElement {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')).find(
    (item) => item.textContent?.includes(text),
  );
  if (!found) throw new Error(`no menu item ${text}`);
  return found;
}

function buttonByText(text: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === text);
  if (!found) throw new Error(`no button ${text}`);
  return found;
}

async function click(element: Element, init: MouseEventInit = {}) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));
  });
}

async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(async () => {
  await unmount();
  vi.restoreAllMocks();
});

const quiz: ArtifactSummary = {
  id: "a1",
  title: "Cell biology quiz",
  description: "Ten questions on organelles.",
  type: "quiz",
  format: "json",
  updatedAt: Date.now() - 3 * 60 * 60 * 1000,
};
const report: ArtifactSummary = { id: "a2", title: "Q3 report", type: "report", format: "html", updatedAt: Date.now() };

describe("artifact exports", () => {
  it("are on the root", () => {
    for (const name of [
      "ArtifactFrame", "ArtifactCard", "ArtifactList", "ArtifactListToolbar", "ArtifactViewer",
      "ArtifactVersionsMenu", "ArtifactTypeIcon", "ArtifactRender", "ArtifactRenameDialog", "ArtifactDeleteDialog",
      "useArtifactEditDialogs", "ARTIFACT_TYPE_LABELS", "downloadArtifactBody", "copyArtifactBody",
      // The ai-elements container parts the viewer builds on are still there.
      "Artifact", "ArtifactHeader", "ArtifactAction",
    ]) {
      expect(rootExports, name).toHaveProperty(name);
    }
  });

  it("a full list row fits the card", async () => {
    const row: ArtifactListRow = {
      ...report,
      schemaVersion: 1,
      currentVersion: 1,
      size: 10,
      origin: { client: "web" },
      createdAt: 0,
    };
    const { host } = await mount(<ArtifactCard artifact={row} />);
    expect(host.textContent).toContain("Q3 report");
  });
});

describe("artifact source", () => {
  // Shared by several apps: app details (such as a state alias) come in as props.
  it("names no app", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const names = /(?:vibot|vmem|vhub|velth)|\b(?:eva|verve)\b/i;
    const files = readdirSync(dir).filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."));
    expect(files).toContain("artifact-frame.tsx");
    for (const file of files) expect(readFileSync(join(dir, file), "utf8"), file).not.toMatch(names);
  });
});

describe("ArtifactTypeIcon", () => {
  it("renders a decorative icon per type", async () => {
    const { host } = await mount(<ArtifactTypeIcon type="flashcards" size={20} />);
    const svg = host.querySelector("svg");
    expect(svg?.getAttribute("data-artifact-type")).toBe("flashcards");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("20");
  });
});

describe("ArtifactList", () => {
  it("shows the empty state with defaults", async () => {
    const { host } = await mount(<ArtifactList artifacts={[]} />);
    expect(host.textContent).toContain("No artifacts yet");
    expect(host.textContent).toContain("Artifacts you save show up here.");
    expect(host.querySelector("[data-artifact-id]")).toBeNull();
  });

  it("shows a custom empty state with actions", async () => {
    const { host } = await mount(
      <ArtifactList
        artifacts={[]}
        emptyTitle="Nothing matches"
        emptyDescription="Try another search."
        emptyActions={<button type="button">New artifact</button>}
      />,
    );
    expect(host.textContent).toContain("Nothing matches");
    expect(host.textContent).toContain("Try another search.");
    expect(buttonByText("New artifact")).toBeTruthy();
  });

  it("renders one row per artifact in a grid, with type, title, description and time", async () => {
    const { host } = await mount(<ArtifactList artifacts={[quiz, report]} />);
    const rows = Array.from(host.querySelectorAll("[data-artifact-id]"));
    expect(rows.map((row) => row.getAttribute("data-artifact-id"))).toEqual(["a1", "a2"]);
    expect(host.firstElementChild?.className).toContain("grid");
    expect(rows[0]?.querySelector("[data-artifact-type]")?.getAttribute("data-artifact-type")).toBe("quiz");
    expect(rows[0]?.textContent).toContain("Cell biology quiz");
    expect(rows[0]?.textContent).toContain("Ten questions on organelles.");
    expect(rows[0]?.textContent).toContain("3h");
  });

  it("renders compact rows without the description in list layout", async () => {
    const { host } = await mount(<ArtifactList artifacts={[quiz]} layout="list" />);
    expect(host.firstElementChild?.className).toContain("flex-col");
    expect(host.textContent).toContain("Cell biology quiz");
    expect(host.textContent).not.toContain("Ten questions");
  });

  it("opens through a button, or a link that keeps modified clicks native", async () => {
    const onOpen = vi.fn();
    const { host, rerender } = await mount(<ArtifactList artifacts={[quiz]} onOpen={onOpen} />);
    const button = host.querySelector("[data-artifact-id] > button");
    if (!button) throw new Error("no open button");
    await click(button);
    expect(onOpen).toHaveBeenCalledWith(quiz);

    await rerender(<ArtifactList artifacts={[quiz]} onOpen={onOpen} getHref={(a) => `/artifacts/${a.id}`} />);
    const link = host.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/artifacts/a1");
    if (!link) throw new Error("no link");
    const plain = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    await act(async () => link.dispatchEvent(plain));
    expect(plain.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(2);
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true });
    await act(async () => link.dispatchEvent(modified));
    expect(modified.defaultPrevented).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("has no actions menu without callbacks", async () => {
    const { host } = await mount(<ArtifactList artifacts={[quiz]} />);
    expect(host.querySelector('[aria-label="Artifact actions"]')).toBeNull();
  });
});

describe("ArtifactCard menu", () => {
  it("lists only the actions it has callbacks for", async () => {
    await mount(<ArtifactCard artifact={quiz} onOpen={vi.fn()} onDelete={vi.fn()} />);
    await pointerOpen(byLabel("Artifact actions"));
    // Delete also carries the hidden Alt hint.
    const labels = Array.from(document.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent);
    expect(labels).toEqual(["Open", expect.stringMatching(/^Delete/)]);
  });

  it("renames through the dialog with the trimmed title", async () => {
    const onRename = vi.fn(async () => {});
    await mount(<ArtifactCard artifact={quiz} onRename={onRename} />);
    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Rename"));
    const input = byLabel<HTMLInputElement>("Artifact name");
    expect(input.value).toBe("Cell biology quiz");
    await type(input, "  Cell quiz  ");
    await click(buttonByText("Save"));
    expect(onRename).toHaveBeenCalledWith(quiz, "Cell quiz");
    expect(document.querySelector('[aria-label="Artifact name"]')).toBeNull();
  });

  it("keeps the rename dialog open when the rename fails", async () => {
    const onRename = vi.fn(async () => {
      throw new Error("nope");
    });
    await mount(<ArtifactCard artifact={quiz} onRename={onRename} />);
    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Rename"));
    await type(byLabel<HTMLInputElement>("Artifact name"), "Other");
    await click(buttonByText("Save"));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(byLabel<HTMLInputElement>("Artifact name").value).toBe("Other");
  });

  it("deletes after the confirm dialog", async () => {
    const onDelete = vi.fn();
    await mount(<ArtifactCard artifact={quiz} onDelete={onDelete} />);
    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Delete"));
    expect(document.body.textContent).toContain('Delete "Cell biology quiz"?');
    expect(document.body.textContent).toContain("This cannot be undone.");
    expect(onDelete).not.toHaveBeenCalled();
    await click(buttonByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(quiz);
  });

  it("shows a custom delete description passed through the list", async () => {
    await mount(<ArtifactList artifacts={[quiz]} onDelete={vi.fn()} deleteDescription="You can undo this for 30 seconds." />);
    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Delete"));
    expect(document.body.textContent).toContain("You can undo this for 30 seconds.");
    expect(document.body.textContent).not.toContain("This cannot be undone.");
  });

  it("copies and downloads the body it loads", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const getBody = vi.fn(async () => "<p>body</p>");
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    await mount(<ArtifactCard artifact={report} getBody={getBody} />);
    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Copy"));
    expect(getBody).toHaveBeenCalledWith(report);
    expect(writeText).toHaveBeenCalledWith("<p>body</p>");

    await pointerOpen(byLabel("Artifact actions"));
    await click(menuItem("Download"));
    expect(clicked).toEqual(["Q3 report.html"]);
  });
});

describe("ArtifactListToolbar", () => {
  it("reports search input and clearing", async () => {
    const onQueryChange = vi.fn();
    await mount(<ArtifactListToolbar query="cell" onQueryChange={onQueryChange} />);
    const input = byLabel<HTMLInputElement>("Search artifacts");
    expect(input.value).toBe("cell");
    await type(input, "cells");
    expect(onQueryChange).toHaveBeenLastCalledWith("cells");
    await click(byLabel("Clear search"));
    expect(onQueryChange).toHaveBeenLastCalledWith("");
  });

  it("filters by type, and back to all types", async () => {
    const onTypeChange = vi.fn();
    const { rerender } = await mount(
      <ArtifactListToolbar query="" onQueryChange={vi.fn()} onTypeChange={onTypeChange} types={["quiz", "report"]} />,
    );
    const trigger = byLabel("Filter by type");
    expect(trigger.textContent).toBe("All types");
    await pointerOpen(trigger);
    const options = Array.from(document.querySelectorAll('[role="menuitemradio"]')).map((item) => item.textContent);
    expect(options).toEqual(["All types", "Quiz", "Report"]);
    await click(menuItem("Quiz"));
    expect(onTypeChange).toHaveBeenLastCalledWith("quiz");

    await rerender(
      <ArtifactListToolbar query="" onQueryChange={vi.fn()} type="quiz" onTypeChange={onTypeChange} types={["quiz", "report"]} />,
    );
    expect(byLabel("Filter by type").textContent).toBe("Quiz");
    await pointerOpen(byLabel("Filter by type"));
    await click(menuItem("All types"));
    expect(onTypeChange).toHaveBeenLastCalledWith(undefined);
  });

  it("hides the filter and layout toggle without callbacks, and toggles layout with one", async () => {
    const { rerender } = await mount(<ArtifactListToolbar query="" onQueryChange={vi.fn()} />);
    expect(document.querySelector('[aria-label="Filter by type"]')).toBeNull();
    expect(document.querySelector('[aria-label="List view"]')).toBeNull();

    const onLayoutChange = vi.fn();
    await rerender(<ArtifactListToolbar query="" onQueryChange={vi.fn()} layout="grid" onLayoutChange={onLayoutChange} />);
    expect(byLabel("Grid view").getAttribute("aria-pressed")).toBe("true");
    await click(byLabel("List view"));
    expect(onLayoutChange).toHaveBeenCalledWith("list");
  });
});

const versions = [
  { version: 1, createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
  { version: 3, createdAt: Date.now() - 60 * 1000, title: "Renamed" },
  { version: 2, createdAt: Date.now() - 60 * 60 * 1000 },
];

describe("ArtifactVersionsMenu", () => {
  it("lists versions newest first and marks the current one", async () => {
    await mount(<ArtifactVersionsMenu versions={versions} currentVersion={3} onViewVersion={vi.fn()} />);
    const trigger = byLabel("Versions");
    expect(trigger.textContent).toBe("v3");
    await pointerOpen(trigger);
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-version]"));
    expect(items.map((item) => item.dataset.version)).toEqual(["3", "2", "1"]);
    expect(items[0]?.textContent).toContain("Current");
    expect(items[0]?.textContent).toContain("Renamed");
    expect(items[1]?.textContent).toContain("1h");
  });

  it("views a version, and restores the one on screen", async () => {
    const onViewVersion = vi.fn();
    const onRestoreVersion = vi.fn();
    const { rerender } = await mount(
      <ArtifactVersionsMenu versions={versions} currentVersion={3} onViewVersion={onViewVersion} onRestoreVersion={onRestoreVersion} />,
    );
    await pointerOpen(byLabel("Versions"));
    expect(document.body.textContent).not.toContain("Restore v");
    await click(menuItem("v2"));
    expect(onViewVersion).toHaveBeenCalledWith(2);
    expect(onRestoreVersion).not.toHaveBeenCalled();

    await rerender(
      <ArtifactVersionsMenu
        versions={versions}
        currentVersion={3}
        viewingVersion={2}
        onViewVersion={onViewVersion}
        onRestoreVersion={onRestoreVersion}
      />,
    );
    await pointerOpen(byLabel("Versions"));
    await click(menuItem("Restore v2"));
    expect(onRestoreVersion).toHaveBeenCalledWith(2);
  });

  it("restores straight from the list without onViewVersion", async () => {
    const onRestoreVersion = vi.fn();
    await mount(<ArtifactVersionsMenu versions={versions} currentVersion={3} onRestoreVersion={onRestoreVersion} />);
    await pointerOpen(byLabel("Versions"));
    expect(menuItem("v3").getAttribute("aria-disabled")).toBe("true");
    await click(menuItem("v1"));
    expect(onRestoreVersion).toHaveBeenCalledWith(1);
  });
});

const doc: ArtifactDocument = {
  id: "a2",
  title: "Q3 report",
  type: "report",
  format: "markdown",
  currentVersion: 3,
  body: "# Q3\n\nRevenue grew.",
};

describe("ArtifactViewer", () => {
  it("renders the header and the body by format", async () => {
    const { host, rerender } = await mount(<ArtifactViewer artifact={doc} headerStart={<a href="/back">Back</a>} />);
    expect(host.textContent).toContain("Back");
    expect(host.textContent).toContain("Q3 report");
    expect(host.querySelector("iframe")).toBeNull();
    expect(host.textContent).toContain("Revenue grew.");
    // No callbacks: only Copy and Download.
    expect(Array.from(host.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))).toEqual(["Copy", "Download"]);

    await rerender(<ArtifactViewer artifact={{ ...doc, format: "html", body: "<p>Hi</p>" }} />);
    const iframe = host.querySelector("iframe");
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe?.getAttribute("title")).toBe("Q3 report");
  });

  it("copies, downloads as the format's file, and opens the page in a new tab", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    await mount(<ArtifactViewer artifact={doc} href="/artifacts/a2" />);
    await click(byLabel("Copy"));
    expect(writeText).toHaveBeenCalledWith(doc.body);
    await click(byLabel("Download"));
    expect(downloads).toEqual(["Q3 report.md"]);
    await click(byLabel("Open in new tab"));
    expect(open).toHaveBeenCalledWith("/artifacts/a2", "_blank", "noopener");
  });

  it("renames and deletes through the dialogs, and Alt-click skips the delete dialog", async () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    await mount(<ArtifactViewer artifact={doc} onRename={onRename} onDelete={onDelete} />);

    await click(byLabel("Rename"));
    await type(byLabel<HTMLInputElement>("Artifact name"), "Q3 summary");
    await click(buttonByText("Save"));
    expect(onRename).toHaveBeenCalledWith("Q3 summary");

    await click(byLabel("Delete"));
    expect(document.body.textContent).toContain('Delete "Q3 report"?');
    expect(document.body.textContent).toContain("This cannot be undone.");
    await click(buttonByText("Cancel"));
    expect(onDelete).not.toHaveBeenCalled();

    await click(byLabel("Delete"), { altKey: true });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain('Delete "Q3 report"?');
  });

  it("shows a custom delete description", async () => {
    await mount(<ArtifactViewer artifact={doc} onDelete={vi.fn()} deleteDescription={<span>Moved to trash.</span>} />);
    await click(byLabel("Delete"));
    expect(document.body.textContent).toContain("Moved to trash.");
    expect(document.body.textContent).not.toContain("This cannot be undone.");
  });

  it("shows the versions menu when given versions", async () => {
    const onViewVersion = vi.fn();
    await mount(<ArtifactViewer artifact={doc} versions={versions} viewingVersion={2} onViewVersion={onViewVersion} />);
    const trigger = byLabel("Versions");
    expect(trigger.textContent).toBe("v2");
    await pointerOpen(trigger);
    await click(menuItem("v1"));
    expect(onViewVersion).toHaveBeenCalledWith(1);
  });
});

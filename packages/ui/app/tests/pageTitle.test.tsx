// @vitest-environment happy-dom
import { useLayoutEffect, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createPageTitleContext } from "../src/index.js";
import { domSnapshot, mount, plain, resetDom, step } from "./parity/harness";
import * as reference from "./parity/page-title-reference";

type Kit = {
  PageTitleProvider: (props: { children: ReactNode }) => ReactNode;
  usePageTitle: () => object;
  usePublish: (title: string | undefined) => void;
};

// The adoption recipe per app: one kit, and the page container calls usePageTitleSync.
function adopt(missingProviderMessage?: string): Kit {
  const kit = createPageTitleContext({ missingProviderMessage });
  return { ...kit, usePublish: kit.usePageTitleSync };
}

const titleKeys = ["pageTitle", "setPageTitle"];
const slotKeys = [...titleKeys, "mobileActionsSlot", "setMobileActionsSlot"];

// The shared value also carries the mobile actions slot; each app is compared on
// the keys its own context has.
const labels: [string, Kit, Kit, string[]][] = [
  ["app-a", reference.appA, adopt(), titleKeys],
  ["app-b", reference.appB, adopt("usePageTitle must be used within a PageTitleProvider"), slotKeys],
  ["app-e", reference.appE, adopt("usePageTitle must be used within PageTitleProvider"), titleKeys],
];

function pick(value: object, keys: string[]) {
  const all = plain(value) ?? {};
  return Object.fromEntries(keys.map((k) => [k, all[k]]));
}

function scenario(kit: Kit, keys: string[]) {
  resetDom();
  const shell: unknown[] = [];
  let setSlot: ((slot: HTMLElement | null) => void) | undefined;
  function Shell() {
    const value = kit.usePageTitle();
    const snapshot = pick(value, keys);
    const setter = Reflect.get(value, "setMobileActionsSlot");
    if (typeof setter === "function") setSlot = (slot) => setter(slot);
    useLayoutEffect(() => {
      shell.push(snapshot);
    });
    return null;
  }
  function Page({ title }: { title: string | undefined }) {
    kit.usePublish(title);
    return null;
  }
  const tree = (page: ReactNode) => (
    <kit.PageTitleProvider>
      <Shell />
      {page}
    </kit.PageTitleProvider>
  );
  const steps: { label: string; shell: unknown[]; title: string }[] = [];
  const snap = (label: string) => {
    steps.push({ label, shell: [...shell], title: domSnapshot().title });
    shell.length = 0;
  };
  const app = mount(tree(<Page title="Inbox" />));
  snap("mount");
  app.render(tree(<Page title="Settings" />));
  snap("title changes");
  app.render(tree(<Page title={undefined} />));
  snap("no title");
  app.render(tree(<Page title="Back" />));
  snap("title again");
  app.render(tree(null));
  snap("page unmounts");
  if (keys.includes("mobileActionsSlot")) {
    const slot = document.createElement("div");
    step(() => setSlot?.(slot));
    snap("slot registered");
  }
  app.unmount();
  return steps;
}

describe("page title parity", () => {
  for (const [label, ref, adopted, keys] of labels) {
    it(`${label}: the shell sees the same values; document.title is untouched`, () => {
      const expected = scenario(ref, keys);
      expect(scenario(adopted, keys)).toEqual(expected);
      expect(expected.map((s) => s.title)).toEqual(expected.map(() => "Initial title"));
      expect(expected.flatMap((s) => s.shell)).toContainEqual(expect.objectContaining({ pageTitle: "Settings" }));
    });

    it(`${label}: outside the provider`, () => {
      const read = (kit: Kit) => {
        let value: unknown;
        function Outside() {
          value = pick(kit.usePageTitle(), keys);
          return null;
        }
        const onError = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          mount(<Outside />).unmount();
          return { value };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        } finally {
          onError.mockRestore();
        }
      };
      expect(read(adopted)).toEqual(read(ref));
    });
  }

  it("app-b: the mobile actions slot round-trips through the context", () => {
    const last = scenario(adopt("x"), slotKeys).at(-1);
    expect(last?.label).toBe("slot registered");
    expect(last?.shell.at(-1)).toMatchObject({ mobileActionsSlot: expect.any(HTMLElement) });
  });
});

describe("usePageTitleSync", () => {
  it("publishes string titles and clears for other nodes and on unmount", () => {
    const kit = createPageTitleContext();
    const seen: string[] = [];
    function Shell() {
      const { pageTitle } = kit.usePageTitle();
      useLayoutEffect(() => {
        seen.push(pageTitle);
      });
      return null;
    }
    function Page({ title }: { title: ReactNode }) {
      kit.usePageTitleSync(title);
      return null;
    }
    const tree = (page: ReactNode) => (
      <kit.PageTitleProvider>
        <Shell />
        {page}
      </kit.PageTitleProvider>
    );
    const app = mount(tree(<Page title="Chat" />));
    app.render(tree(<Page title={<b>Rich</b>} />));
    app.render(tree(null));
    app.unmount();
    expect(seen.filter((t, i) => t !== seen[i - 1])).toEqual(["", "Chat", ""]);
  });
});

describe("documentTitle option", () => {
  it("writes title + separator + suffix, falls back while empty and restores on unmount", () => {
    resetDom();
    document.title = "App";
    const kit = createPageTitleContext({ documentTitle: { suffix: "App", separator: " | " } });
    function Page({ title }: { title?: string }) {
      kit.usePageTitleSync(title);
      return null;
    }
    const tree = (page: ReactNode) => <kit.PageTitleProvider>{page}</kit.PageTitleProvider>;
    const app = mount(tree(<Page title="Inbox" />));
    expect(document.title).toBe("Inbox | App");
    app.render(tree(<Page />));
    expect(document.title).toBe("App");
    app.render(tree(<Page title="Settings" />));
    expect(document.title).toBe("Settings | App");
    document.title = "Changed elsewhere";
    app.unmount();
    expect(document.title).toBe("App");
  });

  it("uses the default separator, an explicit fallback, and no suffix", () => {
    resetDom();
    const withSuffix = createPageTitleContext({ documentTitle: { suffix: "Hub", fallback: "Hub home" } });
    const bare = createPageTitleContext({ documentTitle: {} });
    for (const [kit, titled, empty] of [
      [withSuffix, "Keys · Hub", "Hub home"],
      [bare, "Keys", "Initial title"],
    ] as const) {
      function Page({ title }: { title?: string }) {
        kit.usePageTitleSync(title);
        return null;
      }
      const app = mount(
        <kit.PageTitleProvider>
          <Page title="Keys" />
        </kit.PageTitleProvider>,
      );
      expect(document.title).toBe(titled);
      app.render(
        <kit.PageTitleProvider>
          <Page />
        </kit.PageTitleProvider>,
      );
      expect(document.title).toBe(empty);
      app.unmount();
    }
  });
});

import { createElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { tokens } from "../src/tokens";

// `ExpoWebRoot` (0.7.0) for `app/+html.tsx`. `expo-router` is not installed
// here, so `ScrollViewStyleReset` is a stub; the checks call the component and
// read the element tree.

vi.mock("expo-router/html", () => ({ ScrollViewStyleReset: "ScrollViewStyleReset" }));

const { ExpoWebRoot, EXPO_WEB_VIEWPORT } = await import("../src/ExpoWebRoot");

type El = ReactElement<{ children?: unknown; [key: string]: unknown }>;
const kids = (el: El): El[] =>
  ([] as unknown[]).concat(el.props.children ?? []).filter((c): c is El => Boolean(c) && typeof c === "object");

function head(props: Partial<Parameters<typeof ExpoWebRoot>[0]> = {}) {
  const html = ExpoWebRoot({ children: "app", ...props }) as El;
  const [headEl, body] = kids(html);
  return { html, head: kids(headEl!), body: body! };
}

describe("ExpoWebRoot", () => {
  it("renders html lang, the meta tags, the scroll reset, the background style and the body", () => {
    const { html, head: nodes, body } = head();
    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
    expect(nodes.map((n) => n.type)).toEqual(["meta", "meta", "meta", "ScrollViewStyleReset", "style"]);
    expect(nodes[0]!.props.charSet).toBe("utf-8");
    expect(nodes[1]!.props).toMatchObject({ httpEquiv: "X-UA-Compatible", content: "IE=edge" });
    expect(body.type).toBe("body");
    expect(body.props.children).toBe("app");
  });

  it("has the native and accessible viewports, native by default", () => {
    expect(EXPO_WEB_VIEWPORT.native).toBe(
      "width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover",
    );
    expect(EXPO_WEB_VIEWPORT.accessible).toBe("width=device-width, initial-scale=1.0, viewport-fit=cover");
    expect(EXPO_WEB_VIEWPORT.accessible).not.toMatch(/maximum-scale|user-scalable/);
    expect(head().head[2]!.props.content).toBe(EXPO_WEB_VIEWPORT.native);
    expect(head({ viewport: "accessible" }).head[2]!.props.content).toBe(EXPO_WEB_VIEWPORT.accessible);
  });

  it("fills the body from tokens.color.background by default, and takes overrides", () => {
    const css = (el: El) => (el.props.dangerouslySetInnerHTML as { __html: string }).__html;
    const byDefault = css(head().head[4]!);
    expect(byDefault).toContain(`background-color: ${tokens.color.background.light};`);
    expect(byDefault).toContain(`background-color: ${tokens.color.background.dark};`);
    expect(byDefault).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(byDefault).toMatch(/html\.dark body/);
    const custom = css(head({ lightBackground: "#fff", darkBackground: "#000" }).head[4]!);
    expect(custom).toContain("background-color: #fff;");
    expect(custom).toContain("background-color: #000;");
  });

  it("drops the scroll reset on request, and appends extra head nodes and lang", () => {
    const { html, head: nodes } = head({ scrollReset: false, lang: "en-GB", head: createElement("link", { rel: "icon", href: "/x.png" }) });
    expect(html.props.lang).toBe("en-GB");
    expect(nodes.map((n) => n.type)).toEqual(["meta", "meta", "meta", "style", "link"]);
  });
});

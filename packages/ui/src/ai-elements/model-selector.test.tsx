// @vitest-environment happy-dom
// Deprecated `ModelSelectorLogo` renders `ProviderIcon`: no `<img>`, no
// network fetch, a neutral glyph for providers without a mark.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ModelSelectorLogo, ModelSelectorLogoGroup } from "./model-selector";
import { ProviderIcon } from "./provider-icon";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Root[] = [];

async function html(node: ReactNode) {
  const host = document.createElement("div");
  const root = createRoot(host);
  roots.push(root);
  await act(async () => root.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount();
  });
});

describe("ModelSelectorLogo", () => {
  it.each([
    ["anthropic", "claude"],
    ["google-vertex-anthropic", "claude"],
    ["openai", "codex"],
    ["opencode", "opencode"],
    ["cursor", "cursor"],
  ])("%s renders the ProviderIcon %s mark", async (id, provider) => {
    const logo = await html(<ModelSelectorLogo provider={id} />);
    const icon = await html(<ProviderIcon provider={provider} size={12} />);
    const svg = logo.querySelector("svg");
    expect(logo.querySelector("img")).toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe(`${id} logo`);
    expect(svg?.getAttribute("aria-hidden")).toBe("false");
    expect(svg?.innerHTML).toBe(icon.querySelector("svg")?.innerHTML);
    expect(svg?.getAttribute("width")).toBe("12");
  });

  it("unknown providers get a neutral glyph, not a brand mark", async () => {
    const logo = await html(<ModelSelectorLogo provider="mistral" size={16} className="x" />);
    const claude = await html(<ProviderIcon provider="claude" />);
    const svg = logo.querySelector("svg");
    expect(logo.querySelector("img")).toBeNull();
    expect(svg?.getAttribute("aria-label")).toBe("mistral logo");
    expect(svg?.getAttribute("class")).toContain("x");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.innerHTML).not.toBe(claude.querySelector("svg")?.innerHTML);
  });

  it("the group styles its svg children", async () => {
    const group = await html(
      <ModelSelectorLogoGroup>
        <ModelSelectorLogo provider="openai" />
      </ModelSelectorLogoGroup>,
    );
    expect(group.firstElementChild?.getAttribute("class")).toContain("[&>svg]:bg-surface");
  });
});

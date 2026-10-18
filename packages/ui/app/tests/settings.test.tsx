import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SettingsEmptyState,
  SettingsField,
  SettingsPage,
  SettingsSection,
  SettingsStack,
  SettingsToggleRow,
} from "../src/index.js";

describe("settings chrome", () => {
  it("renders a section with caption, card and footer", () => {
    const html = renderToStaticMarkup(
      <SettingsSection title="Profile" description="Who you are" footer={<b>Save</b>}>
        body
      </SettingsSection>,
    );
    expect(html).toContain("Profile");
    expect(html).toContain("rounded-lg bg-surface-card");
    expect(html).toContain("bg-surface-secondary");
  });

  it("uses divide-separator/50 for list sections", () => {
    const html = renderToStaticMarkup(
      <SettingsSection title="T" bodyVariant="list">
        <SettingsToggleRow title="Row" action={<i />} htmlFor="x" />
      </SettingsSection>,
    );
    expect(html).toContain("divide-separator/50");
    expect(html).toContain('<label for="x"');
  });

  it("renders a field label and description", () => {
    const html = renderToStaticMarkup(
      <SettingsField label="Name" description="Shown publicly" htmlFor="n">
        <input id="n" />
      </SettingsField>,
    );
    expect(html).toContain("Shown publicly");
  });

  it("renders a horizontal field as a flex row with label and control", () => {
    const html = renderToStaticMarkup(
      <SettingsField label="Theme" description="Pick one" layout="horizontal">
        <select />
      </SettingsField>,
    );
    expect(html).toBe(
      '<div class="flex items-center justify-between gap-3"><div class="min-w-0"><p class="text-sm font-medium text-foreground">Theme</p><p class="mt-1 text-xs text-muted-foreground text-pretty">Pick one</p></div><select></select></div>',
    );
  });

  it("uses a label element in horizontal layout when htmlFor is set", () => {
    const html = renderToStaticMarkup(
      <SettingsField label="Theme" htmlFor="t" layout="horizontal">
        <select id="t" />
      </SettingsField>,
    );
    expect(html).toContain('<label for="t" class="block text-sm font-medium text-foreground">Theme</label>');
  });

  it("renders the empty state with the given icon", () => {
    const html = renderToStaticMarkup(
      <SettingsEmptyState
        icon={({ size }) => <svg data-size={size} />}
        title="Nothing yet"
        action={<button>Add</button>}
      />,
    );
    expect(html).toContain('data-size="28"');
    expect(html).toContain("Nothing yet");
    expect(html).toContain("<button>Add</button>");
  });
});

describe("SettingsPage", () => {
  it("falls back to the default layout and wraps children in the stack", () => {
    const html = renderToStaticMarkup(
      <SettingsPage title="Settings" headerRight={<i>R</i>} toolbar={<u>T</u>}>
        <p>child</p>
      </SettingsPage>,
    );
    expect(html).toContain("<h1");
    expect(html).toContain("space-y-8");
    expect(html).toContain("<i>R</i>");
    expect(html).toContain("<u>T</u>");
  });

  it("skips the stack when stack is false", () => {
    const html = renderToStaticMarkup(
      <SettingsPage title="S" stack={false}>
        <p>child</p>
      </SettingsPage>,
    );
    expect(html).not.toContain("space-y-8");
  });

  it("passes every slot and the stacked body to a custom layout", () => {
    const html = renderToStaticMarkup(
      <SettingsPage
        title="Custom"
        tabs={<em>tabs</em>}
        fillHeight
        layout={({ title, tabs, fillHeight, children }: {
          title: string;
          tabs?: ReactNode;
          fillHeight?: boolean;
          children: ReactNode;
        }) => (
          <main data-fill={String(fillHeight)}>
            <h2>{title}</h2>
            {tabs}
            {children}
          </main>
        )}
      >
        <p>child</p>
      </SettingsPage>,
    );
    expect(html).toContain('<main data-fill="true">');
    expect(html).toContain("<em>tabs</em>");
    expect(html).toContain("space-y-8");
  });

  it("SettingsStack merges a custom class", () => {
    expect(renderToStaticMarkup(<SettingsStack className="x">a</SettingsStack>)).toContain(
      "space-y-8 x",
    );
  });
});

import { IconInbox } from "@tabler/icons-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UiConfigProvider } from "../../src/ui/ui-config";
import { SettingsEmptyState } from "../src/settings/SettingsEmptyState.js";
import { SettingsSection } from "../src/settings/SettingsSection.js";

const section = (
  <SettingsSection title="Section" footer={<button type="button">Save</button>} bodyVariant="list">
    <div>row</div>
  </SettingsSection>
);

describe("SettingsSection config", () => {
  it("keeps the built-in classes without an entry", () => {
    const html = renderToStaticMarkup(section);
    expect(html).toContain("rounded-lg bg-surface-card");
    expect(html).toContain("divide-y divide-separator/50 p-0");
    expect(html).toContain("rounded-b-lg bg-surface-secondary");
  });

  it("replaces the card, body and footer classes from UiConfig", () => {
    const html = renderToStaticMarkup(
      <UiConfigProvider
        config={{
          SettingsSection: {
            classes: {
              card: "app-card",
              footer: "app-footer",
              body: { list: "app-list" },
            },
          },
        }}
      >
        {section}
      </UiConfigProvider>,
    );
    expect(html).toContain('class="app-card overflow-hidden"');
    expect(html).toContain('class="app-list"');
    expect(html).toContain('class="app-footer"');
    expect(html).not.toContain("bg-surface-card");
  });
});

describe("SettingsEmptyState config", () => {
  it("dims the icon by default", () => {
    const html = renderToStaticMarkup(<SettingsEmptyState icon={IconInbox} title="Nothing yet" />);
    expect(html).toContain("mb-5 text-muted-foreground opacity-50");
  });

  it("replaces the icon class from UiConfig", () => {
    const html = renderToStaticMarkup(
      <UiConfigProvider config={{ SettingsEmptyState: { classes: { icon: "app-icon" } } }}>
        <SettingsEmptyState icon={IconInbox} title="Nothing yet" />
      </UiConfigProvider>,
    );
    expect(html).toContain('class="tabler-icon tabler-icon-inbox app-icon"');
    expect(html).not.toContain("opacity-50");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SonnerToaster,
  createToasterClassNames,
  filledToastIcons,
  hoverChipCloseButtonClassName,
  mergeToastClassNames,
} from "./sonner";
import { UiConfigProvider } from "./ui-config";

// sonner's `Toaster` is replaced by a stub that records the props it gets, so
// rendering `SonnerToaster` exposes what it passes to sonner.
const sonner = vi.hoisted(() => {
  const state: { props: Record<string, any> } = { props: {} };
  return state;
});
vi.mock("sonner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sonner")>()),
  Toaster: (props: Record<string, any>) => {
    sonner.props = props;
    return null;
  },
}));

function render(props: Parameters<typeof SonnerToaster>[0] = {}) {
  renderToStaticMarkup(<SonnerToaster {...props} />);
  return sonner.props;
}

describe("createToasterClassNames", () => {
  it("keeps the 0.2.1 default strings, plus the 0.31.1 content class and button size and the relative icon", () => {
    expect(createToasterClassNames()).toEqual({
      toast:
        "group toast glass-panel-strong flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground smooth-shadow-ring-md",
      content: "flex min-w-0 grow flex-col",
      icon: "relative",
      title: "font-medium leading-snug",
      description: "text-[13px] leading-snug text-muted-foreground",
      actionButton:
        "h-7 shrink-0 rounded-control bg-primary px-2.5 text-xs font-medium text-primary-foreground motion-press active:scale-[0.96] hover:bg-primary/90",
      cancelButton:
        "h-7 shrink-0 rounded-control bg-surface-secondary px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-tertiary",
      closeButton:
        "rounded-lg bg-default px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-default/78",
      loader: "text-muted-foreground",
      success: "[&_[data-icon]]:text-success",
      error: "[&_[data-icon]]:text-danger",
      warning: "[&_[data-icon]]:text-warning",
      info: "[&_[data-icon]]:text-primary",
    });
  });

  it("applies the opt-in variants", () => {
    const names = createToasterClassNames({
      toastRadius: "surface",
      closeButtonStyle: "hoverChip",
      descriptionMuted: true,
    });
    expect(names.toast).toContain("rounded-surface");
    expect(names.toast).not.toContain("rounded-lg");
    expect(names.closeButton).toBe(hoverChipCloseButtonClassName);
    expect(names.description).toContain("text-muted-foreground!");
  });
});

describe("createToasterClassNames variants", () => {
  it("uses rounded-field for control radius", () => {
    const toast = createToasterClassNames({ toastRadius: "control" }).toast!;
    expect(toast).toContain("rounded-field");
    expect(toast).not.toContain("rounded-lg");
  });

  it("tightens padding, gap and text for compact density", () => {
    const names = createToasterClassNames({ density: "compact" });
    expect(names.toast).toContain("gap-2");
    expect(names.toast).toContain("px-3 py-2 text-xs");
    expect(names.toast).not.toContain("px-4");
    expect(names.description).toBe("text-xs leading-snug text-muted-foreground");
  });

  it("passes density and toastRadius through SonnerToaster", () => {
    const toast = render({ density: "compact", toastRadius: "control" }).toastOptions.classNames
      .toast;
    expect(toast).toContain("py-2");
    expect(toast).toContain("rounded-field");
  });
});

describe("content grow default", () => {
  // `unstyled: true` drops sonner's `[data-content] { flex: 1 }`, which left a gap
  // to the right of the action button. The package class puts the grow back.
  const grow = "flex min-w-0 grow flex-col";

  it("grows the content column in every variant", () => {
    expect(createToasterClassNames().content).toBe(grow);
    expect(createToasterClassNames({ density: "compact", toastRadius: "control" }).content).toBe(grow);
    expect(render().toastOptions.classNames.content).toBe(grow);
  });

  it("lets classes.content replace the default, and an empty string remove it", () => {
    expect(render({ classes: { content: "flex grow" } }).toastOptions.classNames.content).toBe("flex grow");
    expect(render({ classes: { content: "" } }).toastOptions.classNames.content).toBe("");
  });

  it("appends toastOptions.classNames.content after the default or the classes entry", () => {
    expect(
      render({ toastOptions: { classNames: { content: "gap-0.5" } } }).toastOptions.classNames.content,
    ).toBe(`${grow} gap-0.5`);
    expect(
      render({ classes: { content: "flex" }, toastOptions: { classNames: { content: "grow" } } })
        .toastOptions.classNames.content,
    ).toBe("flex grow");
  });

  it("gives an app config that already sets the grow class one copy of it", () => {
    renderToStaticMarkup(
      <UiConfigProvider config={{ SonnerToaster: { classes: { content: grow } } }}>
        <SonnerToaster />
      </UiConfigProvider>,
    );
    expect(sonner.props.toastOptions.classNames.content).toBe(grow);
  });
});

describe("action and cancel button size", () => {
  // Measured on the fixture Refresh button: Eva's `h-7 … px-2.5 text-xs` is 28px
  // tall with 10px radius; the 0.31.0 `px-2.5 py-1 text-xs rounded-lg` was 24px
  // tall with 16px radius. Both 12px text, 10px side padding.
  const size = ["h-7", "shrink-0", "rounded-control", "px-2.5", "text-xs"];

  it("gives both buttons the same height, padding, radius and text size", () => {
    const { actionButton, cancelButton } = createToasterClassNames();
    for (const [name, value] of Object.entries({ actionButton, cancelButton })) {
      const tokens = value!.split(" ");
      expect(tokens, name).toEqual(expect.arrayContaining(size));
      expect(tokens, name).not.toContain("py-1");
      expect(tokens, name).not.toContain("rounded-lg");
    }
  });

  it("uses Eva's press and hover on the action button, and keeps token surfaces on cancel", () => {
    const { actionButton, cancelButton } = createToasterClassNames();
    expect(actionButton).toContain("motion-press active:scale-[0.96] hover:bg-primary/90");
    expect(actionButton).not.toContain("hover:opacity-90");
    expect(actionButton).not.toContain("transition-opacity");
    expect(cancelButton).toContain("bg-surface-secondary");
    expect(cancelButton).toContain("hover:bg-surface-tertiary");
  });

  it("keeps the button strings in every variant", () => {
    const defaults = createToasterClassNames();
    const compact = createToasterClassNames({ density: "compact", toastRadius: "control" });
    expect(compact.actionButton).toBe(defaults.actionButton);
    expect(compact.cancelButton).toBe(defaults.cancelButton);
  });

  it("lets classes.actionButton replace the default, and toastOptions.classNames append", () => {
    const app = "rounded-lg bg-primary px-3 py-1 text-xs";
    expect(render({ classes: { actionButton: app } }).toastOptions.classNames.actionButton).toBe(app);
    expect(render({ classes: { actionButton: "" } }).toastOptions.classNames.actionButton).toBe("");
    expect(
      render({ toastOptions: { classNames: { actionButton: "px-3" } } }).toastOptions.classNames
        .actionButton,
    ).toBe(`${createToasterClassNames().actionButton} px-3`);
    expect(
      render({ classes: { actionButton: app }, toastOptions: { classNames: { actionButton: "px-3" } } })
        .toastOptions.classNames.actionButton,
    ).toBe(`${app} px-3`);
  });

  it("lets classes.cancelButton replace the default", () => {
    expect(
      render({ classes: { cancelButton: "bg-muted" } }).toastOptions.classNames.cancelButton,
    ).toBe("bg-muted");
  });
});

describe("mergeToastClassNames", () => {
  it("appends caller classes after the defaults and keeps untouched keys", () => {
    const defaults = createToasterClassNames();
    const merged = mergeToastClassNames(defaults, { toast: "mt-2", custom: "x" } as never);
    expect(merged.toast).toBe(`${defaults.toast} mt-2`);
    expect(merged.description).toBe(defaults.description);
    expect((merged as Record<string, string>).custom).toBe("x");
  });
});

describe("SonnerToaster defaults", () => {
  it("renders the default props when no new props are passed", () => {
    const props = render();
    expect(props.toastOptions.unstyled).toBe(true);
    expect(props.toastOptions.classNames).toEqual(createToasterClassNames());
    expect(props.icons).toBeUndefined();
    expect(props.style).toBeUndefined();
    expect(props.closeButton).toBeUndefined();
    expect(props.className).toBe("toaster group !font-sans");
    expect(props.gap).toBe(12);
    expect(props.expand).toBe(false);
    expect(props.visibleToasts).toBe(4);
    expect(props.position).toBe("top-right");
  });

  it("passes theme through", () => {
    expect(render({ theme: "dark" }).theme).toBe("dark");
  });
});

describe("SonnerToaster position", () => {
  // Sonner's own default is bottom-right; the package default is top-right.
  it("defaults to top-right, also when position is passed as undefined", () => {
    expect(render().position).toBe("top-right");
    expect(render({ position: undefined }).position).toBe("top-right");
  });

  it("lets a prop override the default", () => {
    expect(render({ position: "bottom-center" }).position).toBe("bottom-center");
  });

  it("lets UiConfig.SonnerToaster.position override the default, and a prop override the config", () => {
    renderToStaticMarkup(
      <UiConfigProvider config={{ SonnerToaster: { position: "bottom-right" } }}>
        <SonnerToaster />
      </UiConfigProvider>,
    );
    expect(sonner.props.position).toBe("bottom-right");
    renderToStaticMarkup(
      <UiConfigProvider config={{ SonnerToaster: { position: "bottom-right" } }}>
        <SonnerToaster position="top-left" />
      </UiConfigProvider>,
    );
    expect(sonner.props.position).toBe("top-left");
  });
});

describe("SonnerToaster merging", () => {
  it("keeps default toast and description classes when toastOptions.classNames is partial", () => {
    const defaults = createToasterClassNames();
    const props = render({ toastOptions: { classNames: { toast: "mt-2" } } });
    expect(props.toastOptions.unstyled).toBe(true);
    expect(props.toastOptions.classNames.toast).toBe(`${defaults.toast} mt-2`);
    expect(props.toastOptions.classNames.description).toBe(defaults.description);
  });

  it("lets callers override other toastOptions fields", () => {
    const props = render({ toastOptions: { duration: 9000, unstyled: false } });
    expect(props.toastOptions.duration).toBe(9000);
    expect(props.toastOptions.unstyled).toBe(false);
    expect(props.toastOptions.classNames.toast).toContain("glass-panel-strong");
  });

  it("passes caller icons unchanged when the default icon set is active", () => {
    const success = <i />;
    expect(render({ icons: { success } }).icons).toEqual({ success });
  });

  it("keeps the other filled icons when a caller overrides one", () => {
    const success = <i />;
    const icons = render({ toastIcons: "filled24", icons: { success } }).icons;
    expect(icons.success).toBe(success);
    expect(icons.error).toBe(filledToastIcons.error);
    expect(icons.close).toBe(filledToastIcons.close);
  });

  it("appends className and merges style", () => {
    const props = render({
      sonnerVars: true,
      className: "extra",
      style: { "--normal-bg": "red", color: "blue" } as never,
    });
    expect(props.className).toBe("toaster group !font-sans extra");
    expect(props.style.fontFamily).toBe("inherit");
    expect(props.style["--normal-bg"]).toBe("red");
    expect(props.style["--normal-border"]).toBe("var(--color-border)");
    expect(props.style.color).toBe("blue");
  });

  it("does not inject --normal-* vars when sonnerVars is off", () => {
    expect(render({ style: { color: "blue" } }).style).toEqual({ color: "blue" });
  });

  it("enables closeButton for the hover chip unless the caller sets it", () => {
    expect(render({ closeButtonStyle: "hoverChip" }).closeButton).toBe(true);
    expect(render({ closeButtonStyle: "hoverChip", closeButton: false }).closeButton).toBe(false);
  });
});

describe("0.3.1 opt-ins", () => {
  it("keeps leading-snug and no stacked-content class by default", () => {
    const names = createToasterClassNames();
    expect(names.title).toBe("font-medium leading-snug");
    expect(names.toast).not.toContain("data-front=false");
  });

  it("uses leading-5 when titleLeading is 5", () => {
    expect(createToasterClassNames({ titleLeading: "5" }).title).toBe("font-medium leading-5");
    expect(render({ titleLeading: "5" }).toastOptions.classNames.title).toContain("leading-5");
  });

  it("adds the stacked-content class only when hideStackedContent is true", () => {
    const cls = "[&[data-expanded=false][data-front=false]>*]:opacity-0";
    expect(createToasterClassNames({ hideStackedContent: true }).toast).toContain(cls);
    expect(render({ hideStackedContent: true }).toastOptions.classNames.toast).toContain(cls);
    expect(render().toastOptions.classNames.toast).not.toContain(cls);
  });

  it("lets icons.loading override the default and filled24 loaders", () => {
    const loading = <i />;
    expect(render({ icons: { loading } }).icons.loading).toBe(loading);
    const filled = render({ toastIcons: "filled24", icons: { loading } }).icons;
    expect(filled.loading).toBe(loading);
    expect(filled.success).toBe(filledToastIcons.success);
  });

  it("merges loadingIcon into icons and lets icons.loading win", () => {
    const a = <i />;
    const b = <b />;
    expect(render({ loadingIcon: a }).icons.loading).toBe(a);
    expect(render({ toastIcons: "filled24", loadingIcon: a }).icons.loading).toBe(a);
    expect(render({ loadingIcon: a, icons: { loading: b } }).icons.loading).toBe(b);
    expect(render({ toastIcons: "filled24", loadingIcon: a, icons: { loading: b } }).icons.loading).toBe(b);
  });

  it("paints the filled24 status icons with fill=currentColor, not only fill-current", () => {
    for (const kind of ["success", "error", "warning", "info"] as const) {
      const svg = renderToStaticMarkup(filledToastIcons[kind]);
      expect(svg, kind).toMatch(/<svg[^>]*\sfill=["']currentColor["']/);
      expect(svg, kind).not.toMatch(/<svg[^>]*\sfill=["']none["']/);
      expect(svg, kind).toMatch(/class="[^"]*\bfill-current\b/);
    }
  });

  it("pins the hover chip border over sonner's hover border", () => {
    // Sonner's dark `[data-close-button]:hover` rule is not gated on data-styled.
    expect(hoverChipCloseButtonClassName).toContain("hover:border-border!");
    expect(hoverChipCloseButtonClassName).not.toMatch(/hover:border-border(?!!)/);
  });
});

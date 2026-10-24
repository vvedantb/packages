import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SonnerToaster,
  createToasterClassNames,
  filledToastIcons,
  hoverChipCloseButtonClassName,
  mergeToastClassNames,
} from "./sonner";

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
  it("keeps the 0.2.1 default strings", () => {
    expect(createToasterClassNames()).toEqual({
      toast:
        "group toast glass-panel-strong flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground smooth-shadow-ring-md",
      title: "font-medium leading-snug",
      description: "text-[13px] leading-snug text-muted-foreground",
      actionButton:
        "rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90",
      cancelButton:
        "rounded-lg bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-tertiary",
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
  });

  it("passes theme through", () => {
    expect(render({ theme: "dark" }).theme).toBe("dark");
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

  it("pins the hover chip border over sonner's hover border", () => {
    // Sonner's dark `[data-close-button]:hover` rule is not gated on data-styled.
    expect(hoverChipCloseButtonClassName).toContain("hover:border-border!");
    expect(hoverChipCloseButtonClassName).not.toMatch(/hover:border-border(?!!)/);
  });
});

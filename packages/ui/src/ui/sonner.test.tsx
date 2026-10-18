import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  SonnerToaster,
  createToasterClassNames,
  filledToastIcons,
  hoverChipCloseButtonClassName,
  mergeToastClassNames,
} from "./sonner";

// `SonnerToaster` has no hooks, so calling it returns the sonner element and its props can be read.
function render(props: Parameters<typeof SonnerToaster>[0] = {}) {
  return (SonnerToaster(props) as ReactElement<Record<string, any>>).props;
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

import type { ComponentRenderProps } from "@json-render/react";
import type { GenerativeUiProps } from "@vvedantb/server/generative-ui";
import { Separator } from "../ui/separator";
import { Surface } from "../ui/surface";
import { cn } from "../utils/cn";

/**
 * The containers a composed panel is built from. Tailwind needs literal class
 * names, so every prop value maps through a lookup, never string interpolation.
 */

const GAP = { sm: "gap-2", md: "gap-3", lg: "gap-4" };
const ALIGN = { start: "items-start", center: "items-center", stretch: "items-stretch" };

export function StackElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Stack">>) {
  const { direction, gap, align } = element.props;
  return (
    <div
      className={cn(
        "flex min-w-0",
        direction === "vertical" ? "flex-col" : "flex-row flex-wrap",
        GAP[gap],
        ALIGN[align],
      )}
    >
      {children}
    </div>
  );
}

export function GridElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Grid">>) {
  const { columns, gap } = element.props;
  return (
    <div className={cn("grid min-w-0", columns === 3 ? "grid-cols-3" : "grid-cols-2", GAP[gap])}>{children}</div>
  );
}

export function PanelElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Panel">>) {
  const { title, description } = element.props;
  return (
    <Surface density="tight" className="flex min-w-0 flex-col gap-2 bg-surface-secondary">
      {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : null}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </Surface>
  );
}

export function SeparatorElement() {
  return <Separator className="my-1" />;
}

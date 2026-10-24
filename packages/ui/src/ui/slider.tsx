import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useCn, useUiConfig } from "./ui-config";

/** `UiConfig.Slider`: `classes` replace the built-in part classes; the `*ClassName` props still merge after. */
export interface SliderConfig {
  classes?: { root?: string; track?: string; range?: string; thumb?: string };
}

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** Accessible name per thumb, by index. Wins over `aria-label` on the first thumb. */
  thumbLabels?: string[];
  /** Classes for the track, merged after the defaults so they win (`bg-default dark:bg-muted/40`). check-tokens-allow: muted */
  trackClassName?: string;
  /** Classes for the filled range, merged after the defaults so they win (`bg-primary`). */
  rangeClassName?: string;
  /** Classes for every thumb, merged after the defaults so they win (`bg-background dark:bg-foreground dark:border-muted`). check-tokens-allow: muted */
  thumbClassName?: string;
};

// `id`, `aria-label`, `aria-labelledby` and `aria-valuetext` go to the first
// Thumb, not Root: the thumb is the focusable role="slider" element, so
// `<Label htmlFor={id}>` and the accessible name land on it. The ref stays on Root.
// `children` render inside the track, after the range (for example tick marks).
const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    {
      className,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-valuetext": ariaValueText,
      thumbLabels,
      trackClassName,
      rangeClassName,
      thumbClassName,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = useUiConfig("Slider")?.classes;
    const cn = useCn();
    const count = (props.value ?? props.defaultValue ?? [props.min ?? 0]).length;
    return (
      <SliderPrimitive.Root
        className={cn(
          classes?.root ??
            "relative flex w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
          className,
        )}
        {...props}
        ref={ref}
      >
        <SliderPrimitive.Track
          className={cn(
            classes?.track ??
              "relative grow overflow-hidden rounded-full bg-default dark:bg-muted/40 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5", // check-tokens-allow: muted
            trackClassName,
          )}
        >
          <SliderPrimitive.Range
            className={cn(
              classes?.range ??
                "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
              rangeClassName,
            )}
          />
          {children}
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            id={i === 0 ? id : undefined}
            aria-label={thumbLabels?.[i] ?? (i === 0 ? ariaLabel : undefined)}
            aria-labelledby={i === 0 ? ariaLabelledBy : undefined}
            aria-valuetext={i === 0 ? ariaValueText : undefined}
            className={cn(
              classes?.thumb ??
                "block size-4 shrink-0 rounded-full border border-border bg-background shadow-sm transition-[box-shadow] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring data-[disabled]:cursor-not-allowed dark:border-muted dark:bg-foreground", // check-tokens-allow: muted
              thumbClassName,
            )}
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
export type { SliderProps };

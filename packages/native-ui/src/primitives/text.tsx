import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText, type Role } from "react-native";
import { cn } from "../cn";
import { typeStyle } from "../controlStyles";

const textVariants = cva(
  cn(
    "text-foreground text-base",
    Platform.select({
      web: "select-text",
    }),
  ),
  {
    variants: {
      variant: {
        default: "",
        h1: cn(
          "text-4xl font-instrument-sans-medium tracking-tight",
          Platform.select({ web: "scroll-m-20" }),
        ),
        h2: cn(
          "text-3xl font-instrument-sans-medium tracking-tight border-border border-b pb-2",
          Platform.select({ web: "scroll-m-20" }),
        ),
        h3: cn(
          "text-2xl font-instrument-sans-medium tracking-tight",
          Platform.select({ web: "scroll-m-20" }),
        ),
        h4: cn(
          "text-xl font-instrument-sans-medium tracking-tight",
          Platform.select({ web: "scroll-m-20" }),
        ),
        p: "leading-7",
        blockquote: "border-l-2 border-border pl-4 italic",
        code: "bg-muted rounded px-[0.3rem] py-[0.2rem] text-sm font-instrument-sans-medium",
        lead: "text-xl text-muted-foreground",
        large: "text-lg font-instrument-sans-medium",
        small: "text-sm font-instrument-sans-medium",
        muted: "text-sm text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  blockquote: Platform.select({ web: "blockquote" as Role }),
  code: Platform.select({ web: "code" as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: "1",
  h2: "2",
  h3: "3",
  h4: "4",
};

// The weight of each variant's `font-instrument-sans-*` class, set as a style
// beside it (`typeStyle`): where an app maps every one of those classes to one
// family, the class alone draws Regular. Headings are semibold, as the web
// titles; `h1` was `font-medium` before 0.3.13.
const WEIGHT: Partial<Record<TextVariant, ReturnType<typeof typeStyle>>> = {
  h1: typeStyle("medium"),
  h2: typeStyle("medium"),
  h3: typeStyle("medium"),
  h4: typeStyle("medium"),
  code: typeStyle("medium"),
  large: typeStyle("medium"),
  small: typeStyle("medium"),
};

const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = React.ComponentPropsWithoutRef<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
    className?: string;
  };

const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  ({ className, asChild = false, variant = "default", style, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : RNText;
    const weight = variant ? WEIGHT[variant] : undefined;

    return (
      <Component
        ref={ref}
        className={cn(textVariants({ variant }), textClass, className)}
        role={variant ? ROLE[variant] : undefined}
        aria-level={variant ? ARIA_LEVEL[variant] : undefined}
        style={weight ? [weight, style] : style}
        {...props}
      />
    );
  },
);

Text.displayName = "Text";

export { Text, TextClassContext };

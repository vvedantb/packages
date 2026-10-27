import * as SelectPrimitive from "@rn-primitives/select";
import {
  Check,
  ChevronDown,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react-native";
import * as React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import { NativeOnlyAnimatedView } from "./native-only-animated-view";
import { TextClassContext } from "./text";
import { LiquidGlass } from "../LiquidGlass";
import { cn } from "../cn";
import { textStyle } from "../controlStyles";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const FullWindowOverlay =
  Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

type SelectValueProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Value
> & {
  className?: string;
};

const SelectValue = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Value>,
  SelectValueProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn("line-clamp-1 text-sm text-foreground", className)}
      {...props}
    />
  );
});

type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> & {
  className?: string;
  size?: "default" | "sm";
};

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, size = "default", disabled, ...props }, ref) => {
  const scheme = useScheme();
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      className={cn(
        "h-10 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2",
        size === "sm" && "h-8 py-1.5",
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <>{children}</>
      <ChevronDown size={16} color={tokens.color.muted[scheme]} />
    </SelectPrimitive.Trigger>
  );
});

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
> & {
  className?: string;
  portalHost?: string;
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", portalHost, ...props }, ref) => {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
        >
          <TextClassContext.Provider value="text-popover-foreground">
            <NativeOnlyAnimatedView
              entering={FadeIn}
              exiting={FadeOut}
              className="z-50"
            >
              <SelectPrimitive.Content
                ref={ref}
                position={position}
                className={cn(
                  "z-50 min-w-[8rem] rounded-lg",
                  Platform.select({
                    native: "p-1",
                    web: "max-h-52 overflow-hidden",
                  }),
                  className,
                )}
                {...props}
              >
                <LiquidGlass
                  pointerEvents="none"
                  elevated={false}
                  className="absolute inset-0 rounded-lg"
                />
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                  className={cn("p-1", position === "popper" && "w-full")}
                >
                  {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
              </SelectPrimitive.Content>
            </NativeOnlyAnimatedView>
          </TextClassContext.Provider>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
});

type SelectLabelProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Label
> & {
  className?: string;
};

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  SelectLabelProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-2 py-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
});

type SelectItemProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Item
> & {
  className?: string;
};

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, disabled, ...props }, ref) => {
  const scheme = useScheme();
  return (
    <SelectPrimitive.Item
      ref={ref}
      disabled={disabled}
      className={cn(
        "relative flex-row items-center gap-2 rounded-sm py-3 pl-2 pr-8 active:opacity-70",
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <View className="absolute right-2 size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={16} color={tokens.color.muted[scheme]} />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText
        className="select-none text-sm font-instrument-sans-medium"
        style={textStyle("foreground", scheme)}
      />
    </SelectPrimitive.Item>
  );
});

type SelectSeparatorProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Separator
> & {
  className?: string;
};

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  SelectSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
});

function SelectScrollUpButton(
  props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>,
) {
  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <SelectPrimitive.ScrollUpButton
      className="items-center justify-center py-1"
      {...props}
    >
      <ChevronUpIcon size={16} color="#737373" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton(
  props: React.ComponentPropsWithoutRef<
    typeof SelectPrimitive.ScrollDownButton
  >,
) {
  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <SelectPrimitive.ScrollDownButton
      className="items-center justify-center py-1"
      {...props}
    >
      <ChevronDownIcon size={16} color="#737373" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function NativeSelectScrollView({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollView> & { className?: string }) {
  if (Platform.OS === "web") {
    return <>{props.children}</>;
  }

  return <ScrollView className={cn("max-h-52", className)} {...props} />;
}

SelectValue.displayName = "SelectValue";
SelectTrigger.displayName = "SelectTrigger";
SelectContent.displayName = "SelectContent";
SelectLabel.displayName = "SelectLabel";
SelectItem.displayName = "SelectItem";
SelectSeparator.displayName = "SelectSeparator";

export {
  NativeSelectScrollView,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type Option,
};

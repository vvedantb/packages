import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { IconX } from "@tabler/icons-react-native";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { textStyle } from "./controlStyles";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";
import {
  OverlayClose,
  OverlayModal,
  OverlayRoot,
  OverlayTrigger,
  type OverlayPressableProps,
  type OverlayRootProps,
} from "./primitives/overlay";

export type DialogProps = OverlayRootProps;

/** Holds the open state (controlled with `open` / `onOpenChange`, or `defaultOpen`). Renders no view. */
export function Dialog(props: DialogProps) {
  return <OverlayRoot {...props} />;
}

/** Opens the dialog. `asChild` merges the press into its child, for example a `Button`. */
export function DialogTrigger(props: OverlayPressableProps) {
  return <OverlayTrigger part="DialogTrigger" {...props} />;
}

/** Closes the dialog. `asChild` merges the press into its child. */
export function DialogClose(props: OverlayPressableProps) {
  return <OverlayClose part="DialogClose" {...props} />;
}

export type DialogContentProps = ViewProps & {
  className?: string;
  /** Hide the close button in the top-right corner. Default `false`. */
  hideCloseButton?: boolean;
  /** Close on a backdrop tap. Default `true`. `AlertDialogContent` sets `false`. */
  dismissible?: boolean;
};

/**
 * Centred panel in an RN `Modal`: opaque surface (card radius 24, floating
 * shadow, no blur), at most 480 wide, padding 24 as on the web. Android back
 * closes it.
 */
export function DialogContent({
  children,
  className,
  hideCloseButton = false,
  dismissible = true,
  ...props
}: DialogContentProps) {
  return (
    <OverlayModal part="DialogContent" placement="center" dismissible={dismissible}>
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
        <FloatingSurface blur={false}>
          <View
            accessibilityViewIsModal
            className={cn("gap-4 p-6", className)}
            {...props}
          >
            {children}
          </View>
          {hideCloseButton ? null : <DialogCloseButton />}
        </FloatingSurface>
      </View>
    </OverlayModal>
  );
}

function DialogCloseButton() {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <DialogClose
      testID="dialog-close"
      accessibilityLabel="Close"
      hitSlop={8}
      className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-lg active:opacity-70"
    >
      <IconX size={largerText ? 26 : 16} color={tokens.color.muted[scheme]} />
    </DialogClose>
  );
}

type PartProps = ViewProps & { className?: string };
type TextPartProps = TextProps & { className?: string };

export function DialogHeader({ className, ...props }: PartProps) {
  return <View className={cn("gap-1.5 pr-10", className)} {...props} />;
}

// Text colours are styles (`textStyle`), so they follow the colour scheme in
// apps whose `text-foreground` does not. Recolour with `style`, not `className`.

/** Web `text-lg font-semibold`. */
export function DialogTitle({ className, style, ...props }: TextPartProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <Text
      accessibilityRole="header"
      className={cn(
        "font-instrument-sans-semibold",
        largerText ? "text-2xl" : "text-lg",
        className,
      )}
      style={[textStyle("foreground", scheme), style]}
      {...props}
    />
  );
}

/** Web `text-sm leading-relaxed`, in the web description colour (`palette.overlayMuted`). */
export function DialogDescription({ className, style, ...props }: TextPartProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <Text
      className={cn(
        "font-instrument-sans leading-relaxed",
        largerText ? "text-lg" : "text-sm",
        className,
      )}
      style={[textStyle("overlayMuted", scheme), style]}
      {...props}
    />
  );
}

/** Scrolling body for long content. Height is capped at `maxHeight` (default 60% of the window). */
export function DialogBody({
  maxHeight,
  style,
  ...props
}: ScrollViewProps & { maxHeight?: number }) {
  const { height } = useWindowDimensions();
  return (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      style={[{ maxHeight: maxHeight ?? height * 0.6 }, style]}
      {...props}
    />
  );
}

/**
 * Buttons in a row at the end, as the web footer from `sm` up (Cancel, then
 * Save). Give each `Button` `fullWidth={false}`; `AlertDialogAction` and
 * `AlertDialogCancel` already do. Wraps when the labels do not fit.
 */
export function DialogFooter({ className, ...props }: PartProps) {
  return (
    <View
      className={cn("flex-row flex-wrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

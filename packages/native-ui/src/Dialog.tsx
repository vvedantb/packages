import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconX } from "@tabler/icons-react-native";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { isCompactOverlay, textStyle, typeStyle } from "./controlStyles";
import { DialogLayoutContext, useDialogLayout, type DialogLayout } from "./dialogLayout";
import { palette } from "./palette";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";
import { NativeOnlyAnimatedView } from "./primitives/native-only-animated-view";
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
  /**
   * A bottom sheet in a compact window (639 wide or less, or 500 high or less),
   * as the web `viewportAware`. Default `true`. `false` keeps the centred panel
   * at every size.
   */
  viewportAware?: boolean;
};

/** Web `rounded-t-2xl` (16) on the compact sheet. */
const SHEET_RADIUS = tokens.radius.lg;

/** The centred panel: at most 480 wide. */
const PANEL = { width: "100%", maxWidth: 480, alignSelf: "center" } as const;
/** The compact sheet: its bottom corners sit below the screen edge. */
const SHEET = { marginBottom: -SHEET_RADIUS };

const CENTRED: DialogLayout = { compact: false, stacked: false };
const COMPACT: DialogLayout = { compact: true, stacked: false };
const STACKED: DialogLayout = { compact: true, stacked: true };

/**
 * Centred panel in an RN `Modal`: opaque surface (card radius 24, floating
 * shadow, no blur), at most 480 wide, padding 24 as on the web. Android back
 * closes it.
 *
 * In a compact window (the web `COMPACT_OVERLAY_QUERY`, from the window size)
 * it is the web phone bottom sheet: full width, top corners 16, a handle,
 * `pt-3 px-6`, the bottom safe-area inset (at least 24) below, and it slides
 * up unless Reduce Motion is on. Its bottom corners sit below the screen edge,
 * as `SheetContent`'s do. `DialogFooter` stacks its buttons there.
 */
export function DialogContent({
  children,
  className,
  hideCloseButton = false,
  dismissible = true,
  viewportAware = true,
  style,
  ...props
}: DialogContentProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = viewportAware && isCompactOverlay(width, height);

  // One tree for both layouts, so a window that crosses the compact size while
  // open (split view, a foldable) keeps the content and its state.
  return (
    <DialogLayoutContext.Provider value={compact ? COMPACT : CENTRED}>
      <OverlayModal
        part="DialogContent"
        placement={compact ? "bottom" : "center"}
        dismissible={dismissible}
      >
        <NativeOnlyAnimatedView
          entering={compact ? SlideInDown.duration(240) : undefined}
          style={compact ? SHEET : PANEL}
        >
          <FloatingSurface blur={false} radius={compact ? SHEET_RADIUS : tokens.radius.card}>
            <View
              accessibilityViewIsModal
              className={cn(compact ? "gap-4 px-6 pt-3" : "gap-4 p-6", className)}
              {...props}
              style={[
                compact ? { paddingBottom: Math.max(24, insets.bottom) + SHEET_RADIUS } : null,
                style,
              ]}
            >
              {compact ? <DialogHandle /> : null}
              {children}
            </View>
            {hideCloseButton ? null : <DialogCloseButton />}
          </FloatingSurface>
        </NativeOnlyAnimatedView>
      </OverlayModal>
    </DialogLayoutContext.Provider>
  );
}

/**
 * The web compact handle: an `h-1 w-12` pill in `surface-tertiary`, in a
 * 44-high row. It is not a drag target, on the web either.
 */
function DialogHandle() {
  const scheme = useScheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mb-1 min-h-11 items-center justify-center"
    >
      <View
        className="h-1 w-12 rounded-full"
        style={{ backgroundColor: palette.surfaceTertiary[scheme] }}
      />
    </View>
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
      style={[textStyle("foreground", scheme), typeStyle("semibold"), style]}
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
 *
 * In the compact sheet it is the web phone footer: the buttons stack, the last
 * child on top, each full width (whatever `fullWidth` says) and at least 44
 * high.
 */
export function DialogFooter({ className, ...props }: PartProps) {
  const { compact } = useDialogLayout();
  if (compact) {
    return (
      <DialogLayoutContext.Provider value={STACKED}>
        <View className={cn("flex-col-reverse gap-2 pt-2", className)} {...props} />
      </DialogLayoutContext.Provider>
    );
  }
  return (
    <View
      className={cn("flex-row flex-wrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

import { View, type ViewProps } from "react-native";
import { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { withAlpha } from "./palette";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";
import { DialogBody, DialogDescription, DialogTitle } from "./Dialog";
import { NativeOnlyAnimatedView } from "./primitives/native-only-animated-view";
import {
  OverlayClose,
  OverlayModal,
  OverlayRoot,
  OverlayTrigger,
  type OverlayPressableProps,
  type OverlayRootProps,
} from "./primitives/overlay";

const SHEET_RADIUS = tokens.radius.card;

export type SheetProps = OverlayRootProps;

/**
 * Bottom sheet in an RN `Modal`, with no `@gorhom/bottom-sheet`. Same open
 * state API as `Dialog`. Use `BottomSheetContainer` for drag-to-dismiss.
 */
export function Sheet(props: SheetProps) {
  return <OverlayRoot {...props} />;
}

export function SheetTrigger(props: OverlayPressableProps) {
  return <OverlayTrigger part="SheetTrigger" {...props} />;
}

export function SheetClose(props: OverlayPressableProps) {
  return <OverlayClose part="SheetClose" {...props} />;
}

export type SheetContentProps = ViewProps & {
  className?: string;
  /** Close on a backdrop tap. Default `true`. */
  dismissible?: boolean;
  /** Grab handle above the content. Default `true`. */
  showHandle?: boolean;
};

/**
 * Panel pinned to the bottom edge: opaque surface, top corners at the card
 * radius, safe-area bottom padding, slides in. Its bottom corners sit below the
 * screen edge, so only the top corners show.
 */
export function SheetContent({
  children,
  className,
  dismissible = true,
  showHandle = true,
  style,
  ...props
}: SheetContentProps) {
  const insets = useSafeAreaInsets();
  return (
    <OverlayModal part="SheetContent" placement="bottom" dismissible={dismissible}>
      <NativeOnlyAnimatedView
        entering={SlideInDown.duration(240)}
        style={{ marginBottom: -SHEET_RADIUS }}
      >
        <FloatingSurface blur={false} radius={SHEET_RADIUS}>
          <View
            accessibilityViewIsModal
            className={cn("gap-4 px-5 pt-3", className)}
            {...props}
            style={[{ paddingBottom: insets.bottom + 20 + SHEET_RADIUS }, style]}
          >
            {showHandle ? <SheetHandle /> : null}
            {children}
          </View>
        </FloatingSurface>
      </NativeOnlyAnimatedView>
    </OverlayModal>
  );
}

export function SheetHandle({ className, style, ...props }: ViewProps & { className?: string }) {
  const scheme = useScheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("h-1.5 w-10 self-center rounded-full", className)}
      style={[{ backgroundColor: withAlpha(tokens.color.muted[scheme], 0.4) }, style]}
      {...props}
    />
  );
}

export function SheetHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("gap-1.5", className)} {...props} />;
}

export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetBody = DialogBody;
/** Buttons stack full width, the last child on top: the web footer on a phone. */
export function SheetFooter({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("flex-col-reverse gap-2", className)} {...props} />;
}

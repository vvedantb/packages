/**
 * Type shims for the React Native peers, used only by `pnpm typecheck` in this
 * repository (`tsconfig.typecheck.json`). The peers are not installed here (no
 * React Native toolchain in the workspace), so `tsc` checks this package's own
 * wiring against these declarations: imports, prop names between its modules,
 * hooks and state. They cover only what `src/` uses and are looser than the
 * real types. The consuming Expo app type-checks against the real packages.
 *
 * Not published (`files` is `src` and `LICENSE`).
 */

declare function setTimeout(callback: () => void, ms?: number): number;
declare function clearTimeout(handle: number | undefined): void;
// Metro's `require`, used for the optional peers (`src/blur.ts`, `src/haptics.ts`,
// `src/gradient.ts`).
declare function require(id: string): unknown;

declare module "react-native" {
  import type * as React from "react";

  export type PlatformOSType = "ios" | "android" | "web" | "windows" | "macos";
  export const Platform: {
    OS: PlatformOSType;
    select<T>(
      specifics: Partial<Record<PlatformOSType | "native" | "default", T>>,
    ): T | undefined;
  };

  export type ColorValue = string;
  export type DimensionValue = number | `${number}%` | "auto";
  type FlexAlign = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  export interface ViewStyle {
    width?: DimensionValue;
    height?: DimensionValue;
    minWidth?: DimensionValue;
    maxWidth?: DimensionValue;
    minHeight?: DimensionValue;
    maxHeight?: DimensionValue;
    position?: "absolute" | "relative" | "static";
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    justifyContent?:
      | "flex-start"
      | "flex-end"
      | "center"
      | "space-between"
      | "space-around"
      | "space-evenly";
    alignItems?: FlexAlign;
    alignSelf?: "auto" | FlexAlign;
    opacity?: number;
    [key: string]: unknown;
  }
  export interface TextStyle extends ViewStyle {}
  export interface ImageStyle extends ViewStyle {}
  export type StyleProp<T> =
    | T
    | null
    | undefined
    | false
    | ReadonlyArray<StyleProp<T>>;

  export type Role = string;
  export type AccessibilityRole = string;
  export interface AccessibilityState {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
    busy?: boolean;
    expanded?: boolean;
  }
  export interface AccessibilityValue {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  }
  export interface Insets {
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
  }
  export interface GestureResponderEvent {
    nativeEvent: { pageX: number; pageY: number; locationX: number; locationY: number };
  }
  export interface LayoutChangeEvent {
    nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
  }

  interface AccessibilityProps {
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: AccessibilityState;
    accessibilityValue?: AccessibilityValue;
    accessibilityElementsHidden?: boolean;
    accessibilityViewIsModal?: boolean;
    accessibilityLiveRegion?: "none" | "polite" | "assertive";
    importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
    role?: Role;
    "aria-level"?: number | string;
    "aria-hidden"?: boolean;
  }

  export interface ViewProps extends AccessibilityProps {
    children?: React.ReactNode;
    className?: string;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    nativeID?: string;
    pointerEvents?: "box-none" | "none" | "box-only" | "auto";
    hitSlop?: number | Insets | null;
    onLayout?: (event: LayoutChangeEvent) => void;
    onAccessibilityEscape?: () => void;
    collapsable?: boolean;
  }
  export class View extends React.Component<ViewProps> {}

  export interface TextProps extends AccessibilityProps {
    children?: React.ReactNode;
    className?: string;
    style?: StyleProp<TextStyle>;
    testID?: string;
    nativeID?: string;
    numberOfLines?: number;
    ellipsizeMode?: "head" | "middle" | "tail" | "clip";
    selectable?: boolean;
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
    onPress?: (event: GestureResponderEvent) => void;
  }
  export class Text extends React.Component<TextProps> {}

  export interface PressableStateCallbackType {
    pressed: boolean;
    hovered?: boolean;
  }
  export interface PressableProps extends Omit<ViewProps, "style" | "children"> {
    children?:
      | React.ReactNode
      | ((state: PressableStateCallbackType) => React.ReactNode);
    style?:
      | StyleProp<ViewStyle>
      | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    onPress?: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;
    disabled?: boolean | null;
    android_ripple?: { color?: ColorValue; borderless?: boolean };
  }
  export const Pressable: React.ForwardRefExoticComponent<
    PressableProps & React.RefAttributes<View>
  >;

  export interface TouchableOpacityProps extends PressableProps {
    activeOpacity?: number;
  }
  export class TouchableOpacity extends React.Component<TouchableOpacityProps> {}

  export interface TextInputProps extends Omit<ViewProps, "style" | "children"> {
    style?: StyleProp<TextStyle>;
    value?: string;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    placeholder?: string;
    placeholderTextColor?: ColorValue;
    multiline?: boolean;
    numberOfLines?: number;
    editable?: boolean;
    textAlignVertical?: "auto" | "top" | "bottom" | "center";
    autoFocus?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    autoCorrect?: boolean;
    keyboardType?: string;
    returnKeyType?: string;
    secureTextEntry?: boolean;
    maxLength?: number;
    scrollEnabled?: boolean;
  }
  export class TextInput extends React.Component<TextInputProps> {
    focus(): void;
    blur(): void;
    clear(): void;
  }

  export interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: StyleProp<ViewStyle>;
    contentContainerClassName?: string;
    horizontal?: boolean;
    showsVerticalScrollIndicator?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
    bounces?: boolean;
    alwaysBounceVertical?: boolean;
  }
  export class ScrollView extends React.Component<ScrollViewProps> {}

  export interface ModalProps {
    children?: React.ReactNode;
    visible?: boolean;
    transparent?: boolean;
    animationType?: "none" | "slide" | "fade";
    presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen";
    statusBarTranslucent?: boolean;
    onRequestClose?: () => void;
    onShow?: () => void;
    onDismiss?: () => void;
    testID?: string;
  }
  export class Modal extends React.Component<ModalProps> {}

  export interface ImageURISource {
    uri?: string;
    width?: number;
    height?: number;
  }
  export type ImageSourcePropType = number | ImageURISource | ImageURISource[];
  export interface ImageLoadEvent {
    nativeEvent: { source: { width: number; height: number; uri: string } };
  }
  export interface ImageErrorEvent {
    nativeEvent: { error: unknown };
  }
  export interface ImageProps extends AccessibilityProps {
    source: ImageSourcePropType;
    className?: string;
    style?: StyleProp<ImageStyle>;
    testID?: string;
    resizeMode?: "cover" | "contain" | "stretch" | "center";
    onLoad?: (event: ImageLoadEvent) => void;
    onError?: (event: ImageErrorEvent) => void;
  }
  export class Image extends React.Component<ImageProps> {}

  export interface ActivityIndicatorProps extends ViewProps {
    size?: "small" | "large" | number;
    color?: ColorValue;
    animating?: boolean;
  }
  export class ActivityIndicator extends React.Component<ActivityIndicatorProps> {}

  export interface KeyboardAvoidingViewProps extends ViewProps {
    behavior?: "height" | "position" | "padding";
    keyboardVerticalOffset?: number;
    enabled?: boolean;
  }
  export class KeyboardAvoidingView extends React.Component<KeyboardAvoidingViewProps> {}

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
    hairlineWidth: number;
    absoluteFill: ViewStyle;
    absoluteFillObject: ViewStyle;
  };

  export const AccessibilityInfo: {
    isReduceTransparencyEnabled?: () => Promise<boolean>;
    addEventListener(
      eventName: string,
      handler: (enabled: boolean) => void,
    ): { remove(): void };
    announceForAccessibility(announcement: string): void;
  };

  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };
}

declare module "nativewind" {
  export function useColorScheme(): {
    colorScheme: "light" | "dark" | undefined;
    setColorScheme(scheme: "light" | "dark" | "system"): void;
    toggleColorScheme(): void;
  };
}

declare module "react-native-safe-area-context" {
  export interface EdgeInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }
  export function useSafeAreaInsets(): EdgeInsets;
}

declare module "react-native-reanimated" {
  import type * as React from "react";
  import type { ViewProps, ViewStyle } from "react-native";

  export interface LayoutAnimationBuilder {
    duration(ms: number): LayoutAnimationBuilder;
    delay(ms: number): LayoutAnimationBuilder;
    springify(): LayoutAnimationBuilder;
  }
  export const FadeIn: LayoutAnimationBuilder;
  export const FadeOut: LayoutAnimationBuilder;
  export const FadeInUp: LayoutAnimationBuilder;
  export const FadeOutUp: LayoutAnimationBuilder;
  export const SlideInDown: LayoutAnimationBuilder;
  export const SlideOutDown: LayoutAnimationBuilder;
  export const LinearTransition: LayoutAnimationBuilder;

  export type AnimatedProps<P> = P & {
    entering?: LayoutAnimationBuilder;
    exiting?: LayoutAnimationBuilder;
    layout?: LayoutAnimationBuilder;
  };

  export interface SharedValue<T> {
    value: T;
  }
  export type EasingFunction = (t: number) => number;
  export const Easing: {
    bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
    linear: EasingFunction;
  };
  export function useSharedValue<T>(initial: T): SharedValue<T>;
  export function useAnimatedStyle<T extends ViewStyle>(
    updater: () => T,
    deps?: unknown[],
  ): T;
  export function withTiming<T extends number>(
    toValue: T,
    config?: { duration?: number; easing?: EasingFunction },
  ): T;
  export function withRepeat<T>(
    animation: T,
    numberOfReps?: number,
    reverse?: boolean,
  ): T;
  export function cancelAnimation<T>(sharedValue: SharedValue<T>): void;
  export function useReducedMotion(): boolean;

  declare const Animated: {
    View: React.ComponentType<AnimatedProps<ViewProps>>;
  };
  export default Animated;
}

declare module "react-native-screens" {
  import type * as React from "react";
  export const FullWindowOverlay: React.ComponentType<{ children?: React.ReactNode }>;
}

declare module "react-native-svg" {
  import type * as React from "react";
  import type { StyleProp, ViewProps, ViewStyle } from "react-native";

  interface PaintProps {
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    strokeLinecap?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    opacity?: number;
  }
  export interface SvgProps extends Omit<ViewProps, "style">, PaintProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
    color?: string;
    style?: StyleProp<ViewStyle>;
  }
  export const G: React.ComponentType<PaintProps & { children?: React.ReactNode }>;
  export const Path: React.ComponentType<PaintProps & { d: string }>;
  export const Rect: React.ComponentType<
    PaintProps & { x?: number; y?: number; width: number; height: number; rx?: number }
  >;
  declare const Svg: React.ComponentType<SvgProps>;
  export default Svg;
}

declare module "expo-blur" {
  import type * as React from "react";
  import type { View, ViewProps } from "react-native";

  export type BlurMethod = "none" | "dimezisBlurView" | "dimezisBlurViewSdk31Plus";
  export interface BlurViewProps extends ViewProps {
    tint?: string;
    intensity?: number;
    blurReductionFactor?: number;
    /** @deprecated Use `blurMethod`. */
    experimentalBlurMethod?: BlurMethod;
    blurMethod?: BlurMethod;
    blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
  }
  export const BlurView: React.ComponentType<BlurViewProps>;
  export const BlurTargetView: React.ComponentType<
    ViewProps & { ref?: React.Ref<React.ComponentRef<typeof View>> }
  >;
}

declare module "expo-linear-gradient" {
  import type * as React from "react";
  import type { ViewProps } from "react-native";
  export const LinearGradient: React.ComponentType<
    ViewProps & {
      colors: readonly string[];
      start?: { x: number; y: number };
      end?: { x: number; y: number };
    }
  >;
}

declare module "expo-haptics" {
  export function selectionAsync(): Promise<void>;
}

declare module "expo-router" {
  import type * as React from "react";

  interface TabOptions {
    title?: string;
    tabBarLabel?: string | ((props: { focused: boolean; color: string }) => React.ReactNode);
    tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
    tabBarButtonTestID?: string;
    tabBarAccessibilityLabel?: string;
  }
  interface BottomTabBarProps {
    state: {
      index: number;
      routes: Array<{ key: string; name: string; params?: object }>;
    };
    descriptors: Record<string, { options: TabOptions }>;
    navigation: {
      emit(event: {
        type: string;
        target?: string;
        canPreventDefault?: boolean;
      }): { defaultPrevented: boolean };
      navigate(name: string, params?: object): void;
    };
  }
  export const Tabs: React.ComponentType<{
    tabBar?: (props: BottomTabBarProps) => React.ReactNode;
    children?: React.ReactNode;
  }>;
}

declare module "@gorhom/bottom-sheet" {
  import type * as React from "react";
  import type { ViewProps } from "react-native";
  import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";

  export const BottomSheetBackdrop: React.ComponentType<
    BottomSheetDefaultBackdropProps & {
      appearsOnIndex?: number;
      disappearsOnIndex?: number;
      opacity?: number;
    }
  >;
  export class BottomSheetModal extends React.Component<{
    children?: React.ReactNode;
    backdropComponent?: (props: BottomSheetDefaultBackdropProps) => React.ReactNode;
    backgroundComponent?: React.ComponentType<{
      style?: ViewProps["style"];
      pointerEvents?: ViewProps["pointerEvents"];
    }>;
    handleIndicatorStyle?: ViewProps["style"];
    onDismiss?: () => void;
    enableContentPanningGesture?: boolean;
    enableHandlePanningGesture?: boolean;
    keyboardBehavior?: "extend" | "fillParent" | "interactive";
  }> {
    present(): void;
    dismiss(): void;
  }
  export const BottomSheetView: React.ComponentType<ViewProps>;
}

declare module "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types" {
  import type { ViewProps } from "react-native";
  export interface BottomSheetDefaultBackdropProps {
    animatedIndex: unknown;
    animatedPosition: unknown;
    style?: ViewProps["style"];
  }
}

declare module "@react-native-community/datetimepicker" {
  import type * as React from "react";
  export interface DateTimePickerEvent {
    type: "set" | "dismissed" | "neutralButtonPressed";
    nativeEvent: { timestamp?: number };
  }
  declare const DateTimePicker: React.ComponentType<{
    value: Date;
    mode?: "date" | "time" | "datetime";
    is24Hour?: boolean;
    maximumDate?: Date;
    display?: "default" | "spinner" | "compact" | "inline";
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  }>;
  export default DateTimePicker;
}

declare module "dayjs" {
  interface Dayjs {
    format(template?: string): string;
  }
  declare function dayjs(date?: Date | string | number): Dayjs;
  export default dayjs;
}

declare module "@expo/vector-icons" {
  import type * as React from "react";
  export const MaterialIcons: React.ComponentType<{
    name: string;
    size?: number;
    color?: string;
  }> & { glyphMap: Record<string, number> };
}

declare module "@tabler/icons-react-native" {
  import type * as React from "react";
  export interface IconProps {
    size?: number | string;
    color?: string;
    stroke?: number | string;
    strokeWidth?: number | string;
  }
  type Icon = React.ComponentType<IconProps>;
  export const IconAlertTriangle: Icon;
  export const IconCheck: Icon;
  export const IconCircleCheck: Icon;
  export const IconCircleX: Icon;
  export const IconInbox: Icon;
  export const IconInfoCircle: Icon;
  export const IconMinus: Icon;
  export const IconSearch: Icon;
  export const IconX: Icon;
}

declare module "lucide-react-native" {
  import type * as React from "react";
  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<unknown>
  >;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronDownIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
}

declare module "@rn-primitives/slot" {
  import type * as React from "react";
  import type {
    PressableProps,
    Text as RNText,
    TextProps,
    View,
    ViewProps,
  } from "react-native";
  export const Pressable: React.ForwardRefExoticComponent<
    PressableProps & React.RefAttributes<View>
  >;
  export const Text: React.ForwardRefExoticComponent<
    TextProps & React.RefAttributes<RNText>
  >;
  export const View: React.ForwardRefExoticComponent<
    ViewProps & React.RefAttributes<View>
  >;
}

declare module "@rn-primitives/switch" {
  import type * as React from "react";
  import type { PressableProps, View, ViewProps } from "react-native";
  export const Root: React.ForwardRefExoticComponent<
    Omit<PressableProps, "onPress"> & {
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
      className?: string;
    } & React.RefAttributes<View>
  >;
  export const Thumb: React.ForwardRefExoticComponent<
    ViewProps & React.RefAttributes<View>
  >;
}

declare module "@rn-primitives/select" {
  import type * as React from "react";
  import type {
    PressableProps,
    Text as RNText,
    TextProps,
    View,
    ViewProps,
  } from "react-native";

  export type Option = { value: string; label: string } | undefined;
  type Ref<P, T = View> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>;

  export const Root: Ref<
    ViewProps & {
      value?: Option;
      defaultValue?: Option;
      onValueChange?: (option: Option) => void;
      disabled?: boolean;
    }
  >;
  export const Group: Ref<ViewProps>;
  export const Value: Ref<TextProps & { placeholder: string }, RNText>;
  export const Trigger: Ref<PressableProps & { className?: string }>;
  export const Portal: React.ComponentType<{
    hostName?: string;
    children?: React.ReactNode;
  }>;
  export const Overlay: Ref<PressableProps>;
  export const Content: Ref<
    ViewProps & { position?: "popper" | "item-aligned" }
  >;
  export const Viewport: Ref<ViewProps>;
  export const Label: Ref<TextProps, RNText>;
  export const Item: Ref<
    Omit<PressableProps, "children"> & {
      value: string;
      label: string;
      className?: string;
      children?: React.ReactNode;
    }
  >;
  export const ItemIndicator: Ref<ViewProps>;
  export const ItemText: Ref<TextProps, RNText>;
  export const Separator: Ref<ViewProps>;
  export const ScrollUpButton: Ref<ViewProps>;
  export const ScrollDownButton: Ref<ViewProps>;
}

declare module "clsx" {
  export type ClassValue =
    | ClassValue[]
    | Record<string, unknown>
    | string
    | number
    | bigint
    | null
    | boolean
    | undefined;
  export function clsx(...inputs: ClassValue[]): string;
}

declare module "tailwind-merge" {
  export function twMerge(...classLists: Array<string | null | undefined | false>): string;
}

declare module "class-variance-authority" {
  type ClassValue = string | null | undefined | false;
  type ConfigSchema = Record<string, Record<string, ClassValue>>;
  type ConfigVariants<T extends ConfigSchema> = {
    [V in keyof T]?: keyof T[V] | null | undefined;
  };
  export function cva<T extends ConfigSchema>(
    base?: ClassValue,
    config?: { variants?: T; defaultVariants?: ConfigVariants<T> },
  ): (props?: ConfigVariants<T> & { class?: ClassValue; className?: ClassValue }) => string;
  export type VariantProps<Component extends (...args: never[]) => unknown> = Omit<
    Exclude<Parameters<Component>[0], undefined>,
    "class" | "className"
  >;
}

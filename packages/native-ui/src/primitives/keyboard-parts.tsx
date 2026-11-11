import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import {
  KeyboardAvoidingView as NativeKeyboardAvoidingView,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

/**
 * The `react-native-keyboard-controller` build of the keyboard parts, from
 * `@vvedantb/native-ui/keyboard-controller`. They follow the keyboard frame
 * by frame on the UI thread, and a drag on the chat transcript moves the
 * keyboard with the finger. Without them (the peer is optional) the kit keeps
 * React Native's `KeyboardAvoidingView`. A context, so only that entry imports
 * the peer and an app without it bundles as before.
 */
export type KeyboardParts = {
  /** A `KeyboardAvoidingView` that pads frame by frame with the keyboard. */
  AvoidingView: ComponentType<KeyboardAvoidingViewProps>;
  /**
   * Moves with the keyboard (`translateY`), less `bottomOffset` while it is
   * open: the bottom inset the content pads, which the keyboard covers.
   */
  StickyView: ComponentType<ViewProps & { bottomOffset: number }>;
  /**
   * The chat transcript's scroll view (a `FlatList` `renderScrollComponent`).
   * Its content gains the keyboard height less `bottomOffset` at the end, and
   * moves up with the keyboard, so the newest message stays in view.
   * `onInsetChange` gets that extra space, which `onScroll` does not report.
   */
  ChatScrollView: ComponentType<
    ScrollViewProps & { bottomOffset: number; onInsetChange: (bottom: number) => void }
  >;
  /**
   * Around the transcript: a drag that reaches `offset` above the keyboard
   * (the composer's top) moves the keyboard with the finger.
   */
  GestureArea: ComponentType<{ offset: number; style?: StyleProp<ViewStyle>; children: ReactNode }>;
  /**
   * Whether a drag on the transcript moves the keyboard (iOS, Android 11+).
   * False on Android 10 and below: there a drag lowers it at once.
   */
  interactive: boolean;
};

export const KeyboardPartsContext = createContext<KeyboardParts | null>(null);

/**
 * True inside a part that already keeps its content clear of the keyboard
 * (`ConversationDock` with the keyboard-controller parts, `ChatThread`): the
 * chat parts in it add no lift of their own, so nothing lifts twice.
 */
export const KeyboardLiftContext = createContext(false);

/**
 * The keyboard-controller parts for a chat part that follows the keyboard
 * itself, or `null`: without `KeyboardControllerProvider`, or inside a part
 * that already lifts it (`KeyboardLiftContext`).
 */
export function useKeyboardParts(): KeyboardParts | null {
  const parts = useContext(KeyboardPartsContext);
  const lifted = useContext(KeyboardLiftContext);
  return lifted ? null : parts;
}

/**
 * The `nativeID` of the `PromptInput` field. On iOS the transcript's gesture
 * area keeps its `offset` (the composer above the keyboard) only for the
 * focused field with this id.
 */
export const COMPOSER_INPUT_ID = "native-ui-composer";

export type KeyboardAvoidingViewProps = {
  /** Default `padding`, on iOS and Android: Android `height` does nothing edge-to-edge. */
  behavior?: "padding" | "height" | "position";
  /** Height of anything above the view's top, such as a navigation header. Default 0. */
  keyboardVerticalOffset?: number;
  enabled?: boolean;
  /** A style, not a class: the keyboard-controller view takes no NativeWind `className`. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

/**
 * React Native's `KeyboardAvoidingView`, or with
 * `@vvedantb/native-ui/keyboard-controller` the keyboard-controller one, which
 * pads frame by frame with the keyboard instead of in one step at its end.
 */
export function KeyboardAvoidingView({ behavior = "padding", ...props }: KeyboardAvoidingViewProps) {
  const parts = useContext(KeyboardPartsContext);
  const Avoiding = parts?.AvoidingView ?? NativeKeyboardAvoidingView;
  return <Avoiding behavior={behavior} {...props} />;
}

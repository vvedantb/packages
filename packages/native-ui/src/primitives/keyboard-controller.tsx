import type { ComponentProps, ReactNode } from "react";
import { Platform } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardChatScrollView,
  KeyboardGestureArea,
  KeyboardStickyView,
  useKeyboardHandler,
} from "react-native-keyboard-controller";
import { runOnJS } from "react-native-reanimated";
import { COMPOSER_INPUT_ID, KeyboardPartsContext, type KeyboardParts } from "./keyboard-parts";

// The keyboard parts on `react-native-keyboard-controller`: the keyboard's
// real position, frame by frame, on the UI thread. No timing of our own, so
// the composer can neither lag nor lead the keyboard; with Reduce Motion the
// system shortens the keyboard's own motion and the parts follow it.

/**
 * A drag moves the keyboard on iOS (`keyboardDismissMode="interactive"`) and
 * on Android 11+ (API 30, `WindowInsetsAnimation`). Android 10 and below has
 * no interactive keyboard: `KeyboardGestureArea` then only renders its
 * children, and the transcript keeps `on-drag`.
 */
const INTERACTIVE = Platform.OS === "ios" || (Platform.OS === "android" && Number(Platform.Version) >= 30);

function AvoidingView(props: ComponentProps<KeyboardParts["AvoidingView"]>) {
  return <KeyboardAvoidingView {...props} />;
}

function StickyView({ bottomOffset, ...props }: ComponentProps<KeyboardParts["StickyView"]>) {
  return <KeyboardStickyView {...props} offset={{ opened: bottomOffset }} />;
}

/**
 * `always`: the content rises with the keyboard wherever the reader is, so
 * what sat on the composer stays there (the newest message, at the end).
 * Inverted, the keyboard's space is the content's top inset, the visual
 * bottom: iOS scrolls below offset 0 into it, so the end moves there; Android
 * moves the content down by it instead, so offset 0 stays the end. While the
 * keyboard moves, the list scrolls with it, through offsets that are not the
 * end on either platform.
 */
function ChatScrollView({
  bottomOffset,
  inverted = false,
  onInsetChange,
  onKeyboardMove,
  ...props
}: ComponentProps<KeyboardParts["ChatScrollView"]>) {
  useKeyboardHandler(
    {
      onStart: () => {
        "worklet";
        runOnJS(onKeyboardMove)(true);
      },
      onEnd: () => {
        "worklet";
        runOnJS(onKeyboardMove)(false);
      },
    },
    [onKeyboardMove],
  );
  return (
    <KeyboardChatScrollView
      {...props}
      inverted={inverted}
      offset={bottomOffset}
      keyboardLiftBehavior="always"
      onContentInsetChange={(insets) =>
        onInsetChange(inverted ? (Platform.OS === "ios" ? insets.top : 0) : insets.bottom)
      }
    />
  );
}

/**
 * `ios`: the keyboard follows once the finger reaches the composer, then 1:1,
 * and a release carries the finger's velocity, on both platforms.
 */
function GestureArea({ offset, style, children }: ComponentProps<KeyboardParts["GestureArea"]>) {
  return (
    <KeyboardGestureArea interpolator="ios" offset={offset} textInputNativeID={COMPOSER_INPUT_ID} style={style}>
      {children}
    </KeyboardGestureArea>
  );
}

const PARTS: KeyboardParts = {
  AvoidingView,
  StickyView,
  ChatScrollView,
  GestureArea,
  interactive: INTERACTIVE,
};

/**
 * Runs the kit's keyboard handling on `react-native-keyboard-controller`:
 * the chat composer (`ConversationDock`), its scroll button and the
 * transcript (`ConversationList`) follow the keyboard frame by frame, a drag
 * on the transcript moves the keyboard with the finger, and `PromptInput`,
 * `ChatThread`, the overlays and `KeyboardAvoidingView` pad frame by frame.
 * Put it inside the app's `KeyboardProvider`.
 */
export function KeyboardControllerProvider({ children }: { children: ReactNode }) {
  return <KeyboardPartsContext.Provider value={PARTS}>{children}</KeyboardPartsContext.Provider>;
}

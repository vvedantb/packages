import { Pressable, Text, View } from "react-native";
import { IconFile } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop } from "../controlStyles";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize } from "./chat-text";

/** A `text-xs` line with the web `py-0.5` and border: 22 high. The slop brings it to 44. */
const CHIP_HEIGHT = 22;

function FileChipLabel({ name }: { name: string }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("caption", largerText);
  return (
    <View
      className="max-w-full flex-row items-center gap-1.5 self-start border px-1.5 py-0.5"
      style={{
        borderRadius: tokens.radius.md,
        borderColor: tokens.color.border[scheme],
        backgroundColor: palette.default[scheme],
      }}
    >
      <IconFile size={largerText ? 16 : 12} color={tokens.color.foreground[scheme]} />
      <Text
        numberOfLines={1}
        ellipsizeMode="middle"
        className={cn(size, "shrink")}
        style={[sizeStyle(size), textStyle("foreground", scheme), { fontFamily: MONO_FONT }]}
      >
        {name}
      </Text>
    </View>
  );
}

export type FileChipProps = {
  name: string;
  path?: string;
  onOpenFile?: (path: string) => void;
};

/**
 * A file name in a trace line or step body: the web `rounded-md border
 * bg-secondary px-1.5 py-0.5 font-mono text-xs` chip. It is a button that
 * opens the file when both `path` and `onOpenFile` are given, and plain text
 * otherwise. Long names are cut in the middle, so the extension shows.
 */
export function FileChip({ name, path, onOpenFile }: FileChipProps) {
  if (!path || !onOpenFile) return <FileChipLabel name={name} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={path}
      hitSlop={touchSlop(MIN_TOUCH_TARGET, CHIP_HEIGHT)}
      onPress={() => onOpenFile(path)}
      className="min-w-0 max-w-full active:opacity-70"
    >
      <FileChipLabel name={name} />
    </Pressable>
  );
}

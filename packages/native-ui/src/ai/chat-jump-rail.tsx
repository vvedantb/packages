import { ScrollView } from "react-native";
import { Chip } from "../Chip";
import { cn } from "../cn";

export type ChatJumpRailItem = { id: string; label: string };

export type ChatJumpRailProps = {
  /** The messages to jump between, such as the user messages of a long thread. */
  items: ChatJumpRailItem[];
  /** Called with the `id` of the pressed item. */
  onJump: (id: string) => void;
  className?: string;
  testID?: string;
};

/**
 * A rail to jump between messages (web `chat-jump-rail`): a horizontal row of
 * chips, one per item. Each chip is a 48 high button named by its label. Draws
 * nothing for an empty list.
 */
export function ChatJumpRail({ items, onJump, className, testID }: ChatJumpRailProps) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="toolbar"
      className={cn("grow-0", className)}
      contentContainerClassName="gap-2 px-3 py-2"
    >
      {items.map((item) => (
        <Chip key={item.id} label={item.label} selected={false} onPress={() => onJump(item.id)} testID={`jump-${item.id}`} />
      ))}
    </ScrollView>
  );
}

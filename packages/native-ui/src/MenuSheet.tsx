import type { ComponentType, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { IconChevronLeft, IconChevronRight, type IconProps } from "@tabler/icons-react-native";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "./Sheet";
import { SheetRow } from "./SheetRow";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type MenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Set on a submenu page: the header gets a 44 back button to the root page. */
  onBack?: () => void;
  children: ReactNode;
  testID?: string;
};

/**
 * A dropdown or context menu as one bottom sheet: a title, then `SheetRow`s
 * with no gap between them, `MenuDivider`s between groups. With submenus, the
 * root page lists the items, a `SubmenuRow` swaps the sheet to its page, and
 * that page's header has a back button (`onBack`) to the root.
 */
export function MenuSheet({ open, onOpenChange, title, onBack, children, testID }: MenuSheetProps) {
  const muted = tokens.color.muted[useScheme()];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-3 px-3" testID={testID}>
        <SheetHeader className="min-h-11 flex-row items-center gap-1 px-2">
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              className="-ml-2 h-11 w-11 items-center justify-center rounded-lg active:opacity-70"
            >
              <IconChevronLeft size={20} color={muted} />
            </Pressable>
          ) : null}
          <SheetTitle numberOfLines={1} className="min-w-0 flex-1">
            {title}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export type SubmenuRowProps = {
  icon?: ComponentType<IconProps>;
  /** At the start in place of `icon`, such as a coloured status mark. */
  leading?: ReactNode;
  title: string;
  detail?: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

/** A root-page item that opens a submenu: a `SheetRow` with a chevron at the end. */
export function SubmenuRow({ icon, leading, title, detail, disabled, onPress, testID }: SubmenuRowProps) {
  const muted = tokens.color.muted[useScheme()];
  return (
    <View className="flex-row items-center">
      <View className="min-w-0 flex-1">
        <SheetRow icon={icon} leading={leading} title={title} detail={detail} disabled={disabled} onPress={onPress} testID={testID} />
      </View>
      <View className="absolute right-4" style={{ pointerEvents: "none", opacity: disabled ? 0.5 : 1 }}>
        <IconChevronRight size={16} color={muted} />
      </View>
    </View>
  );
}

/** The web `DropdownMenuSeparator` between groups of menu rows. */
export function MenuDivider() {
  return <View className="mx-4 my-1 h-px" style={{ backgroundColor: tokens.color.border[useScheme()] }} />;
}

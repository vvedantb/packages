import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { IconPaperclip, IconPlus } from "@tabler/icons-react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

export type InputActionsMenuContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuContent
>;

export type InputActionsProps = {
  showFileUpload?: boolean;
  onAttachFile?: () => void;
  compact?: boolean;
  /** Extra menu rows after the attach row, such as a skill picker and a connection item. Include your own separators. */
  extra?: ReactNode;
  attachLabel?: ReactNode;
  /**
   * Props merged onto the menu content. Defaults: `align="start"`, `side="top"`,
   * `collisionPadding={12}`. Your keys win. A `className` replaces the default size classes.
   */
  menuContentProps?: InputActionsMenuContentProps;
};

export function InputActions({
  showFileUpload = false,
  onAttachFile,
  compact = false,
  extra,
  attachLabel = "Attach file",
  menuContentProps,
}: InputActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`relative shrink-0 rounded-full max-sm:hit-target ${
            compact
              ? "size-8 bg-surface-tertiary text-foreground hover:bg-surface-tertiary/80 hover:text-foreground"
              : ""
          }`}
          startContent={<IconPlus width={18} />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Tool options"
        align="start"
        side="top"
        collisionPadding={12}
        className="max-h-[min(24rem,calc(100dvh-6rem))] max-w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto"
        {...menuContentProps}
      >
        {showFileUpload ? (
          <>
            <DropdownMenuItem
              startContent={<IconPaperclip size={18} />}
              onClick={onAttachFile}
            >
              {attachLabel}
            </DropdownMenuItem>
            {extra ? <DropdownMenuSeparator /> : null}
          </>
        ) : null}
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

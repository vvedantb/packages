import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@vv/ui";
import { IconPlus, IconPaperclip } from "@tabler/icons-react";
import { SkillPicker } from "./SkillPicker";
import { ConnectionMenuItem } from "./ConnectionMenuItem";

interface InputActionsProps {
  showFileUpload?: boolean;
  onAttachFile?: () => void;
  compact?: boolean;
}

export function InputActions({
  showFileUpload = false,
  onAttachFile,
  compact = false,
}: InputActionsProps) {
  return (
    <Dropdown>
      <DropdownTrigger>
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
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Tool options"
        side="top"
        collisionPadding={12}
        className="max-h-[min(24rem,calc(100dvh-6rem))] max-w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto"
      >
        {showFileUpload ? (
          <>
            <DropdownItem
              key="attach"
              startContent={<IconPaperclip size={18} />}
              onClick={onAttachFile}
            >
              Attach file
            </DropdownItem>
            <DropdownSeparator />
          </>
        ) : null}
        <SkillPicker />
        <DropdownSeparator />
        <ConnectionMenuItem />
      </DropdownMenu>
    </Dropdown>
  );
}

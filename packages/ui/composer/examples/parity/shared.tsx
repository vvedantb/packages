import { IconBook2 } from "@tabler/icons-react";
import { DropdownMenuItem } from "../../../src/ui/dropdown-menu";

/** Class strings the app passes at its call sites. Both columns use the same ones. */
export const APP_STYLES = {
  composer: "mx-auto flex w-full max-w-2xl flex-col",
  border: "border-transparent",
  borderPrivacy: "border-primary/40",
  submitBg: "bg-primary hover:bg-primary/90",
  submitText: "text-primary-foreground",
  banner: {
    privacy: {
      wrapper: "flex items-center gap-2 rounded-xl bg-surface-secondary px-3 py-2",
      icon: "text-foreground",
      title: "text-foreground",
      detail: "text-muted-foreground",
    },
  },
};

/** Stand-in for the app skill picker row. */
export function SkillPickerMock() {
  return (
    <DropdownMenuItem startContent={<IconBook2 size={18} />}>
      Skills
    </DropdownMenuItem>
  );
}

/** Stand-in for the app brand mark. */
export function BrandMarkMock() {
  return (
    <span className="relative flex size-[18px] items-center justify-center">
      <span className="size-[18px] rounded-md bg-foreground" />
      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-success" />
    </span>
  );
}

export const CONNECTION_TITLE = "Chat uses your connected tools. Turn it off in Settings.";

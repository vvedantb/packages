import type { ReactNode } from "react";
import {
  IconBook2,
  IconFile,
  IconLock,
  IconPaperclip,
  IconPlus,
} from "@tabler/icons-react";
import type { SlashIconKey } from "./composerSlashItems";

function previewOneLine(text: string, maxLength = 72): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1)}…`;
}

function SlashIcon({ icon }: { icon: SlashIconKey }): ReactNode {
  const className = "size-4 shrink-0 text-muted-foreground";
  switch (icon) {
    case "plus":
      return <IconPlus className={className} />;
    case "paperclip":
      return <IconPaperclip className={className} />;
    case "lock":
      return <IconLock className={className} />;
    case "book":
      return <IconBook2 className={className} />;
    case "file":
      return <IconFile className={className} />;
  }
}

export function ComposerSlashRow({
  label,
  description,
  icon,
  badge,
  active,
}: {
  label: string;
  description?: string;
  icon: SlashIconKey;
  badge?: string;
  active?: boolean;
}): ReactNode {
  const detail = description ? previewOneLine(description) : null;
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <SlashIcon icon={icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
            <span className="shrink-0 text-muted-foreground">/</span>
            <span className="truncate">{label}</span>
          </span>
          {badge ? (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
              {badge}
            </span>
          ) : null}
          {active ? (
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              On
            </span>
          ) : null}
        </span>
        {detail ? (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

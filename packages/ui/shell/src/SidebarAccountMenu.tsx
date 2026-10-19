import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button } from "../../src/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../src/ui/dropdown-menu";
import { cn } from "../../src/utils/cn";
import { accountEmailClass, railTileClass, railTileStateClass } from "./app-shell-classes";

type ContentProps = ComponentPropsWithoutRef<typeof DropdownMenuContent>;

export type SidebarAccountMenuProps = {
  /** Trigger `title`, `aria-label` and the menu label. */
  name: string;
  /** When set, the label shows the name and email on two lines. */
  email?: string;
  /** Always use the two-line label layout, even without `email`. Default `false`. */
  stackedLabel?: boolean;
  /** Avatar image. Without it the avatar shows up to two initials of `name`. */
  imageUrl?: string;
  /** Default `"center"`. */
  align?: ContentProps["align"];
  /** Default `"right"`. */
  side?: ContentProps["side"];
  /** Default `8`. */
  sideOffset?: number;
  collisionPadding?: ContentProps["collisionPadding"];
  /** Merged onto the menu content after `w-56`. */
  contentClassName?: string;
  /** Menu items after the label and separator. */
  children?: ReactNode;
};

function AccountAvatar({ src, name, className }: { src?: string; name: string; className: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn(className, "rounded-full object-cover outline outline-1 -outline-offset-1 outline-separator")}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-surface-tertiary text-[10px] font-medium text-foreground outline outline-1 -outline-offset-1 outline-separator",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

/** Account menu on a rail tile: avatar trigger, identity label, then the app's items. */
export function SidebarAccountMenu({
  name,
  email,
  stackedLabel = false,
  imageUrl,
  align = "center",
  side = "right",
  sideOffset = 8,
  collisionPadding,
  contentClassName,
  children,
}: SidebarAccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          title={name}
          aria-label={`Account menu for ${name}`}
          className={cn(railTileClass, "h-11 w-11 p-0", railTileStateClass(false))}
        >
          <AccountAvatar src={imageUrl} name={name} className="h-7 w-7" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn("w-56", contentClassName)}
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-normal normal-case tracking-normal">
          <AccountAvatar src={imageUrl} name={name} className="h-6 w-6 shrink-0" />
          {stackedLabel || email ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{name}</span>
              {email ? <span className={accountEmailClass}>{email}</span> : null}
            </span>
          ) : (
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SidebarAccountMenuPlaceholderProps = { className?: string };

/** Tile-sized placeholder while the account loads. */
export function SidebarAccountMenuPlaceholder({ className }: SidebarAccountMenuPlaceholderProps) {
  return <div className={cn("size-11 rounded-lg bg-surface-tertiary", className)} />;
}

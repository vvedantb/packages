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
  /**
   * Unread dot over the trigger's top-right corner, a sibling of the trigger in
   * a `relative` wrapper. `true` shows it, `false` keeps it mounted at zero
   * opacity so it fades out. Omitted: no wrapper and no dot.
   */
  badge?: boolean;
  /** Spread onto the trigger `Button` after the defaults (overrides `title`, `aria-label`, …). `className` merges last. */
  triggerProps?: Omit<ComponentPropsWithoutRef<typeof Button>, "children" | "asChild">;
  /** Spread onto `DropdownMenuContent`, for example `fitViewport` or `aria-label`. Use `contentClassName` for classes. */
  contentProps?: Omit<
    ContentProps,
    "children" | "className" | "align" | "side" | "sideOffset" | "collisionPadding"
  >;
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
  badge,
  triggerProps,
  contentProps,
  children,
}: SidebarAccountMenuProps) {
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          title={name}
          aria-label={`Account menu for ${name}`}
          {...triggerProps}
          className={cn(
            railTileClass,
            "h-11 w-11 p-0",
            railTileStateClass(false),
            triggerProps?.className,
          )}
        >
          <AccountAvatar src={imageUrl} name={name} className="h-7 w-7" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        {...contentProps}
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
  if (badge === undefined) return menu;
  // Sibling of the trigger, so its opacity and press scale do not reach the dot.
  return (
    <div className="relative">
      {menu}
      <span
        aria-hidden="true"
        data-account-badge=""
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-danger transition-opacity duration-150 ease-out",
          badge ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export type SidebarAccountMenuPlaceholderProps = { className?: string };

/** Tile-sized placeholder while the account loads. */
export function SidebarAccountMenuPlaceholder({ className }: SidebarAccountMenuPlaceholderProps) {
  return <div className={cn("size-11 rounded-lg bg-surface-tertiary", className)} />;
}

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button, type ButtonProps } from "../../src/ui/button";
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
  /** Legacy (still supported): always use the two-line label layout, even without `email`. Default `false`. */
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
   * Legacy (still supported): unread dot over the trigger's top-right corner, a sibling of the trigger in
   * a `relative` wrapper. `true` shows it, `false` keeps it mounted at zero
   * opacity so it fades out. Omitted: no wrapper and no dot.
   */
  badge?: boolean;
  /** Legacy (still supported): spread onto the trigger `Button` after the defaults (overrides `title`, `aria-label`, …). `className` merges last. */
  triggerProps?: Omit<ComponentPropsWithoutRef<typeof Button>, "children" | "asChild">;
  /** Legacy (still supported): spread onto `DropdownMenuContent`, for example `fitViewport` or `aria-label`. Use `contentClassName` for classes. */
  contentProps?: Omit<
    ContentProps,
    "children" | "className" | "align" | "side" | "sideOffset" | "collisionPadding"
  >;
  /** Menu items after the label and separator. */
  children?: ReactNode;
};

/** Account menu on a rail tile: avatar trigger, identity label, then the app's items. Composed from `Sidebar.Account*` parts. */
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
  return (
    <AccountMenu badge={badge}>
      <AccountTrigger {...triggerProps} name={name} imageUrl={imageUrl} />
      <AccountContent
        {...contentProps}
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={contentClassName}
      >
        <AccountLabel name={name} email={email} imageUrl={imageUrl} stacked={stackedLabel} />
        <AccountSeparator />
        {children}
      </AccountContent>
    </AccountMenu>
  );
}

export type SidebarAccountMenuRootProps = ComponentPropsWithoutRef<typeof DropdownMenu> & {
  /**
   * Unread dot over the trigger's top-right corner (`AccountBadge`), a sibling
   * of the trigger in a `relative` wrapper. `true` shows it, `false` keeps it
   * mounted at zero opacity so it fades out. Omitted: no wrapper and no dot.
   */
  badge?: boolean;
};

/** Dropdown menu root. Holds `AccountTrigger` and `AccountContent`. */
export function AccountMenu({ badge, ...props }: SidebarAccountMenuRootProps) {
  const menu = <DropdownMenu {...props} />;
  if (badge === undefined) return menu;
  // Sibling of the trigger, so its opacity and press scale do not reach the dot.
  return (
    <div className="relative">
      {menu}
      <AccountBadge visible={badge} />
    </div>
  );
}

export type SidebarAccountBadgeProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** `false` keeps the dot mounted at zero opacity so it fades out. Default `true`. */
  visible?: boolean;
};

/** Unread dot for the top-right corner of a `relative` parent. */
export function AccountBadge({ visible = true, className, ...props }: SidebarAccountBadgeProps) {
  return (
    <span
      aria-hidden="true"
      data-account-badge=""
      {...props}
      className={cn(
        "pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-danger transition-opacity duration-150 ease-out",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

export type SidebarAccountAvatarProps = {
  name: string;
  /** Without it the avatar shows up to two initials of `name`. */
  imageUrl?: string;
  /** Size classes, for example `h-7 w-7`. */
  className?: string;
};

/** Round avatar image, or up to two initials of `name`. */
export function AccountAvatar({ imageUrl, name, className }: SidebarAccountAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
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

export type SidebarAccountTriggerProps = Omit<ButtonProps, "asChild" | "name"> & {
  /** Default `title` and `aria-label`, and the avatar initials. */
  name: string;
  imageUrl?: string;
};

/** Rail-tile-sized avatar button that opens the menu. Children replace the avatar. */
export function AccountTrigger({ name, imageUrl, className, children, ...props }: SidebarAccountTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        title={name}
        aria-label={`Account menu for ${name}`}
        {...props}
        className={cn(railTileClass, "h-11 w-11 p-0", railTileStateClass(false), className)}
      >
        {children ?? <AccountAvatar imageUrl={imageUrl} name={name} className="h-7 w-7" />}
      </Button>
    </DropdownMenuTrigger>
  );
}

export type SidebarAccountContentProps = ContentProps;

/** Menu content. Defaults: `align="center"`, `side="right"`, `sideOffset={8}`, `w-56`. */
export function AccountContent({
  align = "center",
  side = "right",
  sideOffset = 8,
  className,
  ...props
}: SidebarAccountContentProps) {
  return (
    <DropdownMenuContent
      {...props}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn("w-56", className)}
    />
  );
}

export type SidebarAccountLabelProps = Omit<ComponentPropsWithoutRef<typeof DropdownMenuLabel>, "children"> & {
  name: string;
  /** Shown under the name. */
  email?: string;
  imageUrl?: string;
  /** Two-line layout even without `email`. Default `false`. */
  stacked?: boolean;
};

/** Identity label: small avatar, name and optional email. Follow it with `AccountSeparator`. */
export function AccountLabel({ name, email, imageUrl, stacked = false, className, ...props }: SidebarAccountLabelProps) {
  return (
    <DropdownMenuLabel
      {...props}
      className={cn("flex items-center gap-2 font-normal normal-case tracking-normal", className)}
    >
      <AccountAvatar imageUrl={imageUrl} name={name} className="h-6 w-6 shrink-0" />
      {stacked || email ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          {email ? <span className={accountEmailClass}>{email}</span> : null}
        </span>
      ) : (
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
      )}
    </DropdownMenuLabel>
  );
}

export type SidebarAccountSeparatorProps = ComponentPropsWithoutRef<typeof DropdownMenuSeparator>;

/** Separator between the label and the items. */
export function AccountSeparator(props: SidebarAccountSeparatorProps) {
  return <DropdownMenuSeparator {...props} />;
}

export type SidebarAccountMenuPlaceholderProps = { className?: string };

/** Tile-sized placeholder while the account loads. */
export function SidebarAccountMenuPlaceholder({ className }: SidebarAccountMenuPlaceholderProps) {
  return <div className={cn("size-11 rounded-lg bg-surface-tertiary", className)} />;
}

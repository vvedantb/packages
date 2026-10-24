import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import {
  IconCheck,
  IconChevronRight,
  IconCircleFilled,
} from "@tabler/icons-react";
import { cn } from "../utils/cn";
import {
  menuCheckboxRadioItemClass,
  menuContentClass,
  menuItemClass,
  menuLabelClass,
  menuSeparatorClass,
  menuShortcutClass,
  menuSubTriggerClass,
} from "./_menu-classes";
import {
  type MenuConfig,
  MenuItemRow,
  SubTriggerRow,
  suppressAltKeyDown,
} from "./_menu-parts";
import { useUiConfig } from "./ui-config";

/** App defaults for `ContextMenu*` (see `UiConfigProvider`). */
export interface ContextMenuConfig extends MenuConfig {
  /** Default for `ContextMenuSubContent` `portal`. */
  subContentPortal?: boolean;
}

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>((props, ref) => {
  const trigger = useUiConfig("ContextMenu")?.classes?.trigger;
  // Without config, pass props untouched: Radix's Slot turns an explicit
  // `className={undefined}` into `class=""`.
  if (trigger === undefined) return <ContextMenuPrimitive.Trigger ref={ref} {...props} />;
  const { className, ...rest } = props;
  return <ContextMenuPrimitive.Trigger ref={ref} className={cn(trigger, className)} {...rest} />;
});
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
    /** Leading icon or mark. The label then fills the row. */
    startContent?: React.ReactNode;
  }
>(({ className, inset, startContent, children, ...props }, ref) => {
  const classes = useUiConfig("ContextMenu")?.classes;
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(classes?.subTrigger ?? menuSubTriggerClass, inset && "pl-8", className)}
      {...props}
    >
      {startContent === undefined ? children : (
        <SubTriggerRow startContent={startContent}>{children}</SubTriggerRow>
      )}
      <IconChevronRight className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
});
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent> & {
    /** Render into `document.body` so a clipping parent cannot cut it off. */
    portal?: boolean;
  }
>(({ className, portal, ...props }, ref) => {
  const config = useUiConfig("ContextMenu");
  const content = (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      className={cn(config?.classes?.subContent ?? [menuContentClass, "w-40"], className)}
      {...props}
    />
  );
  return (portal ?? config?.subContentPortal) ? (
    <ContextMenuPrimitive.Portal>{content}</ContextMenuPrimitive.Portal>
  ) : (
    content
  );
});
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content> & {
    /** Stop a bare Alt press from moving focus (e.g. into the browser menu bar). */
    suppressAltKey?: boolean;
  }
>(({ className, suppressAltKey, collisionPadding, onKeyDown, ...props }, ref) => {
  const config = useUiConfig("ContextMenu");
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        collisionPadding={collisionPadding ?? config?.collisionPadding}
        className={cn(config?.classes?.content ?? [menuContentClass, "w-40"], className)}
        onKeyDown={suppressAltKey ? suppressAltKeyDown(onKeyDown) : onKeyDown}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
    /** Leading icon or mark. Ignored with `asChild`. */
    startContent?: React.ReactNode;
    /** Second line under the label. Ignored with `asChild`. */
    description?: React.ReactNode;
    /** Trailing content. Ignored with `asChild`. */
    endContent?: React.ReactNode;
  }
>(
  (
    { className, inset, startContent, description, endContent, children, asChild, ...props },
    ref,
  ) => {
    const item = useUiConfig("ContextMenu")?.classes?.item;
    return (
      <ContextMenuPrimitive.Item
        ref={ref}
        asChild={asChild}
        className={cn(item ?? menuItemClass, inset && "pl-8", className)}
        {...props}
      >
        {asChild || (startContent === undefined && description === undefined && endContent === undefined) ? (
          children
        ) : (
          <MenuItemRow startContent={startContent} description={description} endContent={endContent}>
            {children}
          </MenuItemRow>
        )}
      </ContextMenuPrimitive.Item>
    );
  },
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const config = useUiConfig("ContextMenu");
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(config?.classes?.checkboxItem ?? menuCheckboxRadioItemClass, className)}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          {config?.icons?.check ?? <IconCheck className="h-4 w-4" />}
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const config = useUiConfig("ContextMenu");
  return (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      className={cn(config?.classes?.radioItem ?? menuCheckboxRadioItemClass, className)}
      {...props}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          {config?.icons?.radio ?? <IconCircleFilled className="h-2 w-2 fill-current" />}
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => {
  const label = useUiConfig("ContextMenu")?.classes?.label;
  return (
    <ContextMenuPrimitive.Label
      ref={ref}
      className={cn(label ?? menuLabelClass, inset && "pl-8", className)}
      {...props}
    />
  );
});
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const separator = useUiConfig("ContextMenu")?.classes?.separator;
  return (
    <ContextMenuPrimitive.Separator
      ref={ref}
      className={cn(separator ?? menuSeparatorClass, className)}
      {...props}
    />
  );
});
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  const shortcut = useUiConfig("ContextMenu")?.classes?.shortcut;
  return <span className={cn(shortcut ?? menuShortcutClass, className)} {...props} />;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};

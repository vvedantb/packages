import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  IconCheck,
  IconChevronRight,
  IconCircleFilled,
} from "@tabler/icons-react";
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
  fitViewportClass,
  type MenuConfig,
  MenuItemRow,
  SubTriggerRow,
  suppressAltKeyDown,
} from "./_menu-parts";
import { restoreModalScrollLock } from "./overlay-a11y";
import { useCn, useUiConfig } from "./ui-config";

/** App defaults for `DropdownMenu*` (see `UiConfigProvider`). */
export interface DropdownMenuConfig extends MenuConfig {
  /** Default for `DropdownMenuContent` `sideOffset`. */
  sideOffset?: number;
}

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>((props, ref) => {
  const trigger = useUiConfig("DropdownMenu")?.classes?.trigger;
  const merge = useCn();
  // Without config, pass props untouched: Radix's Slot turns an explicit
  // `className={undefined}` into `class=""`.
  if (trigger === undefined) return <DropdownMenuPrimitive.Trigger ref={ref} {...props} />;
  const { className, ...rest } = props;
  return <DropdownMenuPrimitive.Trigger ref={ref} className={merge(trigger, className)} {...rest} />;
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
    /** Leading icon or mark. The label then fills the row. */
    startContent?: React.ReactNode;
  }
>(({ className, inset, startContent, children, ...props }, ref) => {
  const classes = useUiConfig("DropdownMenu")?.classes;
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={merge(classes?.subTrigger ?? menuSubTriggerClass, inset && "pl-8", className)}
      {...props}
    >
      {startContent === undefined ? children : (
        <SubTriggerRow startContent={startContent}>{children}</SubTriggerRow>
      )}
      <IconChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => {
  const classes = useUiConfig("DropdownMenu")?.classes;
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={merge(classes?.subContent ?? menuContentClass, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
    /** On small screens, cap the height to the viewport and scroll. */
    fitViewport?: boolean;
    /** Stop a bare Alt press from moving focus (e.g. into the browser menu bar). */
    suppressAltKey?: boolean;
    /** On close, clear any body scroll lock left behind when no dialog is open. */
    restoreScrollLockOnClose?: boolean;
  }
>(
  (
    {
      className,
      sideOffset,
      collisionPadding,
      fitViewport,
      suppressAltKey,
      restoreScrollLockOnClose,
      onKeyDown,
      onCloseAutoFocus,
      ...props
    },
    ref,
  ) => {
    const config = useUiConfig("DropdownMenu");
    const merge = useCn();
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset ?? config?.sideOffset ?? 4}
          collisionPadding={collisionPadding ?? config?.collisionPadding}
          className={merge(
            config?.classes?.content ?? menuContentClass,
            fitViewport && fitViewportClass,
            className,
          )}
          onKeyDown={suppressAltKey ? suppressAltKeyDown(onKeyDown) : onKeyDown}
          onCloseAutoFocus={
            restoreScrollLockOnClose
              ? (event) => {
                  restoreModalScrollLock();
                  window.setTimeout(restoreModalScrollLock, 0);
                  onCloseAutoFocus?.(event);
                }
              : onCloseAutoFocus
          }
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    /** Leading icon or mark. Ignored with `asChild`. */
    startContent?: React.ReactNode;
    /** Second line under the label. Ignored with `asChild`. */
    description?: React.ReactNode;
    /** Trailing content. The label then fills the row. Ignored with `asChild`. */
    endContent?: React.ReactNode;
  }
>(
  (
    { className, inset, startContent, description, endContent, children, asChild, ...props },
    ref,
  ) => {
    const item = useUiConfig("DropdownMenu")?.classes?.item;
    const merge = useCn();
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        asChild={asChild}
        className={merge(item ?? menuItemClass, inset && "pl-8", className)}
        {...props}
      >
        {asChild || (startContent === undefined && description === undefined && endContent === undefined) ? (
          children
        ) : endContent !== undefined ? (
          <MenuItemRow startContent={startContent} description={description} endContent={endContent}>
            {children}
          </MenuItemRow>
        ) : (
          <>
            {startContent}
            {description === undefined ? (
              children
            ) : (
              <span className="flex min-w-0 flex-col">
                <span>{children}</span>
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
            )}
          </>
        )}
      </DropdownMenuPrimitive.Item>
    );
  },
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const config = useUiConfig("DropdownMenu");
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={merge(config?.classes?.checkboxItem ?? menuCheckboxRadioItemClass, className)}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          {config?.icons?.check ?? <IconCheck className="h-4 w-4" />}
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const config = useUiConfig("DropdownMenu");
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={merge(config?.classes?.radioItem ?? menuCheckboxRadioItemClass, className)}
      {...props}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          {config?.icons?.radio ?? <IconCircleFilled className="h-2 w-2 fill-current" />}
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => {
  const label = useUiConfig("DropdownMenu")?.classes?.label;
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={merge(label ?? menuLabelClass, inset && "pl-8", className)}
      {...props}
    />
  );
});
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const separator = useUiConfig("DropdownMenu")?.classes?.separator;
  const merge = useCn();
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={merge(separator ?? menuSeparatorClass, className)}
      {...props}
    />
  );
});
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  const shortcut = useUiConfig("DropdownMenu")?.classes?.shortcut;
  const merge = useCn();
  return <span className={merge(shortcut ?? menuShortcutClass, className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};

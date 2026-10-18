import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
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
  fitViewportClass,
  MenuItemRow,
  SubTriggerRow,
  suppressAltKeyDown,
} from "./_menu-parts";
import { restoreModalScrollLock } from "./overlay-a11y";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
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
>(({ className, inset, startContent, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(menuSubTriggerClass, inset && "pl-8", className)}
    {...props}
  >
    {startContent === undefined ? children : (
      <SubTriggerRow startContent={startContent}>{children}</SubTriggerRow>
    )}
    <IconChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(menuContentClass, className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
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
      sideOffset = 4,
      fitViewport,
      suppressAltKey,
      restoreScrollLockOnClose,
      onKeyDown,
      onCloseAutoFocus,
      ...props
    },
    ref,
  ) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(menuContentClass, fitViewport && fitViewportClass, className)}
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
  ),
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
  ) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      asChild={asChild}
      className={cn(menuItemClass, inset && "pl-8", className)}
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
  ),
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(menuCheckboxRadioItemClass, className)}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <IconCheck className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(menuCheckboxRadioItemClass, className)}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <IconCircleFilled className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(menuLabelClass, inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(menuSeparatorClass, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn(menuShortcutClass, className)} {...props} />;
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

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { IconSearch } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

/** App defaults for `Command*` (see `UiConfigProvider`). */
export interface CommandConfig {
  /** Replaces the built-in classes of a part. */
  classes?: {
    root?: string;
    /** `CommandDialog` content. */
    dialogContent?: string;
    /** The `Command` inside `CommandDialog`, for every `listLayout`. */
    dialogCommand?: string;
    inputWrapper?: string;
    input?: string;
    list?: string;
    empty?: string;
    group?: string;
    separator?: string;
    item?: string;
    shortcut?: string;
  };
  /** Replace the built-in icons. */
  icons?: {
    /** `CommandInput` search icon. */
    search?: React.ReactNode;
  };
  /** A `className` on `CommandEmpty` replaces its classes instead of merging with them. */
  emptyClassNameReplaces?: boolean;
}

const Command = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => {
  const root = useUiConfig("Command")?.classes?.root;
  return (
    <CommandPrimitive
      ref={ref}
      className={cn(
        root ??
          "flex h-full w-full flex-col overflow-hidden rounded-lg bg-overlay text-overlay-foreground",
        className,
      )}
      {...props}
    />
  );
});
Command.displayName = CommandPrimitive.displayName;

// The list is pinned rather than `max-h`: a palette that resizes on every
// keystroke shifts the whole dialog under the cursor.
const commandDialogPinnedClass =
  "[&_[cmdk-list]]:h-80 [&_[cmdk-list]]:max-h-[60dvh] [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-1.5 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:rounded-menu-item [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4";

// The list sizes itself and items keep the caller's styling.
const commandDialogAutoClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-1.5 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"; // check-tokens-allow: text-muted

interface CommandDialogProps extends React.ComponentProps<typeof Dialog> {
  /** Screen-reader title. With `description`, adds a visually hidden header. */
  title?: string;
  /** Screen-reader description. With `title`, adds a visually hidden header. */
  description?: string;
  /** Merged onto the dialog content. */
  className?: string;
  /** Passed to `Command`. Set `false` to filter items yourself. */
  shouldFilter?: boolean;
  /** `"pinned"` (default) fixes the list height; `"auto"` lets it size itself. */
  listLayout?: "pinned" | "auto";
}

function CommandDialog({
  children,
  title,
  description,
  className,
  shouldFilter,
  listLayout = "pinned",
  ...props
}: CommandDialogProps) {
  const classes = useUiConfig("Command")?.classes;
  return (
    <Dialog {...props}>
      <DialogContent className={cn(classes?.dialogContent ?? "overflow-hidden p-0 sm:max-w-xl", className)}>
        {title !== undefined || description !== undefined ? (
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        ) : null}
        <Command
          shouldFilter={shouldFilter}
          className={
            classes?.dialogCommand ??
            (listLayout === "auto" ? commandDialogAutoClass : commandDialogPinnedClass)
          }
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => {
  const config = useUiConfig("Command");
  return (
    <div
      className={config?.classes?.inputWrapper ?? "flex items-center border-b border-separator px-3.5"}
      cmdk-input-wrapper=""
    >
      {config?.icons?.search ?? (
        <IconSearch className="mr-2 h-4 w-4 shrink-0 opacity-50" stroke={1.5} />
      )}
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          config?.classes?.input ??
            "flex h-11 w-full max-sm:min-w-0 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => {
  const list = useUiConfig("Command")?.classes?.list;
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(list ?? "max-h-80 overflow-y-auto overflow-x-hidden pb-2", className)}
      {...props}
    />
  );
});
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => {
  const config = useUiConfig("Command");
  const classes = config?.classes?.empty ?? "py-8 text-center text-sm text-muted-foreground";
  return (
    <CommandPrimitive.Empty
      ref={ref}
      className={
        config?.emptyClassNameReplaces && className !== undefined
          ? className
          : cn(classes, className)
      }
      {...props}
    />
  );
});
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => {
  const group = useUiConfig("Command")?.classes?.group;
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        group ??
          "overflow-hidden p-1.5 text-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const separator = useUiConfig("Command")?.classes?.separator;
  return (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn(separator ?? "-mx-1.5 h-px bg-separator", className)}
      {...props}
    />
  );
});
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => {
  const item = useUiConfig("Command")?.classes?.item;
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        item ??
          "relative flex cursor-default gap-2 select-none items-center rounded-menu-item px-2.5 py-2 text-sm outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-surface-tertiary/80 data-[selected=true]:text-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
});
CommandItem.displayName = CommandPrimitive.Item.displayName;

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const shortcut = useUiConfig("Command")?.classes?.shortcut;
  return (
    <span
      className={cn(shortcut ?? "ml-auto text-xs tracking-wide text-muted-foreground/90", className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};

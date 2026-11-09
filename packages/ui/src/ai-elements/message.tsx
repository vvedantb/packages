"use client";
import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes, ReactElement, ReactNode } from "react";
import { Button } from "../ui/button";
import { ButtonGroup, ButtonGroupText } from "../ui/button-group";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useCn, useUiConfig } from "../ui/ui-config";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { createContext, useContext, useEffect, useState } from "react";
/**
 * `UiConfig.Message`: classes replace a part's built-in classes (`root`, and
 * the `user` / `assistant` role classes of `Message`; `content` is the whole
 * `MessageContent` list). `lazyActionTooltips` mounts a `MessageAction`
 * tooltip on first hover or focus instead of with the button.
 */
export interface MessageConfig {
  lazyActionTooltips?: boolean;
  classes?: {
    root?: string;
    user?: string;
    assistant?: string;
    content?: string;
    branchSelector?: string;
    /** Replaces the branch arrows' `size={14}` with a class. */
    branchIcon?: string;
  };
}
/**
 * One action of a message: a row in the right-click menu and, with an `icon`,
 * a button in the hover toolbar. Start with Reply.
 */
export type MessageMenuAction = {
  key: string;
  label: string;
  /** Shows the action in the hover toolbar (an icon button). Without it: menu only. */
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Force the hover toolbar on (`true`) or off (`false`). Default: on when there is an `icon`. */
  hover?: boolean;
};
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
  /**
   * Right-click menu and hover toolbar actions, such as Reply. Without it (or
   * empty) `Message` renders the same `div` as before. With it a right click
   * opens the menu and a hover toolbar shows beside the bubble. The toolbar is
   * absolutely positioned and takes no layout space.
   */
  actions?: MessageMenuAction[];
  /**
   * The target of a quote click: a soft primary wash and ring. Set it back to
   * `false` about 1.5 seconds later and it fades out (`duration-1000`). Sets
   * `data-highlighted`.
   */
  highlighted?: boolean;
};
export const Message = ({
  className,
  from,
  actions,
  highlighted,
  children,
  ...props
}: MessageProps) => {
  const classes = useUiConfig("Message")?.classes;
  const merge = useCn();
  const hasActions = actions !== undefined && actions.length > 0;
  const root = (
    <div
      className={merge(
        classes?.root ?? "group flex w-full max-w-[95%] flex-col gap-2",
        from === "user"
          ? (classes?.user ?? "is-user ml-auto justify-end")
          : (classes?.assistant ?? "is-assistant"),
                highlighted !== undefined &&
          "rounded-xl transition-[background-color,box-shadow] duration-1000",
        highlighted && "bg-primary/10 ring-2 ring-primary/30",
        className,
      )}
      data-highlighted={highlighted ? "" : undefined}
      {...props}
    >
      {hasActions ? (
        <div
          className={
            from === "user"
              ? "relative ml-auto w-fit max-w-full"
              : "relative w-fit max-w-full"
          }
        >
          {children}
          <MessageHoverActions actions={actions} from={from} />
        </div>
      ) : (
        children
      )}
    </div>
  );
  return hasActions ? (
    <MessageContextMenu actions={actions}>{root}</MessageContextMenu>
  ) : (
    root
  );
};
export type MessageContextMenuProps = {
  actions: MessageMenuAction[];
  /** One element, which becomes the right-click target (Radix `asChild`). */
  children: ReactElement;
};
/**
 * The right-click menu of a message: `actions` as `ContextMenuItem`s,
 * destructive ones in the danger colour. With no actions it returns `children`.
 */
export const MessageContextMenu = ({
  actions,
  children,
}: MessageContextMenuProps) => {
  if (actions.length === 0) return children;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent aria-label="Message actions">
        {actions.map((action) => (
          <ContextMenuItem
            key={action.key}
            disabled={action.disabled}
            startContent={action.icon}
            className={action.destructive ? "text-danger" : undefined}
            onSelect={action.onSelect}
          >
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
export type MessageHoverActionsProps = Omit<
  ComponentProps<"div">,
  "children"
> & {
  actions: MessageMenuAction[];
  /** Role of the message: user toolbars sit left of the bubble, others right. Default `assistant`. */
  from?: UIMessage["role"];
};
/**
 * A small toolbar of icon buttons that shows on hover or focus of the
 * enclosing `Message` (the `group` class, `reveal-on-hover`; always visible on
 * touch). It is absolutely positioned, so it takes no layout space: beside the
 * bubble, top-aligned (left of a user bubble, right of an assistant message).
 * On narrow screens it moves to the bubble's top edge. Draws the actions that
 * have an `icon`. Place it inside a `relative w-fit` wrapper around the
 * bubble; the `actions` prop on `Message` does this.
 */
export const MessageHoverActions = ({
  actions,
  from = "assistant",
  className,
  ...props
}: MessageHoverActionsProps) => {
  const merge = useCn();
  const shown = actions.filter((action) =>
    action.hover === undefined ? action.icon !== undefined : action.hover,
  );
  if (shown.length === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Message actions"
      className={merge(
        "reveal-on-hover absolute top-0 z-10 flex w-fit items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 shadow-sm transition-opacity",
        from === "user"
          ? "right-full mr-1 max-sm:right-2 max-sm:mr-0 max-sm:-translate-y-[62%] max-sm:[&>button]:size-6"
          : "left-full ml-1 max-sm:left-auto max-sm:right-0 max-sm:ml-0 max-sm:-translate-y-full max-sm:[&>button]:size-6",
        className,
      )}
      {...props}
    >
      {shown.map((action) => (
        <MessageAction
          key={action.key}
          label={action.label}
          tooltip={action.label}
          tooltipSide="bottom"
          // Narrow: the toolbar sits on the bubble corner and a tooltip below it would cover the text.
          tooltipClassName="max-sm:hidden"
          disabled={action.disabled}
          className={action.destructive ? "text-danger" : undefined}
          onClick={action.onSelect}
        >
          {action.icon}
        </MessageAction>
      ))}
    </div>
  );
};
export type MessageQuoteProps = Omit<ComponentProps<"div">, "onClick"> & {
  /** Who wrote the quoted message. */
  author: string;
  /** The quoted text, cut to two lines. */
  text: string;
  /** Makes the quote a button, so the app can scroll to and highlight the original. */
  onPress?: () => void;
};
/**
 * A compact quote inside a message bubble, above its text: a left border, the
 * author and two lines of the text. It reads on the primary user bubble, the
 * border and text take the bubble colour. With `onPress` it is a button.
 */
export const MessageQuote = ({
  author,
  text,
  onPress,
  className,
  ...props
}: MessageQuoteProps) => {
  const merge = useCn();
  const body = (
    <>
      <span className="block truncate text-xs font-semibold opacity-70">
        {author}
      </span>
      <span className="line-clamp-2 block text-sm opacity-90">{text}</span>
    </>
  );
  const base = "block min-w-0 border-l-2 border-current/40 pl-2.5 text-left";
  if (onPress === undefined) {
    return (
      <div
        role="group"
        aria-label={`Quoted message from ${author}`}
        className={merge(base, className)}
        {...props}
      >
        {body}
      </div>
    );
  }
  return (
    <div
      className={merge(base, className)}
      {...props}
    >
      <button
        type="button"
        aria-label={`Go to quoted message from ${author}`}
        onClick={onPress}
        className="block w-full min-w-0 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {body}
      </button>
    </div>
  );
};
export type MessageContentProps = HTMLAttributes<HTMLDivElement>;
export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => {
  const content = useUiConfig("Message")?.classes?.content;
  const merge = useCn();
  return (
    <div
      className={merge(
        content ?? [
          "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
          "group-[.is-user]:ml-auto group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-primary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-primary-foreground",
          "group-[.is-assistant]:px-0 group-[.is-assistant]:text-foreground",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
export type MessageActionsBarProps = ComponentProps<"div">;
export const MessageActionsBar = ({
  className,
  children,
  ...props
}: MessageActionsBarProps) => {
  const merge = useCn();
  return (
    <div className={merge("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
};
export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  /** Side of the tooltip. Default: the Radix default (`top`). */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Extra classes for the tooltip content. */
  tooltipClassName?: string;
  label?: string;
};
export const MessageAction = (props: MessageActionProps) => {
  const lazy = useUiConfig("Message")?.lazyActionTooltips;
  return lazy ? <LazyMessageAction {...props} /> : <EagerMessageAction {...props} />;
};
function EagerMessageAction({
  tooltip,
  tooltipSide,
  tooltipClassName,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );
  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide} className={tooltipClassName}>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return button;
}
/**
 * The tooltip mounts on first hover or focus, not with the button. Each Radix
 * tooltip is a dozen components plus a re-render once it has measured its
 * anchor; a long chat has hundreds of these buttons.
 */
function LazyMessageAction({
  tooltip,
  tooltipSide,
  tooltipClassName,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  onPointerEnter,
  onFocus,
  ...props
}: MessageActionProps) {
  const [armedBy, setArmedBy] = useState<"pointer" | "focus" | null>(null);
  const button = (
    <Button
      size={size}
      type="button"
      variant={variant}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (tooltip && armedBy === null) setArmedBy("pointer");
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (tooltip && armedBy === null) setArmedBy("focus");
      }}
      // Arming remounts the button inside the tooltip trigger; a keyboard
      // user keeps focus on it (and so sees the tooltip).
      autoFocus={armedBy === "focus"}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );
  if (tooltip && armedBy !== null) {
    return (
      <TooltipProvider>
        {/* The focus that armed it landed before the tooltip existed. */}
        <Tooltip defaultOpen={armedBy === "focus"}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide} className={tooltipClassName}>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return button;
}
interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}
const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null,
);
const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);
  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch",
    );
  }
  return context;
};
export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};
export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);
  const handleBranchChange = (newBranch: number) => {
    setCurrentBranch(newBranch);
    onBranchChange?.(newBranch);
  };
  const goToPrevious = () => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  };
  const goToNext = () => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  };
  const merge = useCn();
  const contextValue = {
    branches,
    currentBranch,
    goToNext,
    goToPrevious,
    setBranches,
    totalBranches: branches.length,
  };
  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={merge("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};
export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;
export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const merge = useCn();
  const childrenArray = Array.isArray(children) ? children : [children];
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);
  return childrenArray.map((branch, index) => (
    <div
      className={merge(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden",
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};
export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;
export const MessageBranchSelector = ({
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();
  const branchSelector = useUiConfig("Message")?.classes?.branchSelector;
  const merge = useCn();
  if (totalBranches <= 1) {
    return null;
  }
  return (
    <ButtonGroup
      className={merge(
        branchSelector ??
          "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className,
      )}
      orientation="horizontal"
      {...props}
    />
  );
};
export type MessageBranchPreviousProps = ComponentProps<typeof Button>;
// Prev and next sit in a `ButtonGroup` with `rounded-md` inner corners, so they
// default to `shape="rounded"`; a pill would pair a round outer end with them.
export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();
  const branchIcon = useUiConfig("Message")?.classes?.branchIcon;
  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      shape="rounded"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ??
        (branchIcon === undefined ? (
          <IconChevronLeft size={14} />
        ) : (
          <IconChevronLeft className={branchIcon} />
        ))}
    </Button>
  );
};
export type MessageBranchNextProps = ComponentProps<typeof Button>;
export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();
  const branchIcon = useUiConfig("Message")?.classes?.branchIcon;
  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      shape="rounded"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ??
        (branchIcon === undefined ? (
          <IconChevronRight size={14} />
        ) : (
          <IconChevronRight className={branchIcon} />
        ))}
    </Button>
  );
};
export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;
export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();
  const merge = useCn();
  return (
    <ButtonGroupText
      className={merge(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className,
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};
export type MessageToolbarProps = ComponentProps<"div">;
export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "mt-4 flex w-full items-center justify-between gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

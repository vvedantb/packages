"use client";
import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import { Button } from "../ui/button";
import { ButtonGroup, ButtonGroupText } from "../ui/button-group";
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
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};
export const Message = ({ className, from, ...props }: MessageProps) => {
  const classes = useUiConfig("Message")?.classes;
  const merge = useCn();
  return (
    <div
      className={merge(
        classes?.root ?? "group flex w-full max-w-[95%] flex-col gap-2",
        from === "user"
          ? (classes?.user ?? "is-user ml-auto justify-end")
          : (classes?.assistant ?? "is-assistant"),
        className,
      )}
      {...props}
    />
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
  label?: string;
};
export const MessageAction = (props: MessageActionProps) => {
  const lazy = useUiConfig("Message")?.lazyActionTooltips;
  return lazy ? <LazyMessageAction {...props} /> : <EagerMessageAction {...props} />;
};
function EagerMessageAction({
  tooltip,
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
          <TooltipContent>
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
          <TooltipContent>
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

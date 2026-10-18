import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconX } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { Button } from "./button";

export interface SlideOverPanelProps {
  open: boolean;
  /** Panel width. Default `"w-96"`. */
  width?: "w-80" | "w-96";
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
  /** `aria-label` of the close button. Default `"Close panel"`. */
  closeLabel?: string;
  className?: string;
}

/**
 * Right-side slide-over shell, absolutely positioned inside its nearest
 * positioned parent (not a portal or dialog). Only the close button closes it.
 * Hidden below `md`.
 */
export function SlideOverPanel({
  open,
  width = "w-96",
  onClose,
  header,
  children,
  closeLabel = "Close panel",
  className,
}: SlideOverPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="slide-over-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={cn(
            `absolute top-0 right-0 bottom-0 ${width} z-20 glass-panel-strong smooth-shadow-ring-xl overflow-y-auto hidden md:flex flex-col`,
            className,
          )}
        >
          <div className="flex items-start justify-between p-4 pb-2">
            {header}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={closeLabel}
            >
              <IconX size={16} />
            </Button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import type { HTMLAttributes, SVGProps } from "react";
import { useCn } from "../ui/ui-config";

export type LiveCursorProps = HTMLAttributes<HTMLSpanElement>;

export const LiveCursor = ({
  className,
  children,
  ...props
}: LiveCursorProps) => {
  const merge = useCn();
  return (
    <span
      className={merge("pointer-events-none relative select-none", className)}
      {...props}
    >
      {children}
    </span>
  );
};

export type LiveCursorPointerProps = SVGProps<SVGSVGElement>;

export const LiveCursorPointer = ({
  className,
  ...props
}: LiveCursorPointerProps) => {
  const merge = useCn();
  return (
    <svg
      aria-hidden="true"
      className={merge("size-3.5", className)}
      fill="none"
      focusable="false"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M19.438 6.716 1.115.05A.832.832 0 0 0 .05 1.116L6.712 19.45a.834.834 0 0 0 1.557.025l3.198-8 7.995-3.2a.833.833 0 0 0 0-1.559h-.024Z"
        fill="currentColor"
      />
    </svg>
  );
};

export type LiveCursorBodyProps = HTMLAttributes<HTMLSpanElement>;

export const LiveCursorBody = ({
  children,
  className,
  ...props
}: LiveCursorBodyProps) => {
  const merge = useCn();
  return (
    <span
      className={merge(
        "relative ml-3.5 flex flex-col whitespace-nowrap rounded-lg py-1 pr-3 pl-2.5 text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export type LiveCursorNameProps = HTMLAttributes<HTMLSpanElement>;

export const LiveCursorName = (props: LiveCursorNameProps) => <span {...props} />;

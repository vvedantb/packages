"use client";

import * as React from "react";
import { IconX } from "@tabler/icons-react";
import { assignRef } from "../utils/ref";
import { fieldFocusClass } from "./_field-classes";
import { runClearInputDissolve } from "./clearInputDissolve";
import { useCn, useUiConfig } from "./ui-config";

type ClearInputAnimation = "dissolve" | "none";

/**
 * `UiConfig.ClearInput`: `animation` is the default for the prop. `classes`
 * replace the built-in input and button classes, and the wrapper's `relative`
 * in the `none` layout (the `dissolve` wrapper keeps its `t-clear` hooks and
 * adds `classes.wrapper`).
 */
export interface ClearInputConfig {
  animation?: ClearInputAnimation;
  classes?: { wrapper?: string; input?: string; button?: string };
}

export interface ClearInputProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  /** Icon or adornment positioned in the field's left gutter. */
  leading?: React.ReactNode;
  clearLabel?: string;
  /**
   * `dissolve` (default): the text dissolves before the value clears (needs
   * `clear-input.css`). `none`: clear at once, focus the input, and render
   * only the wrapper, input and clear button.
   */
  animation?: ClearInputAnimation;
}

const inputClasses =
  "flex h-10 w-full rounded-field border border-border bg-field-background px-3.5 py-2 text-base sm:text-sm transition-[border-color,box-shadow,background-color] duration-200 ease-smooth placeholder:text-field-placeholder disabled:cursor-not-allowed disabled:opacity-50";

const buttonClasses =
  "absolute right-2 top-1/2 z-4 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-100 ease-out active:scale-[0.92] hover:bg-surface-tertiary/50 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring";

const ClearInput = React.forwardRef<HTMLInputElement, ClearInputProps>(
  ({ animation, ...props }, ref) => {
    const config = useUiConfig("ClearInput");
    if ((animation ?? config?.animation) === "none") {
      return <PlainClearInput ref={ref} classes={config?.classes} {...props} />;
    }
    return <DissolveClearInput ref={ref} classes={config?.classes} {...props} />;
  },
);
ClearInput.displayName = "ClearInput";

type ClearInputPartsProps = Omit<ClearInputProps, "animation"> & {
  classes: ClearInputConfig["classes"];
};

const PlainClearInput = React.forwardRef<HTMLInputElement, ClearInputPartsProps>(
  (
    {
      value,
      onChange,
      wrapperClassName,
      leading,
      clearLabel = "Clear",
      className,
      placeholder = "",
      classes,
      ...props
    },
    ref,
  ) => {
    const merge = useCn();
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const preventFocusSteal = (event: React.SyntheticEvent) => {
      if (document.activeElement === inputRef.current) {
        event.preventDefault();
      }
    };

    return (
      <div className={merge(classes?.wrapper ?? "relative", wrapperClassName)}>
        {leading}
        <input
          ref={(node) => {
            inputRef.current = node;
            assignRef(ref, node);
          }}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          className={merge(
            classes?.input ?? [inputClasses, fieldFocusClass],
            value.length > 0 && "pr-9",
            className,
          )}
          {...props}
        />
        {value.length > 0 ? (
          <button
            type="button"
            className={classes?.button ?? buttonClasses}
            aria-label={clearLabel}
            onPointerDown={preventFocusSteal}
            onMouseDown={preventFocusSteal}
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
          >
            <IconX size={14} stroke={1.75} />
          </button>
        ) : null}
      </div>
    );
  },
);

const DissolveClearInput = React.forwardRef<HTMLInputElement, ClearInputPartsProps>(
  (
    {
      value,
      onChange,
      wrapperClassName,
      leading,
      clearLabel = "Clear",
      className,
      placeholder = "",
      classes,
      ...props
    },
    ref,
  ) => {
    const merge = useCn();
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const mirrorRef = React.useRef<HTMLDivElement>(null);
    const placeholderRef = React.useRef<HTMLDivElement>(null);
    const glowRef = React.useRef<HTMLDivElement>(null);
    const clearingRef = React.useRef(false);
    const [clearing, setClearing] = React.useState(false);

    function mergedRef(node: HTMLInputElement | null) {
      inputRef.current = node;
      assignRef(ref, node);
    }

    const hasValue = value.length > 0 || clearing;

    React.useEffect(() => {
      const wrap = wrapRef.current;
      const mirror = mirrorRef.current;
      if (!wrap || !mirror || clearingRef.current) {
        return;
      }
      wrap.classList.toggle("has-value", value.length > 0);
      if (value.length > 0) {
        mirror.textContent = value.replace(/ /g, "\u00a0");
      } else if (!clearingRef.current) {
        mirror.textContent = "";
      }
    }, [value]);

    const preventFocusSteal = (event: React.SyntheticEvent) => {
      if (document.activeElement === inputRef.current) {
        event.preventDefault();
      }
    };

    const handleClear = () => {
      const wrap = wrapRef.current;
      const input = inputRef.current;
      const mirror = mirrorRef.current;
      const placeholderLayer = placeholderRef.current;
      const glow = glowRef.current;
      if (
        !wrap ||
        !input ||
        !mirror ||
        !placeholderLayer ||
        !glow ||
        clearingRef.current ||
        value.length === 0
      ) {
        return;
      }

      clearingRef.current = true;
      setClearing(true);

      runClearInputDissolve(
        { wrap, input, mirror, placeholderLayer, glow },
        () => {
          onChange("");
        },
        () => {
          clearingRef.current = false;
          setClearing(false);
        },
      );
    };

    const fieldClassName = merge(hasValue && "pr-9", className);

    return (
      <div
        ref={wrapRef}
        className={merge(
          "t-clear",
          hasValue && "has-value",
          clearing && "is-clearing",
          classes?.wrapper,
          wrapperClassName,
        )}
      >
        {leading}
        <input
          ref={mergedRef}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          className={merge(
            classes?.input ?? [inputClasses, fieldFocusClass],
            fieldClassName,
          )}
          {...props}
        />
        <div className="t-clear-clip" aria-hidden="true">
          <div
            ref={mirrorRef}
            className={merge(
              "t-clear-mirror border-0 bg-transparent text-foreground shadow-none",
              fieldClassName,
            )}
          />
          <div
            ref={placeholderRef}
            className={merge(
              "t-clear-placeholder border-0 bg-transparent text-field-placeholder shadow-none",
              fieldClassName,
            )}
          >
            {placeholder}
          </div>
          <div ref={glowRef} className="t-clear-glow" />
        </div>
        {value.length > 0 && !clearing ? (
          <button
            type="button"
            className={classes?.button ? `t-clear-btn ${classes.button}` : `t-clear-btn ${buttonClasses}`}
            aria-label={clearLabel}
            onPointerDown={preventFocusSteal}
            onMouseDown={preventFocusSteal}
            onClick={handleClear}
          >
            <IconX size={14} stroke={1.75} />
          </button>
        ) : null}
      </div>
    );
  },
);

export { ClearInput };

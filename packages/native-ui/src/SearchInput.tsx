import * as React from "react";
import { Pressable, View } from "react-native";
import { IconSearch, IconX } from "@tabler/icons-react-native";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import {
  fieldStyle,
  fieldTextStyle,
  searchInputSize,
  sizeStyle,
  touchSlop,
  typeStyle,
  type SearchInputSize,
} from "./controlStyles";
import { palette } from "./palette";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type SearchInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof PrimitiveInput>,
  "value" | "onChange" | "onChangeText"
> & {
  value: string;
  /** Called with the new text, as the web `onChange(value)`. */
  onChange: (value: string) => void;
  /** Accessibility label, and the placeholder when `placeholder` is not set. Default `"Search"`. */
  label?: string;
  /** `sm` is 32 high (web `h-8`), `md` is 40 (web `h-10`). Default `"sm"`. */
  size?: SearchInputSize;
  /** Called after `onChange` whenever the value becomes empty (typed away or cleared). */
  onClear?: () => void;
  /** Accessibility label of the clear button. Default `"Clear search"`. */
  clearLabel?: string;
  /** Classes for the field. */
  className?: string;
  /** Classes for the `View` around the field, icon and clear button. */
  wrapperClassName?: string;
};

/** The web change rule: `onChange`, then `onClear` whenever the value becomes empty. */
export function searchChange(onChange: (value: string) => void, onClear?: () => void) {
  return (next: string) => {
    onChange(next);
    if (onClear && next.length === 0) onClear();
  };
}

/**
 * Search field, the web `SearchInput`: a 16 search icon at the start and,
 * while there is text, a clear button (a 14 cross labelled "Clear search") at
 * the end. Controlled with `value` and `onChange(text)`, as on the web. The
 * field has the `Input` look (`fieldStyle`) at the web sizes from
 * `searchInputSize`. The clear button is painted at the web 24 and reaches 44
 * with its hit slop (`touchSlop`). It clears at once and leaves focus where it
 * was, as the default web clear does after its dissolve. It is hidden when the
 * field is not editable. Inside a `ScrollView`, set
 * `keyboardShouldPersistTaps="handled"` so the first tap clears while the
 * keyboard is up. The web `shortcut` hint and `toolbar` variant are not ported.
 */
const SearchInput = React.forwardRef<
  React.ElementRef<typeof PrimitiveInput>,
  SearchInputProps
>(
  (
    {
      value,
      onChange,
      label = "Search",
      placeholder,
      size = "sm",
      onClear,
      clearLabel = "Clear search",
      className,
      wrapperClassName,
      placeholderTextColor,
      style,
      ...props
    },
    ref,
  ) => {
    const largerText = useLargerText();
    const scheme = useScheme();
    const metrics = searchInputSize(size, largerText);
    const change = searchChange(onChange, onClear);
    const filled = value.length > 0;
    const muted = tokens.color.muted[scheme];
    return (
      <View className={wrapperClassName}>
        <PrimitiveInput
          ref={ref}
          value={value}
          onChangeText={change}
          accessibilityLabel={label}
          placeholder={placeholder ?? label}
          placeholderTextColor={placeholderTextColor ?? palette.fieldPlaceholder[scheme]}
          // The web `enterKeyHint="search"`.
          returnKeyType="search"
          className={cn(
            "border font-instrument-sans",
            metrics.text,
            largerText && "font-instrument-sans-medium",
            className,
          )}
          style={[
            fieldStyle(scheme),
            fieldTextStyle(scheme),
            {
              minHeight: metrics.minHeight,
              paddingTop: metrics.paddingY,
              paddingBottom: metrics.paddingY,
              paddingLeft: metrics.paddingLeft,
              paddingRight: filled ? metrics.filledPaddingRight : metrics.paddingRight,
              // The size without its line height: on a single-line field a
              // line height can push the text off centre on iOS.
              fontSize: sizeStyle(metrics.text).fontSize,
            },
            largerText ? typeStyle("medium") : null,
            style,
          ]}
          {...props}
        />
        <View
          pointerEvents="none"
          className="absolute bottom-0 top-0 justify-center"
          style={{ left: metrics.iconLeft }}
        >
          <IconSearch size={metrics.icon} color={muted} />
        </View>
        {filled && props.editable !== false ? (
          <View
            pointerEvents="box-none"
            className="absolute bottom-0 top-0 justify-center"
            style={{ right: metrics.clearRight }}
          >
            <Pressable
              testID="search-input-clear"
              accessibilityRole="button"
              accessibilityLabel={clearLabel}
              hitSlop={touchSlop(metrics.clear)}
              onPress={() => change("")}
              className="items-center justify-center rounded-md active:opacity-70"
              style={{ width: metrics.clear, height: metrics.clear }}
            >
              <IconX size={metrics.clearIcon} color={muted} stroke={1.75} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  },
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
export type { SearchInputProps };

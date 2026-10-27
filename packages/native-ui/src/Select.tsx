import * as React from "react";
import {
  NativeSelectScrollView,
  Select as PrimitiveSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./primitives/select";
import { cn } from "./cn";
import { fieldStyle, fieldTextStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

interface SelectOption<TValue = string | number | null> {
  label: string;
  value: TValue;
  color?: string;
}

interface SelectProps<TValue = string | number | null> {
  value?: TValue;
  onValueChange: (value: TValue) => void;
  options: Array<SelectOption<TValue>>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  testID?: string;
}

const NULL_SENTINEL = "__null__";

function toPrimitiveValue<TValue>(
  value: TValue | undefined,
  options: Array<SelectOption<TValue>>,
) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const expectedValue = value === null ? NULL_SENTINEL : String(value);
  const option = options.find(
    (item) => String(item.value ?? NULL_SENTINEL) === expectedValue,
  );

  if (!option) return undefined;

  return {
    label: option.label,
    value: String(option.value ?? NULL_SENTINEL),
  };
}

function Select<TValue = string | number | null>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  testID,
}: SelectProps<TValue>) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const primitiveValue = toPrimitiveValue(value, options);

  return (
    <PrimitiveSelect
      value={primitiveValue}
      onValueChange={(nextOption) => {
        if (!nextOption) {
          return;
        }

        const selectedValue =
          nextOption.value === NULL_SENTINEL ? null : nextOption.value;
        const match = options.find(
          (option) =>
            String(option.value ?? NULL_SENTINEL) === String(selectedValue),
        );

        if (match) {
          onValueChange(match.value);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        testID={testID}
        className={cn(
          // The web trigger: h-10 px-3.5, 16 px type (its phone size).
          "h-10 w-full border px-3.5 py-0 shadow-none",
          largerText && "h-16 px-4",
          triggerClassName,
          className,
        )}
        style={fieldStyle(scheme)}
      >
        <SelectValue
          placeholder={placeholder ?? "Select option"}
          className={
            largerText ? "font-instrument-sans-medium text-xl" : "font-instrument-sans text-base"
          }
          style={
            primitiveValue
              ? fieldTextStyle(scheme)
              : { color: palette.fieldPlaceholder[scheme] }
          }
        />
      </SelectTrigger>
      <SelectContent className={cn("w-full", contentClassName)}>
        <NativeSelectScrollView>
          <SelectGroup>
            {options.map((option) => {
              const optionId = testID
                ? `${testID}-${String(option.value ?? "null")}`
                : undefined;
              return (
                <SelectItem
                  key={`${String(option.value)}-${option.label}`}
                  testID={optionId}
                  accessibilityLabel={option.label}
                  label={option.label}
                  value={String(option.value ?? NULL_SENTINEL)}
                />
              );
            })}
          </SelectGroup>
        </NativeSelectScrollView>
      </SelectContent>
    </PrimitiveSelect>
  );
}

export { Select };
export type { SelectOption, SelectProps };

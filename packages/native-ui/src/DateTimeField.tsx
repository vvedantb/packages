import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { IconX } from "@tabler/icons-react-native";
import { MIN_TOUCH_TARGET, textStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

type PickerMode = "date" | "time";
type PickerButton = { mode: PickerMode; label: string };

export type DateTimeFieldProps = {
  /** `null` shows `placeholder` until a date is picked (from 0.5.0). */
  value: Date | null;
  onChange: (value: Date) => void;
  /** Date and time buttons (default), the time button only, or the date button only. */
  mode?: "datetime" | "time" | "date";
  maximumDate?: Date;
  /** Shown on each button while `value` is `null`. Default "Select date" or "Select time". */
  placeholder?: string;
  /** Shows a clear button while `value` is set. It calls this; `onChange` is not called. */
  onClear?: () => void;
  /** Names the clear button. Default "Clear time" in `time` mode, "Clear date" otherwise. */
  clearLabel?: string;
  testID?: string;
};

const DEFAULT_PLACEHOLDER: Record<PickerMode, string> = {
  date: "Select date",
  time: "Select time",
};

/**
 * The date the picker opens on: `value`, or with no value `now`, held back to
 * `maximumDate` when that is earlier.
 */
export function pickerSeed(value: Date | null, maximumDate?: Date, now: Date = new Date()): Date {
  if (value) return value;
  return maximumDate && maximumDate.getTime() < now.getTime() ? maximumDate : now;
}

/**
 * Date and time buttons that open the system picker below them. `mode="date"`
 * shows the date button only. A `null` value shows `placeholder` in the field
 * placeholder colour, and the picker opens on today (or `maximumDate`, if
 * earlier); picking calls `onChange`. With `onClear`, a 44 clear button
 * follows the buttons while there is a value. On iOS the spinner sets the
 * value when it is turned. The buttons have the web `bg-secondary` fill
 * (`palette.default`) as a style, so it follows the scheme.
 */
export function DateTimeField({
  value,
  onChange,
  mode = "datetime",
  maximumDate,
  placeholder,
  onClear,
  clearLabel,
  testID,
}: DateTimeFieldProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const [picker, setPicker] = useState<PickerMode | null>(null);

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === "android") setPicker(null);
    if (event.type === "set" && next) onChange(next);
  };

  const label = (button: PickerMode, format: string) =>
    value ? dayjs(value).format(format) : (placeholder ?? DEFAULT_PLACEHOLDER[button]);
  const dateButton: PickerButton = { mode: "date", label: label("date", "D MMM YYYY") };
  const timeButton: PickerButton = { mode: "time", label: label("time", "HH:mm") };
  const buttons: PickerButton[] =
    mode === "datetime" ? [dateButton, timeButton] : mode === "date" ? [dateButton] : [timeButton];
  const textColor = value
    ? textStyle("foreground", scheme)
    : { color: palette.fieldPlaceholder[scheme] };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        {buttons.map((button) => (
          <Pressable
            key={button.mode}
            testID={testID ? `${testID}-${button.mode}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={button.label}
            onPress={() =>
              setPicker((current) =>
                current === button.mode ? null : button.mode,
              )
            }
            className={`${largerText ? "min-h-16" : "min-h-14"} flex-1 justify-center rounded-lg px-4 py-2 active:opacity-70`}
            style={{ backgroundColor: palette.default[scheme] }}
          >
            <Text
              className={`${largerText ? "text-xl" : "text-lg"} font-instrument-sans-semibold`}
              style={[textColor, typeStyle("semibold")]}
            >
              {button.label}
            </Text>
          </Pressable>
        ))}
        {onClear && value ? (
          <Pressable
            testID={testID ? `${testID}-clear` : undefined}
            accessibilityRole="button"
            accessibilityLabel={clearLabel ?? (mode === "time" ? "Clear time" : "Clear date")}
            onPress={() => {
              setPicker(null);
              onClear();
            }}
            className="items-center justify-center rounded-full active:opacity-70"
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          >
            <IconX size={largerText ? 24 : 20} color={tokens.color.muted[scheme]} />
          </Pressable>
        ) : null}
      </View>
      {picker ? (
        <DateTimePicker
          value={pickerSeed(value, maximumDate)}
          mode={picker}
          is24Hour
          maximumDate={picker === "date" ? maximumDate : undefined}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

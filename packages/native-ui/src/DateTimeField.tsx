import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { textStyle, typeStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type PickerMode = "date" | "time";
type PickerButton = { mode: PickerMode; label: string };

export function DateTimeField({
  value,
  onChange,
  mode = "datetime",
  maximumDate,
  testID,
}: {
  value: Date;
  onChange: (value: Date) => void;
  mode?: "datetime" | "time";
  maximumDate?: Date;
  testID?: string;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const [picker, setPicker] = useState<PickerMode | null>(null);

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === "android") setPicker(null);
    if (event.type === "set" && next) onChange(next);
  };

  const timeButton: PickerButton = {
    mode: "time",
    label: dayjs(value).format("HH:mm"),
  };
  const buttons: PickerButton[] =
    mode === "datetime"
      ? [{ mode: "date", label: dayjs(value).format("D MMM YYYY") }, timeButton]
      : [timeButton];

  return (
    <View className="gap-2">
      <View className="flex-row gap-3">
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
            className={`${largerText ? "min-h-16" : "min-h-14"} flex-1 justify-center rounded-lg bg-secondary px-4 py-2 active:opacity-70`}
          >
            <Text
              className={`${largerText ? "text-xl" : "text-lg"} font-instrument-sans-semibold`}
              style={[textStyle("foreground", scheme), typeStyle("semibold")]}
            >
              {button.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {picker ? (
        <DateTimePicker
          value={value}
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
